import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';
import {
  BLOB_BUDGET_BYTES,
  BLOB_MAX_AGE_MS,
  CACHE_IMG_DIR,
  CACHE_INDEX_PATH,
  CACHE_JSON_DIR,
  CACHE_SCHEMA_VERSION,
  CACHE_TREE_ROOT,
  CACHE_VERSION_PREF_KEY,
  EVICTION_TARGET_RATIO,
  INDEX_FLUSH_IDLE_MS,
  INDEX_FLUSH_MAX_MS,
  JSON_BUDGET_BYTES,
  JSON_MAX_AGE_MS,
} from './cache-config';
import {
  CacheEntry,
  CacheIndex,
  CacheKind,
  CacheScope,
  emptyIndex,
} from './cache-entry';
import { selectEvictions, selectExpired } from './cache-eviction';
import { cacheFileName } from './cache-key';
import { base64ToBlob, blobToBase64 } from '../services/blob.utils';

export interface CachedJson {
  body: unknown;
  fetchedAt: number;
}

/** A value bindable to `src`, and whether the caller must eventually revoke it. */
export interface BlobSource {
  src: string;
  revocable: boolean;
}

const DIR = Directory.Cache;

/**
 * Disk tier shared by the HTTP response cache and the image cache.
 *
 * The governing rule is that **the index is only ever an optimisation**. Data
 * files are written first and the index second, on a debounce; reads never trust
 * the index for existence, so a crash between the two is harmless - the read
 * misses, the entry is dropped, and a startup sweep reclaims the bytes.
 *
 * Every public method resolves rather than rejecting. A broken cache must
 * degrade to "no cache", never break the app.
 */
@Injectable({ providedIn: 'root' })
export class CacheStorageService {
  /**
   * Resolves once the index has been loaded and swept. Every public method
   * awaits it, so initialisation stays off the bootstrap path and happens
   * lazily on the first request. Mirrors `SettingsService.ready`.
   */
  readonly ready: Promise<void>;

  private index: CacheIndex = emptyIndex(CACHE_SCHEMA_VERSION);

  /** Serialises index mutations so concurrent writes cannot interleave a
   * read-modify-write. */
  private queue: Promise<void> = Promise.resolve();

  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private flushDeadline: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;

  constructor() {
    this.ready = this.init();
    this.registerFlushOnPause();
  }

  // ---------------------------------------------------------------- JSON tier

  async readJson(key: string): Promise<CachedJson | null> {
    await this.ready;
    const entry = this.index.entries[key];
    if (!entry || entry.kind !== 'json') {
      return null;
    }

    try {
      const result = await Filesystem.readFile({
        path: `${CACHE_JSON_DIR}/${entry.file}`,
        directory: DIR,
        encoding: Encoding.UTF8,
      });
      const stored = JSON.parse(result.data as string) as {
        key: string;
        body: unknown;
      };
      // A hash collision would hand back somebody else's payload; verifying the
      // full key turns that into a plain miss.
      if (stored.key !== key) {
        return null;
      }
      this.touch(key);
      return { body: stored.body, fetchedAt: entry.fetchedAt };
    } catch {
      // The file is gone (OS reclaim, torn write, manual clear). Drop the stale
      // index entry and report a miss.
      this.forget(key);
      return null;
    }
  }

  async writeJson(
    key: string,
    body: unknown,
    scope: CacheScope,
  ): Promise<void> {
    await this.ready;
    const file = cacheFileName('json', key);
    let payload: string;
    try {
      payload = JSON.stringify({ key, body });
    } catch {
      // Circular or otherwise unserialisable - nothing to cache.
      return;
    }

    const written = await this.writeAtomic(
      `${CACHE_JSON_DIR}/${file}`,
      payload,
      Encoding.UTF8,
    );
    if (!written) {
      return;
    }

    this.remember({
      key,
      kind: 'json',
      file,
      scope,
      size: payload.length,
      fetchedAt: Date.now(),
      lastAccessAt: Date.now(),
    });
    void this.enforceBudget('json', JSON_BUDGET_BYTES);
  }

