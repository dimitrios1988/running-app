import { HttpContext, HttpContextToken } from '@angular/common/http';
import { CacheScope } from './cache-entry';

export interface HttpCacheOptions {
  /** Invalidation grouping. `user` entries are dropped on logout. */
  scope?: CacheScope;
  /** Skip the cached copy, go to the network, and let errors propagate. Used by
   * pull-to-refresh, where a silent failure would be wrong. */
  refresh?: boolean;
  /** Within this window the cached copy is served without any network call. */
  minRevalidateMs?: number;
  /** Past this age the cached copy is not served at all. */
  maxAgeMs?: number;
}

/**
 * Opt-in, not opt-out: `login_runner/v1` and `POST /api/auth` must never be
 * cached, and defaulting to "cache everything" would make forgetting one of
 * them a silent correctness bug. Six call sites is the cheaper price.
 */
export const HTTP_CACHE = new HttpContextToken<HttpCacheOptions | null>(
  () => null,
);

export function withHttpCache(options: HttpCacheOptions = {}): HttpContext {
  return new HttpContext().set(HTTP_CACHE, options);
}
