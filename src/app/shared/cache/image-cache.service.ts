import { HttpBackend, HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { AUTH_CREDENTIALS } from '../../secrets';
import { CacheStorageService } from './cache-storage.service';
import { imageCacheKey } from './cache-key';
import { OBJECT_URL_LRU_LIMIT } from './cache-config';

const HTTP_URL = /^https?:/i;

/**
 * Memory -> disk -> network cache for remote images.
 *
 * The CMS sends no `Cache-Control` on `/data/download/...`, so the WebView
 * re-fetches this artwork more or less every cold start - about 1 MB for the
 * home page alone. This keeps the bytes on disk and hands the DOM a local URL.
 */
@Injectable({ providedIn: 'root' })
export class ImageCacheService {
  // Deliberately on HttpBackend rather than HttpClient, for the same reason
  // SelfieOverlayLoader is: AuthInterceptor would attach an Authorization
  // header, which turns these into non-simple cross-origin requests and demands
  // a CORS preflight the image endpoint has no reason to answer. The CMS URLs
  // carry their own `?token=`. It also keeps these out of the JSON cache.
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly storage = inject(CacheStorageService);
  private readonly authService = inject(AuthService);

  /** Memory tier: resolved `src` values by cache key. */
  private readonly resolved = new Map<string, string>();
  /** In-flight resolutions, so N <img> of one asset issue a single fetch. */
  private readonly pending = new Map<string, Promise<string>>();
  /**
   * Object URLs in insertion order, mapped back to their key. Bounded rather
   * than reference-counted: `*cdkVirtualFor` recycles views while a recycled
   * <img> may still be decoding, so revoking on teardown would blank it. See
   * CachedSrcDirective, which deliberately revokes nothing.
   */
  private readonly objectUrls = new Map<string, string>();

  /**
   * Synchronous memory-tier lookup. Lets a directive paint a known image in the
   * same tick instead of flashing a placeholder first - which is most of what
   * "instant on re-entry" actually feels like.
   */
  peek(url: string | null | undefined): string | null {
    if (!url) {
      return null;
    }
    if (!HTTP_URL.test(url)) {
      // Bundled `assets/` art is already local; nothing to cache.
      return url;
    }
    return this.resolved.get(imageCacheKey(url)) ?? null;
  }

  /** Resolves to a value bindable to `src`. */
  resolve(url: string): Promise<string> {
    if (!HTTP_URL.test(url)) {
      return Promise.resolve(url);
    }

    const key = imageCacheKey(url);
    const ready = this.resolved.get(key);
    if (ready) {
      return Promise.resolve(ready);
    }
    const inFlight = this.pending.get(key);
    if (inFlight) {
      return inFlight;
    }

    const request = this.load(key, url).finally(() => this.pending.delete(key));
    this.pending.set(key, request);
    return request;
  }

  /**
   * The raw bytes. Used by the selfie capture path, which needs a `blob:` URL
   * it can guarantee will not taint the canvas.
   */
  async loadBlob(url: string): Promise<Blob> {
    const key = imageCacheKey(url);
    const cached = await this.storage.readBlob(key);
    if (cached) {
      return cached;
    }
    const blob = await this.fetch(url);
    await this.storage.writeBlob(key, blob);
    return blob;
  }

  private async load(key: string, url: string): Promise<string> {
    const fromDisk = await this.storage.readBlobSource(key);
    if (fromDisk) {
      this.remember(key, fromDisk.src, fromDisk.revocable);
      return fromDisk.src;
    }

    const blob = await this.fetch(url);
    // Write and display are independent: the page should not wait on the disk,
    // and a failed write only costs a re-download next launch.
    void this.storage.writeBlob(key, blob);

    const objectUrl = URL.createObjectURL(blob);
    this.remember(key, objectUrl, true);
    return objectUrl;
  }

  private fetch(url: string): Promise<Blob> {
    return firstValueFrom(
      this.http.get(this.withLiveToken(url), { responseType: 'blob' }),
    );
  }

  /**
   * The token baked into the URL by each service's `map()` may be stale - it
   * rotates on any 401, and during the cold-start window `getToken()` returns
   * '' because AuthService reads it from Preferences asynchronously. The cache
   * key ignores `token`, so replacing it here is free and fixes both.
   */
  private withLiveToken(url: string): string {
    try {
      const parsed = new URL(url, AUTH_CREDENTIALS.app_url);
      if (parsed.searchParams.has('token')) {
        parsed.searchParams.set('token', this.authService.getToken());
      }
      return parsed.toString();
    } catch {
      return url;
    }
  }

  private remember(key: string, src: string, revocable: boolean): void {
    this.resolved.set(key, src);
    if (!revocable) {
      // A native `convertFileSrc` URL stays valid for the life of the file, so
      // there is nothing to track or revoke.
      return;
    }

    this.objectUrls.set(src, key);
    while (this.objectUrls.size > OBJECT_URL_LRU_LIMIT) {
      const oldest: string = this.objectUrls.keys().next().value!;
      const oldestKey = this.objectUrls.get(oldest);
      this.objectUrls.delete(oldest);
      // Only drop the memory entry if it still points at the URL being revoked;
      // a re-resolve may already have replaced it.
      if (oldestKey && this.resolved.get(oldestKey) === oldest) {
        this.resolved.delete(oldestKey);
      }
      URL.revokeObjectURL(oldest);
    }
  }
}