  // ---------------------------------------------------------------- Blob tier

  /**
   * Native returns a `_capacitor_file_` URL the WebView streams straight off
   * disk - no base64 round trip, no object URL, and the OS page cache does the
   * memory management. Web has no such scheme, so it mints an object URL and
   * tells the caller to manage it.
   */
  async readBlobSource(key: string): Promise<BlobSource | null> {
    await this.ready;
    const entry = this.index.entries[key];
    if (!entry || entry.kind !== 'img') {
      return null;
    }
    const path = `${CACHE_IMG_DIR}/${entry.file}`;

    try {
      if (Capacitor.isNativePlatform()) {
        const { uri } = await Filesystem.getUri({ path, directory: DIR });
        // getUri does not touch the disk, so confirm the file is really there
        // before handing back a URL that would render as a broken image.
        await Filesystem.stat({ path, directory: DIR });
        this.touch(key);
        return { src: Capacitor.convertFileSrc(uri), revocable: false };
      }

      const blob = await this.readBlob(key);
      if (!blob) {
        return null;
      }
      return { src: URL.createObjectURL(blob), revocable: true };
    } catch {
      this.forget(key);
      return null;
    }
  }

  /** The raw bytes, for callers that need a blob rather than a `src` - the
   * selfie capture canvas, which must not be tainted. */
  async readBlob(key: string): Promise<Blob | null> {
    await this.ready;
    const entry = this.index.entries[key];
    if (!entry || entry.kind !== 'img') {
      return null;
    }

    try {
      const result = await Filesystem.readFile({
        path: `${CACHE_IMG_DIR}/${entry.file}`,
        directory: DIR,
      });
      this.touch(key);
      const type = entry.contentType ?? 'application/octet-stream';
      // The web shim returns a Blob; native returns bare base64.
      return typeof result.data === 'string'
        ? base64ToBlob(result.data, type)
        : new Blob([result.data], { type });
    } catch {
      this.forget(key);
      return null;
    }
  }

  async writeBlob(key: string, blob: Blob): Promise<void> {
    await this.ready;
    const file = cacheFileName('img', key);

    let data: string | Blob;
    try {
      data = Capacitor.isNativePlatform() ? await blobToBase64(blob) : blob;
    } catch {
      return;
    }

    const written = await this.writeAtomic(`${CACHE_IMG_DIR}/${file}`, data);
    if (!written) {
      return;
    }

    this.remember({
      key,
      kind: 'img',
      file,
      // Images are shared CMS assets and outlive any single runner's session.
      scope: 'shared',
      size: blob.size,
      fetchedAt: Date.now(),
      lastAccessAt: Date.now(),
      contentType: blob.type || 'application/octet-stream',
    });
    void this.enforceBudget('img', BLOB_BUDGET_BYTES);
  }

  // -------------------------------------------------------------- Maintenance

  /** Drops every entry the predicate matches. Used on logout to clear
   * runner-scoped responses while leaving shared content in place. */
  async removeWhere(predicate: (entry: CacheEntry) => boolean): Promise<void> {
    await this.ready;
    const doomed = Object.values(this.index.entries).filter(predicate);
    await this.deleteEntries(doomed.map((entry) => entry.key));
  }

  async clearAll(): Promise<void> {
    await this.ready;
    this.index = emptyIndex(CACHE_SCHEMA_VERSION);
    this.dirty = true;
    try {
      await Filesystem.rmdir({
        path: CACHE_TREE_ROOT,
        directory: DIR,
        recursive: true,
      });
    } catch {
      // Already gone, which is the state we wanted.
    }
    await this.ensureDirs();
    await this.flushIndex();
  }

  // ------------------------------------------------------------ Internals

  private async init(): Promise<void> {
    try {
      await this.enforceSchemaVersion();
      await this.ensureDirs();
      this.index = await this.loadIndex();
      await this.sweepExpired();
      await this.sweepOrphans();
    } catch (error) {
      console.error('Cache init failed; continuing without a cache:', error);
      this.index = emptyIndex(CACHE_SCHEMA_VERSION);
    }
  }

