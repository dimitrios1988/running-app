import { AUTH_CREDENTIALS } from '../../secrets';
import { cacheFileName, httpCacheKey, imageCacheKey } from './cache-key';

const base = AUTH_CREDENTIALS.app_url;
const download = (params: string) => `${base}data/download/hero.jpg?${params}`;

describe('imageCacheKey', () => {
  it('ignores the rotating token', () => {
    const a = imageCacheKey(
      download('attribute_id=cc6d&file_id=abc&version=0&token=first'),
    );
    const b = imageCacheKey(
      download('attribute_id=cc6d&file_id=abc&version=0&token=second'),
    );
    expect(a).toBe(b);
  });

  it('still keys on a missing token, so a cold-start URL matches a later one', () => {
    const empty = imageCacheKey(
      download('attribute_id=cc6d&file_id=abc&version=0&token='),
    );
    const present = imageCacheKey(
      download('attribute_id=cc6d&file_id=abc&version=0&token=live'),
    );
    expect(empty).toBe(present);
  });

  it('separates different files, attributes and versions', () => {
    const first = imageCacheKey(
      download('attribute_id=cc6d&file_id=abc&version=0'),
    );
    expect(first).not.toBe(
      imageCacheKey(download('attribute_id=cc6d&file_id=xyz&version=0')),
    );
    expect(first).not.toBe(
      imageCacheKey(download('attribute_id=45d6&file_id=abc&version=0')),
    );
    expect(first).not.toBe(
      imageCacheKey(download('attribute_id=cc6d&file_id=abc&version=1')),
    );
  });

  it('handles a non-CMS url, such as a raw overlay thumbnail', () => {
    const key = imageCacheKey('https://cdn.example.com/a/thumb.png?w=64');
    expect(key).toContain('cdn.example.com');
    expect(key).toContain('w=64');
  });

  it('resolves a relative url against the CMS', () => {
    expect(imageCacheKey('/data/download/x.png?file_id=1')).toBe(
      imageCacheKey(`${base}data/download/x.png?file_id=1`),
    );
  });

  it('does not throw on an unparseable url', () => {
    expect(() => imageCacheKey('::::')).not.toThrow();
  });
});

describe('httpCacheKey', () => {
  const api = `${base}api/mobile_app_manager/page_elements/v1`;

  it('keys on the language param', () => {
    expect(httpCacheKey('GET', `${api}?language=en`)).not.toBe(
      httpCacheKey('GET', `${api}?language=el`),
    );
  });

  it('is stable across param ordering', () => {
    const notifications = `${base}api/mobile_app_manager/notifications/v1`;
    expect(httpCacheKey('GET', `${notifications}?language=en&event=3`)).toBe(
      httpCacheKey('GET', `${notifications}?event=3&language=en`),
    );
  });

  it('separates different paths', () => {
    expect(httpCacheKey('GET', `${api}?language=en`)).not.toBe(
      httpCacheKey(
        'GET',
        `${base}api/mobile_app_manager/news_items/v1?language=en`,
      ),
    );
  });

  it('separates methods', () => {
    expect(httpCacheKey('GET', api)).not.toBe(httpCacheKey('POST', api));
  });
});

describe('cacheFileName', () => {
  it('is deterministic and distinguishes kinds', () => {
    const key = 'GET|https://x/y|language=en';
    expect(cacheFileName('json', key)).toBe(cacheFileName('json', key));
    expect(cacheFileName('json', key)).not.toBe(cacheFileName('img', key));
  });

  it('produces a filesystem-safe name', () => {
    const name = cacheFileName('img', 'img|/data/download/a b.png|x|y|0');
    expect(name).toMatch(/^i-[0-9a-f]{8}-\d+$/);
  });
});
