import { Injectable, signal } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { INotification } from './notification.interface';

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  private readonly _notifications = signal<INotification[]>([]);
  public readonly notifications$ = this._notifications.asReadonly();
  constructor() {}

  getNotifications(language: string): Observable<INotification[]> {
    return of([
      {
        id: 1,
        title: 'Sample Notification 1',
        message: 'This is a sample notification message.',
        publishedAt: new Date(),
      },
      {
        id: 2,
        publishedAt: new Date(),
        message: 'This is another sample notification message.',
        title: 'Sample Notification 2',
      },
      {
        id: 3,
        publishedAt: new Date(),
        title: 'Sample Notification 3',
        message: 'This is yet another sample notification message.',
      },
    ]).pipe(
      tap((data) => {
        data.sort((n1, n2) => {
          return n2.publishedAt.getTime() - n1.publishedAt.getTime();
        });
        this._notifications.set(data);
      })
    );
  }
}