  /** A schema bump drops the whole tree before the index is even parsed. */
  private async enforceSchemaVersion(): Promise<void> {
    const stored = await Preferences.get({ key: CACHE_VERSION_PREF_KEY });
    if (stored.value === CACHE_SCHEMA_VERSION) {
      return;
    }
    try {
      await Filesystem.rmdir({
        path: CACHE_TREE_ROOT,
        directory: DIR,
        recursive: true,
      });
    } catch {
      // Nothing cached yet on a first launch.
    }
    await Preferences.set({
      key: CACHE_VERSION_PREF_KEY,
      value: CACHE_SCHEMA_VERSION,
    });
  }

  private async ensureDirs(): Promise<void> {
    for (const path of [CACHE_JSON_DIR, CACHE_IMG_DIR]) {
      try {
        await Filesystem.mkdir({ path, directory: DIR, recursive: true });
      } catch {
        // Already exists.
      }
    }
  }

  private async loadIndex(): Promise<CacheIndex> {
    try {
      const result = await Filesystem.readFile({
        path: CACHE_INDEX_PATH,
        directory: DIR,
        encoding: Encoding.UTF8,
      });
      const parsed = JSON.parse(result.data as string) as CacheIndex;
      if (parsed.version === CACHE_SCHEMA_VERSION && parsed.entries) {
        return parsed;
      }
    } catch {
      // Missing or corrupt - fall through to a rebuild.
    }
    return this.rebuildIndex();
  }

  /**
   * Reconstructs what it can by listing the directories. Keys are unrecoverable
   * from filenames alone, so every rebuilt entry is unreadable by key and will
   * be swept as an orphan - the point is to reclaim the bytes, not the content.
   */
  private async rebuildIndex(): Promise<CacheIndex> {
    const rebuilt = emptyIndex(CACHE_SCHEMA_VERSION);
    for (const [kind, dir] of [
      ['json', CACHE_JSON_DIR],
      ['img', CACHE_IMG_DIR],
    ] as const) {
      try {
        const { files } = await Filesystem.readdir({
          path: dir,
          directory: DIR,
        });
        for (const file of files) {
          if (file.type !== 'file') {
            continue;
          }
          // Synthetic key: guaranteed not to match any real lookup, so the
          // orphan sweep collects it.
          const key = `orphan:${kind}:${file.name}`;
          rebuilt.entries[key] = {
            key,
            kind,
            file: file.name,
            scope: 'shared',
            size: file.size,
            fetchedAt: file.mtime,
            lastAccessAt: file.mtime,
          };
        }
      } catch {
        // Directory unreadable; nothing to rebuild from.
      }
    }
    this.dirty = true;
    return rebuilt;
  }

  private async sweepExpired(): Promise<void> {
    const now = Date.now();
    const expired = [
      ...selectExpired(this.entriesOfKind('json'), JSON_MAX_AGE_MS, now),
      ...selectExpired(this.entriesOfKind('img'), BLOB_MAX_AGE_MS, now),
    ];
    await this.deleteEntries(expired);
  }

  /** Reclaims bytes from writes whose index update never made it to disk. */
  private async sweepOrphans(): Promise<void> {
    const known = new Set(
      Object.values(this.index.entries).map((e) => `${e.kind}/${e.file}`),
    );
    for (const [kind, dir] of [
      ['json', CACHE_JSON_DIR],
      ['img', CACHE_IMG_DIR],
    ] as const) {
      try {
        const { files } = await Filesystem.readdir({
          path: dir,
          directory: DIR,
        });
        for (const file of files) {
          if (file.type !== 'file' || known.has(`${kind}/${file.name}`)) {
            continue;
          }
          try {
            await Filesystem.deleteFile({
              path: `${dir}/${file.name}`,
              directory: DIR,
            });
          } catch {
            // Best effort.
          }
        }
      } catch {
        // Directory unreadable; nothing to sweep.
      }
    }
    // Rebuilt entries have served their purpose once their files are gone.
    for (const key of Object.keys(this.index.entries)) {
      if (key.startsWith('orphan:')) {
        delete this.index.entries[key];
        this.dirty = true;
      }
    }
    this.scheduleFlush();
  }

