import { inject, Injectable, signal } from '@angular/core';
import { map, Observable, of, tap } from 'rxjs';
import { INotification } from './notification.interface';
import { HttpClient } from '@angular/common/http';
import { AUTH_CREDENTIALS } from '../secrets';
import { NotificationsResp } from './notifications.resp';

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  private readonly _notifications = signal<INotification[]>([]);

  private readonly notificationsApi = new URL(
    `/api/mobile_app_manager/notifications/v1`,
    AUTH_CREDENTIALS.app_url
  ).toString();
  private readonly http = inject(HttpClient);
  public readonly notifications$ = this._notifications.asReadonly();
  constructor() {}

  getNotifications(language: string): Observable<INotification[]> {
    return this.http
      .get<NotificationsResp[]>(this.notificationsApi, { params: { language } })
      .pipe(
        map((resp) => {
          return resp.map((item) => {
            return {
              id: item['0(notification)'].id,
              title: item['0(notification)'].title,
              message: item['0(notification)'].content,
              publishedAt: new Date(
                item['0(notification)'].published_at * 1000
              ),
            };
          });
        }),
        tap((notifications) => {
          this._notifications.set(notifications);
        })
      );
  }

  getNotificationById(id: number): Observable<INotification | undefined> {
    const notification = this._notifications()
      .slice()
      .find((n) => n.id === id);
    return of(notification);
  }
}
