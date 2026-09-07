import { inject, Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import {
  catchError,
  concat,
  defer,
  EMPTY,
  filter,
  finalize,
  Observable,
  of,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs';
import { CacheStorageService } from './cache-storage.service';
import { HTTP_CACHE } from './http-cache.context';
import { httpCacheKey } from './cache-key';
import { DEFAULT_MIN_REVALIDATE_MS } from './cache-config';
import { CacheScope } from './cache-entry';

/**
 * Stale-while-revalidate for opted-in GETs.
 *
 * Register this **first**, ahead of AuthInterceptor. Position is load-bearing:
 * innermost, HttpRetryInterceptor's `retry({count: 3})` would wrap a
 * two-emission observable and, on an offline revalidation, resubscribe and
 * re-emit the cached value four times. Outermost, revalidation failures are
 * swallowed here and `retry` never sees them, and AuthInterceptor's 401 refresh
 * settles inside so only completed results are ever stored.
 *
 * The cached body is the **raw** response, upstream of each service's `map()`.
 * That matters because the services bake `?token=` into every image URL as they
 * map; replaying the raw body lets them re-inject a live token instead of
 * resurrecting a dead one.
 */
@Injectable()
export class HttpCacheInterceptor implements HttpInterceptor {
  private readonly storage = inject(CacheStorageService);

  /**
   * In-flight network requests by cache key. Replaces the per-service
   * `inFlightRequests` maps, and dedupes across services rather than only
   * within one.
   */
  private readonly inFlight = new Map<
    string,
    Observable<HttpResponse<unknown>>
  >();

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    const options = request.context.get(HTTP_CACHE);
    if (!options || request.method !== 'GET') {
      return next.handle(request);
    }

    const key = httpCacheKey(request.method, request.urlWithParams);
    const scope: CacheScope = options.scope ?? 'shared';
    const minRevalidateMs =
      options.minRevalidateMs ?? DEFAULT_MIN_REVALIDATE_MS;
    const network$ = this.network(key, request, next, scope);

    if (options.refresh) {
      return network$;
    }

    return defer(() => this.storage.readJson(key)).pipe(
      switchMap((entry) => {
        if (!entry) {
          return network$;
        }
        const age = Date.now() - entry.fetchedAt;
        if (options.maxAgeMs !== undefined && age > options.maxAgeMs) {
          return network$;
        }

        const cached$ = of(
          new HttpResponse({
            body: entry.body,
            status: 200,
            url: request.urlWithParams,
          }),
        );

        // Inside the window a re-entry costs nothing at all. `ionViewWillEnter`,
        // the language effect and a tab switch otherwise fire the same request
        // three times within a second.
        if (age < minRevalidateMs) {
          return cached$;
        }

        // `concat`, not `merge`: the cached copy must paint first.
        return concat(
          cached$,
          network$.pipe(
            // Suppress the redundant second emission when nothing changed,
            // which is the common case. Without this every revalidation would
            // re-run each service's map() and rebuild every model object.
            filter((response) => !sameBody(response.body, entry.body)),
            // A failed revalidation is not an error the app should see: it
            // already has content on screen. This is what keeps the error toast
            // (and MyRaceService's force-logout) quiet when offline.
            catchError(() => EMPTY),
          ),
        );
      }),
    );
  }

  private network(
    key: string,
    request: HttpRequest<unknown>,
    next: HttpHandler,
    scope: CacheScope,
  ): Observable<HttpResponse<unknown>> {
    return defer(() => {
      const existing = this.inFlight.get(key);
      if (existing) {
        return existing;
      }

      const shared = next.handle(request).pipe(
        filter(
          (event): event is HttpResponse<unknown> =>
            event instanceof HttpResponse,
        ),
        tap((response) => {
          // Fire and forget: a slow or failing disk must never delay the
          // response the page is waiting on.
          void this.storage.writeJson(key, response.body, scope);
        }),
        finalize(() => this.inFlight.delete(key)),
        // refCount: false so a second caller arriving after the first
        // unsubscribes still gets the result rather than firing a new request.
        shareReplay({ bufferSize: 1, refCount: false }),
      );

      this.inFlight.set(key, shared);
      return shared;
    });
  }
}

/**
 * The CMS sends no ETag and no Access-Control-Expose-Headers, so a conditional
 * request is impossible and body equality is the only available change
 * detector. The cached payloads carry no timestamps or nonces, so this is
 * stable rather than always-different.
 */
function sameBody(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}