  private async enforceBudget(kind: CacheKind, budget: number): Promise<void> {
    const doomed = selectEvictions(
      this.entriesOfKind(kind),
      budget,
      budget * EVICTION_TARGET_RATIO,
    );
    if (doomed.length) {
      await this.deleteEntries(doomed);
    }
  }

  private entriesOfKind(kind: CacheKind): CacheEntry[] {
    return Object.values(this.index.entries).filter(
      (entry) => entry.kind === kind,
    );
  }

  private deleteEntries(keys: string[]): Promise<void> {
    if (!keys.length) {
      return Promise.resolve();
    }
    return this.enqueue(async () => {
      for (const key of keys) {
        const entry = this.index.entries[key];
        if (!entry) {
          continue;
        }
        const dir = entry.kind === 'json' ? CACHE_JSON_DIR : CACHE_IMG_DIR;
        try {
          await Filesystem.deleteFile({
            path: `${dir}/${entry.file}`,
            directory: DIR,
          });
        } catch {
          // Already gone; the index entry still needs dropping.
        }
        delete this.index.entries[key];
        this.dirty = true;
      }
      this.scheduleFlush();
    });
  }

  /**
   * Writes to a temporary name and renames into place, so a crash mid-write
   * leaves either the old file or the new one, never a truncated mix.
   */
  private async writeAtomic(
    path: string,
    data: string | Blob,
    encoding?: Encoding,
  ): Promise<boolean> {
    const tmp = `${path}.tmp`;
    try {
      await Filesystem.writeFile({
        path: tmp,
        directory: DIR,
        data,
        encoding,
        recursive: true,
      });
      await Filesystem.rename({ from: tmp, to: path, directory: DIR });
      return true;
    } catch (error) {
      console.warn('Cache write failed:', error);
      try {
        await Filesystem.deleteFile({ path: tmp, directory: DIR });
      } catch {
        // Nothing to clean up.
      }
      return false;
    }
  }

  private remember(entry: CacheEntry): void {
    this.index.entries[entry.key] = entry;
    this.dirty = true;
    this.scheduleFlush();
  }

  private forget(key: string): void {
    if (this.index.entries[key]) {
      delete this.index.entries[key];
      this.dirty = true;
      this.scheduleFlush();
    }
  }

  /** In-memory only, so reads stay free; the value rides the debounced flush. */
  private touch(key: string): void {
    const entry = this.index.entries[key];
    if (entry) {
      entry.lastAccessAt = Date.now();
      this.dirty = true;
      this.scheduleFlush();
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }
    this.flushTimer = setTimeout(
      () => void this.flushIndex(),
      INDEX_FLUSH_IDLE_MS,
    );
    // A steady trickle of writes would otherwise push the idle timer forever.
    if (!this.flushDeadline) {
      this.flushDeadline = setTimeout(
        () => void this.flushIndex(),
        INDEX_FLUSH_MAX_MS,
      );
    }
  }

  private flushIndex(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.flushDeadline) {
      clearTimeout(this.flushDeadline);
      this.flushDeadline = null;
    }
    if (!this.dirty) {
      return Promise.resolve();
    }
    return this.enqueue(async () => {
      this.dirty = false;
      const snapshot = JSON.stringify(this.index);
      const ok = await this.writeAtomic(
        CACHE_INDEX_PATH,
        snapshot,
        Encoding.UTF8,
      );
      if (!ok) {
        // Try again on the next write rather than losing the updates.
        this.dirty = true;
      }
    });
  }

  /** Last chance to persist the index before the process may be killed. */
  private registerFlushOnPause(): void {
    if (Capacitor.isNativePlatform()) {
      void App.addListener('pause', () => void this.flushIndex());
      return;
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          void this.flushIndex();
        }
      });
    }
  }

  private enqueue(work: () => Promise<void>): Promise<void> {
    this.queue = this.queue.then(work).catch((error) => {
      console.warn('Cache maintenance failed:', error);
    });
    return this.queue;
  }
}
