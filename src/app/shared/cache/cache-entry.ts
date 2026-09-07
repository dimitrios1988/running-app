export type CacheKind = 'json' | 'img';

/**
 * Invalidation grouping, not key material. `uuid` and `event` are already query
 * params and therefore already in the key; the scope exists so logout can drop
 * everything belonging to a runner in one pass while shared CMS content and
 * images survive.
 */
export type CacheScope = 'shared' | 'user';

export interface CacheEntry {
  /** The full key, re-checked on read so a hash collision degrades to a miss. */
  key: string;
  kind: CacheKind;
  /** Filename within the kind's directory. */
  file: string;
  scope: CacheScope;
  size: number;
  fetchedAt: number;
  lastAccessAt: number;
  contentType?: string;
}

export interface CacheIndex {
  version: string;
  entries: Record<string, CacheEntry>;
}

export function emptyIndex(version: string): CacheIndex {
  return { version, entries: {} };
}
