/**
 * Bump when the shape of a cached payload stops being readable by the code that
 * consumes it - a changed `map()` in a service, a renamed response field, a new
 * entry format. On a mismatch the whole tree is deleted at startup, costing one
 * cold start rather than replaying a body the new mapper misreads.
 *
 * This is deliberately not derived from the package version: a version bump is
 * usually unrelated to the cache format, and importing package.json would pull
 * the dependency list into the app bundle.
 */
export const CACHE_SCHEMA_VERSION = 'v1';

export const CACHE_ROOT = `weallrun-cache/${CACHE_SCHEMA_VERSION}`;
export const CACHE_JSON_DIR = `${CACHE_ROOT}/json`;
export const CACHE_IMG_DIR = `${CACHE_ROOT}/img`;
export const CACHE_INDEX_PATH = `${CACHE_ROOT}/index.json`;
/** Everything the cache owns, so a schema bump can drop it in one call. */
export const CACHE_TREE_ROOT = 'weallrun-cache';

/** The single Preferences key the cache uses; see CACHE_SCHEMA_VERSION. */
export const CACHE_VERSION_PREF_KEY = 'cacheSchemaVersion';

/**
 * Measured against the live CMS: the whole home payload is ~8 KB of JSON and
 * ~1 MB of images. 4 MB of JSON is far more than the six cached endpoints can
 * produce across both languages; 40 MB of images leaves room for the news list
 * to grow without ever being the reason the OS reclaims the cache directory.
 */
export const JSON_BUDGET_BYTES = 4 * 1024 * 1024;
export const BLOB_BUDGET_BYTES = 40 * 1024 * 1024;
/** Evict down to this fraction of the budget, so writes near the cap do not
 * trigger a sweep every single time. */
export const EVICTION_TARGET_RATIO = 0.8;

/** Absolute age caps, applied at startup. An install left unused for months
 * should not paint year-old content before it revalidates. */
export const JSON_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
export const BLOB_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Within this window a cache hit is served without touching the network at all.
 * `ionViewWillEnter`, the language `effect()` and a tab switch otherwise produce
 * a burst of identical requests; 30s collapses them to zero.
 */
export const DEFAULT_MIN_REVALIDATE_MS = 30_000;

/** Index flush debounce: 1s after the last write, or 10s since the first
 * pending one, whichever comes first. Never per-write - that is the write
 * amplification that would make image caching cost more than it saves. */
export const INDEX_FLUSH_IDLE_MS = 1_000;
export const INDEX_FLUSH_MAX_MS = 10_000;

/**
 * Web only. Object URLs are never revoked on directive teardown (see
 * CachedSrcDirective), so this bound is what stops them accumulating. Native
 * uses `Capacitor.convertFileSrc` and mints no object URLs at all.
 */
export const OBJECT_URL_LRU_LIMIT = 120;
