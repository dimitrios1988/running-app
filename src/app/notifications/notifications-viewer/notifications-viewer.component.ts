import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonTitle,
  IonBackButton,
  IonContent,
  IonSpinner,
} from '@ionic/angular/standalone';
import { ActivatedRoute } from '@angular/router';
import { NotificationsService } from '../notifications.service';
import { signal, effect } from '@angular/core';
import { INotification } from '../notification.interface';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { SettingsService } from '../../settings/settings.service';

@Component({
  selector: 'app-notifications-viewer',
  templateUrl: './notifications-viewer.component.html',
  styleUrls: ['./notifications-viewer.component.scss'],
  standalone: true,
  imports: [
    IonSpinner,
    IonContent,
    IonBackButton,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonTitle,
    CommonModule,
    TranslatePipe,
  ],
})
export class NotificationsViewerComponent implements OnInit, OnDestroy {
  private readonly _notificationId = signal<string | null>(null);
  public readonly notification = signal<INotification | null>(null);
  public readonly loading = signal(true);
  public readonly error = signal<string | null>(null);

  private subscription: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private notificationsService: NotificationsService,
    private settingsService: SettingsService
  ) {
    effect((test) => {
      const id = this._notificationId();
      if (!id) {
        this.error.set('Invalid notification ID');
        this.loading.set(false);
        return;
      }
      //this.notificationsService.markAsRead(Number(id));

      // Cancel previous subscription if exists
      if (this.subscription) {
        //this.subscription.unsubscribe();
      }

      /* this.loading.set(true);
      this.error.set(null); */

      /* this.subscription = this.notificationsService
        .getNotificationById(Number(id))
        .subscribe({
          next: (notification) => {
            if (notification) {
              this.notification.set(notification);
            } else {
              this.error.set('Notification not found');
            }
            this.loading.set(false);
          },
          error: (err) => {
            console.error('Failed to load notification:', err);
            this.error.set('Failed to load notification');
            this.loading.set(false);
          },
        }); */
    });
  }

  ngOnInit() {
    // Extract ID from route parameters
    const id = this.route.snapshot.params['id'];
    this._notificationId.set(id ?? null);
    this.loading.set(true);
    this.error.set(null);
    this.subscription = this.notificationsService
      .getNotificationById(
        Number(id),
        this.settingsService.selectedLanguage$() || 'en'
      )
      .subscribe({
        next: (notification) => {
          if (notification) {
            this.notification.set(notification);
          } else {
            this.error.set('Notification not found');
          }
          this.loading.set(false);
          this.notificationsService.markAsRead(Number(id));
        },
        error: (err) => {
          console.error('Failed to load notification:', err);
          this.error.set('Failed to load notification');
          this.loading.set(false);
        },
      });
  }

  ngOnDestroy() {
    // Clean up subscription to prevent memory leaks
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
