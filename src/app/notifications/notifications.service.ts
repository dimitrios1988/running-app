import { effect, inject, Injectable, signal } from '@angular/core';
import {
  map,
  Observable,
  Subscription,
  tap,
  finalize,
  shareReplay,
  catchError,
  throwError,
} from 'rxjs';
import { INotification } from './notification.interface';
import { HttpClient } from '@angular/common/http';
import { AUTH_CREDENTIALS } from '../secrets';
import { NotificationsResp } from './notifications.resp';
import { Preferences } from '@capacitor/preferences';
import { SettingsService } from '../settings/settings.service';
import { ToastService } from '../shared/services/toast.service';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  private readonly _notifications = signal<INotification[]>([]);
  private notificationSub$: Subscription = Subscription.EMPTY;
  private inFlightRequests: Map<string, Observable<INotification[]>> =
    new Map();
  private readonly toastService = inject(ToastService);
  private readonly translateService = inject(TranslateService);
  private readonly notificationsApi = new URL(
    `/api/mobile_app_manager/notifications/v1`,
    AUTH_CREDENTIALS.app_url,
  ).toString();
  private readonly http = inject(HttpClient);
  public readonly notifications$ = this._notifications.asReadonly();
  constructor(private settingsService: SettingsService) {
    effect(() => {
      const language = this.settingsService.selectedLanguage$();
      if (language) {
        this.notificationSub$.unsubscribe();
        this.notificationSub$ = this.getNotifications(language).subscribe();
      }
    });
  }

  getNotifications(
    language: string,
    eventId?: number,
  ): Observable<INotification[]> {
    const key = `${language}-${eventId}`;
    const existing = this.inFlightRequests.get(key);
    if (existing) {
      return existing;
    }
    let request$: Observable<NotificationsResp[]>;
    if (eventId) {
      request$ = this.http.get<NotificationsResp[]>(this.notificationsApi, {
        params: { language, event: eventId },
      });
    } else {
      request$ = this.http.get<NotificationsResp[]>(this.notificationsApi, {
        params: { language },
      });
    }
    const pipedRequest$ = request$.pipe(
      map((resp) => {
        return resp.map((item) => {
          return {
            id: item['0(notification)'].id,
            title: item['0(notification)'].title,
            message: item['0(notification)'].content,
            publishedAt: new Date(item['0(notification)'].published_at * 1000),
            isRead: false,
          };
        });
      }),
      tap((notifications) => {
        this.getReadNotifications().then((readIds) => {
          notifications.forEach((notification) => {
            if (readIds.includes(notification.id)) {
              notification.isRead = true;
            }
          });
          this._notifications.set(notifications);
        });
      }),
      catchError((error) => {
        const errorMessage = this.translateService.instant(
          'HOME.ERRORS.FAILED_TO_LOAD_HOME_ELEMENTS',
        );
        this.toastService.showError(errorMessage);
        return throwError(() => error);
      }),
      finalize(() => this.inFlightRequests.delete(key)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    this.inFlightRequests.set(key, pipedRequest$);
    return pipedRequest$;
  }

  getNotificationById(id: number, language: string): Observable<INotification> {
    try {
      return this.http
        .get<NotificationsResp[]>(`${this.notificationsApi}/${id}`, {
          params: { language },
        })
        .pipe(
          map((resp) => {
            return {
              id: resp[0]['0(notification)'].id,
              title: resp[0]['0(notification)'].title,
              message: resp[0]['0(notification)'].content,
              publishedAt: new Date(
                resp[0]['0(notification)'].published_at * 1000,
              ),
              isRead: false,
            };
          }),
          catchError((error) => {
            const errorMessage = this.translateService.instant(
              'HOME.ERRORS.FAILED_TO_LOAD_HOME_ELEMENTS',
            );
            this.toastService.showError(errorMessage);
            return throwError(() => error);
          }),
        );
    } catch (error) {
      throw new Error('Error fetching notification');
    }
  }

  async markAsRead(id: number): Promise<void> {
    const readIds = await this.getReadNotifications();
    if (!readIds.includes(id)) {
      readIds.push(id);
      await Preferences.set({
        key: 'read_notifications',
        value: JSON.stringify(readIds),
      });
    }

    const notifications = this._notifications()
      .slice()
      .map((n) => {
        if (n.id === id) {
          return { ...n, isRead: true };
        }
        return n;
      });
    this._notifications.set(notifications);
  }

  async getReadNotifications(): Promise<number[]> {
    const result = await Preferences.get({ key: 'read_notifications' });
    if (result.value) {
      return JSON.parse(result.value) as number[];
    }
    return [];
  }
}
