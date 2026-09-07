import { AUTH_CREDENTIALS } from '../../secrets';

/**
 * Query params that identify the caller rather than the bytes. `token` is an
 * app-level service-account JWT that rotates on any 401, so leaving it in a key
 * would miss on every rotation and re-download everything.
 */
const VOLATILE_PARAMS = new Set(['token']);

/** CMS file downloads, whose identity is file_id/attribute_id/version. */
const CMS_DOWNLOAD_PREFIX = '/data/download/';

/**
 * Cache key for a GET response. Built from `HttpRequest.urlWithParams`, so the
 * params are already serialised into the URL.
 */
export function httpCacheKey(method: string, urlWithParams: string): string {
  const url = toUrl(urlWithParams);
  if (!url) {
    return `${method.toUpperCase()}|${urlWithParams}`;
  }
  return `${method.toUpperCase()}|${url.origin}${url.pathname}|${stableSearch(url)}`;
}

/**
 * Cache key for a remote image.
 *
 * CMS downloads collapse to their stable identity so the rotating `token` and
 * any incidental param ordering cannot fork the key. Everything else - notably
 * the raw `thumbnail_url` the CMS returns for selfie overlays, which may point
 * anywhere - falls back to origin + path + sorted params.
 */
export function imageCacheKey(rawUrl: string): string {
  const url = toUrl(rawUrl);
  if (!url) {
    return `img|${rawUrl}`;
  }

  if (url.pathname.startsWith(CMS_DOWNLOAD_PREFIX)) {
    const fileId = url.searchParams.get('file_id');
    if (fileId) {
      const attributeId = url.searchParams.get('attribute_id') ?? '';
      const version = url.searchParams.get('version') ?? '0';
      return `img|${url.pathname}|${attributeId}|${fileId}|${version}`;
    }
  }

  return `img|${url.origin}${url.pathname}|${stableSearch(url)}`;
}

/**
 * FNV-1a, 32-bit. Synchronous on purpose - `crypto.subtle.digest` is async and
 * would push a promise into every filename lookup for no benefit here, since a
 * collision only ever costs a cache miss (the full key is stored in the entry
 * and verified on read).
 */
export function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** Filename for a key. The length suffix makes accidental collisions rarer at
 * no cost, and keeps names short enough for every filesystem we target. */
export function cacheFileName(kind: 'json' | 'img', key: string): string {
  const prefix = kind === 'json' ? 'j' : 'i';
  return `${prefix}-${fnv1a32(key)}-${key.length}`;
}

/** Params sorted and stripped, so ordering cannot fork an otherwise equal key. */
function stableSearch(url: URL): string {
  const parts: string[] = [];
  url.searchParams.forEach((value, key) => {
    if (!VOLATILE_PARAMS.has(key)) {
      parts.push(`${key}=${value}`);
    }
  });
  return parts.sort().join('&');
}

/** Relative URLs are resolved against the CMS, which is where they come from. */
function toUrl(raw: string): URL | null {
  try {
    return new URL(raw, AUTH_CREDENTIALS.app_url);
  } catch {
    return null;
  }
}
