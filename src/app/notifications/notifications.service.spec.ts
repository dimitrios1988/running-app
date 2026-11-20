import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TranslateService } from '@ngx-translate/core';
import { config } from 'rxjs';
import { MyRaceService } from '../myrace/myrace.service';
import { AUTH_CREDENTIALS } from '../secrets';
import { SettingsService } from '../settings/settings.service';
import { HTTP_CACHE } from '../shared/cache/http-cache.context';
import { ToastService } from '../shared/services/toast.service';
import { NotificationsService } from './notifications.service';

const NOTIFICATIONS_API = new URL(
  `/api/${AUTH_CREDENTIALS.app_name}/notifications/v1`,
  AUTH_CREDENTIALS.app_url,
).toString();

const EVENT_ID = 7;

const UNAVAILABLE = { status: 503, statusText: 'Service Unavailable' };

/** A request that goes past the HTTP cache, as a forced refresh does. */
function skipsCache(req: HttpRequest<unknown>): boolean {
  return req.context.get(HTTP_CACHE)?.refresh === true;
}

describe('NotificationsService', () => {
  let service: NotificationsService;
  let httpMock: HttpTestingController;
  let showError: jasmine.Spy;
  /** Drives the service's load effect. */
  let language: WritableSignal<string | null>;

  beforeEach(() => {
    showError = jasmine.createSpy('showError').and.resolveTo();
    language = signal<string | null>('en');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SettingsService,
          useValue: { selectedLanguage$: language.asReadonly() },
        },
        {
          provide: MyRaceService,
          useValue: { runner$: signal({ event: { id: EVENT_ID } }) },
        },
        { provide: ToastService, useValue: { showError } },
        {
          provide: TranslateService,
          useValue: { instant: (key: string) => key },
        },
      ],
    });
    service = TestBed.inject(NotificationsService);
    httpMock = TestBed.inject(HttpTestingController);
    // Settle the constructor's effect, which loads the list through the cache.
    TestBed.tick();
    httpMock.expectOne((r) => r.url === NOTIFICATIONS_API).flush([]);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('refreshInBackground() re-reads the current list past the cache', () => {
    service.refreshInBackground();

    const req = httpMock.expectOne((r) => r.url === NOTIFICATIONS_API);
    expect(req.request.params.get('language')).toBe('en');
    expect(req.request.params.get('event')).toBe(String(EVENT_ID));
    expect(req.request.context.get(HTTP_CACHE)).toEqual({
      scope: 'user',
      refresh: true,
    });
    req.flush([]);
  });

  it('drops a failed background refresh without a toast or an unhandled error', async () => {
    const onUnhandledError = jasmine.createSpy('onUnhandledError');
    config.onUnhandledError = onUnhandledError;
    try {
      service.refreshInBackground();
      httpMock.expectOne(skipsCache).flush(null, UNAVAILABLE);
      // RxJS reports an unhandled error from a later macrotask.
      await new Promise((resolve) => setTimeout(resolve));

      expect(onUnhandledError).not.toHaveBeenCalled();
      expect(showError).not.toHaveBeenCalled();
    } finally {
      config.onUnhandledError = null;
    }
  });

  it('getNotifications() still toasts and rethrows a failure', () => {
    let failed = false;
    service
      .getNotifications('en', EVENT_ID)
      .subscribe({ error: () => (failed = true) });
    httpMock
      .expectOne((r) => r.url === NOTIFICATIONS_API)
      .flush(null, UNAVAILABLE);

    expect(failed).toBeTrue();
    expect(showError).toHaveBeenCalledOnceWith(
      'NOTIFICATIONS.ERRORS.FAILED_TO_LOAD_NOTIFICATIONS',
    );
  });

  it('keeps a background refresh running when the effect reloads the list', () => {
    service.refreshInBackground();
    const refresh = httpMock.expectOne(skipsCache);

    language.set('el');
    TestBed.tick();
    httpMock.expectOne((r) => r.params.get('language') === 'el').flush([]);

    expect(refresh.cancelled).toBeFalse();
    refresh.flush([]);
  });
});
