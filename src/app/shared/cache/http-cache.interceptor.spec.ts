import { TestBed } from '@angular/core/testing';
import {
  HTTP_INTERCEPTORS,
  HttpClient,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { HttpCacheInterceptor } from './http-cache.interceptor';
import { CacheStorageService, CachedJson } from './cache-storage.service';
import { withHttpCache } from './http-cache.context';
import { httpCacheKey } from './cache-key';

const URL_A = '/api/mobile_app_manager/page_elements/v1';

/** Stands in for the disk tier: same contract, a Map instead of a filesystem. */
class FakeCacheStorage {
  readonly entries = new Map<string, CachedJson>();

  readJson(key: string): Promise<CachedJson | null> {
    return Promise.resolve(this.entries.get(key) ?? null);
  }

  writeJson(key: string, body: unknown): Promise<void> {
    this.entries.set(key, { body, fetchedAt: Date.now() });
    return Promise.resolve();
  }

  seed(url: string, body: unknown, ageMs: number): void {
    this.entries.set(httpCacheKey('GET', url), {
      body,
      fetchedAt: Date.now() - ageMs,
    });
  }
}

/** The cache reads from disk before deciding, so every path starts async. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('HttpCacheInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let storage: FakeCacheStorage;

  beforeEach(() => {
    storage = new FakeCacheStorage();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: CacheStorageService, useValue: storage },
        {
          provide: HTTP_INTERCEPTORS,
          useClass: HttpCacheInterceptor,
          multi: true,
        },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('passes through a request that did not opt in', async () => {
    const seen: unknown[] = [];
    http.get(URL_A).subscribe((v) => seen.push(v));

    httpMock.expectOne(URL_A).flush({ a: 1 });
    await settle();

    expect(seen).toEqual([{ a: 1 }]);
    expect(storage.entries.size).toBe(0);
  });

  it('goes to the network on a miss and stores the result', async () => {
    const seen: unknown[] = [];
    http.get(URL_A, { context: withHttpCache() }).subscribe((v) => seen.push(v));
    await settle();

    httpMock.expectOne(URL_A).flush({ a: 1 });
    await settle();

    expect(seen).toEqual([{ a: 1 }]);
    expect(storage.entries.size).toBe(1);
  });

  it('serves a fresh entry without touching the network', async () => {
    storage.seed(URL_A, { a: 1 }, 1_000);

    const seen: unknown[] = [];
    http.get(URL_A, { context: withHttpCache() }).subscribe((v) => seen.push(v));
    await settle();

    httpMock.expectNone(URL_A);
    expect(seen).toEqual([{ a: 1 }]);
  });

  it('emits the stale copy first, then the changed one', async () => {
    storage.seed(URL_A, { a: 1 }, 60_000);

    const seen: unknown[] = [];
    http.get(URL_A, { context: withHttpCache() }).subscribe((v) => seen.push(v));
    await settle();

    expect(seen).toEqual([{ a: 1 }]);

    httpMock.expectOne(URL_A).flush({ a: 2 });
    await settle();

    expect(seen).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it('suppresses the second emission when the payload is unchanged', async () => {
    storage.seed(URL_A, { a: 1 }, 60_000);

    const seen: unknown[] = [];
    http.get(URL_A, { context: withHttpCache() }).subscribe((v) => seen.push(v));
    await settle();

    httpMock.expectOne(URL_A).flush({ a: 1 });
    await settle();

    expect(seen).toEqual([{ a: 1 }]);
  });

  it('swallows a failed revalidation so the page keeps its content', async () => {
    storage.seed(URL_A, { a: 1 }, 60_000);

    const seen: unknown[] = [];
    let errored = false;
    http.get(URL_A, { context: withHttpCache() }).subscribe({
      next: (v) => seen.push(v),
      error: () => (errored = true),
    });
    await settle();

    // status 0 is what an offline request produces.
    httpMock
      .expectOne(URL_A)
      .error(new ProgressEvent('error'), { status: 0, statusText: '' });
    await settle();

    expect(seen).toEqual([{ a: 1 }]);
    expect(errored).toBeFalse();
  });

  it('lets an error through on a miss, where there is nothing to fall back on', async () => {
    let errored = false;
    http.get(URL_A, { context: withHttpCache() }).subscribe({
      error: () => (errored = true),
    });
    await settle();

    httpMock
      .expectOne(URL_A)
      .error(new ProgressEvent('error'), { status: 0, statusText: '' });
    await settle();

    expect(errored).toBeTrue();
  });

  it('bypasses a fresh entry when refresh is set, and propagates its failure', async () => {
    storage.seed(URL_A, { a: 1 }, 1_000);

    const seen: unknown[] = [];
    let errored = false;
    http
      .get(URL_A, { context: withHttpCache({ refresh: true }) })
      .subscribe({ next: (v) => seen.push(v), error: () => (errored = true) });
    await settle();

    httpMock
      .expectOne(URL_A)
      .error(new ProgressEvent('error'), { status: 0, statusText: '' });
    await settle();

    expect(seen).toEqual([]);
    expect(errored).toBeTrue();
  });

  it('coalesces concurrent requests for the same key into one call', async () => {
    const first: unknown[] = [];
    const second: unknown[] = [];
    http
      .get(URL_A, { context: withHttpCache() })
      .subscribe((v) => first.push(v));
    http
      .get(URL_A, { context: withHttpCache() })
      .subscribe((v) => second.push(v));
    await settle();

    httpMock.expectOne(URL_A).flush({ a: 1 });
    await settle();

    expect(first).toEqual([{ a: 1 }]);
    expect(second).toEqual([{ a: 1 }]);
  });

  it('keys separately by language', async () => {
    http
      .get(URL_A, { params: { language: 'en' }, context: withHttpCache() })
      .subscribe();
    http
      .get(URL_A, { params: { language: 'el' }, context: withHttpCache() })
      .subscribe();
    await settle();

    httpMock.expectOne(`${URL_A}?language=en`).flush([]);
    httpMock.expectOne(`${URL_A}?language=el`).flush([]);
    await settle();

    expect(storage.entries.size).toBe(2);
  });
});
