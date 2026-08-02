import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonTitle,
  IonBackButton,
  IonContent,
  IonSpinner,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  notificationsOffOutline,
} from 'ionicons/icons';
import { ActivatedRoute } from '@angular/router';
import { NotificationsService } from '../notifications.service';
import { signal } from '@angular/core';
import { INotification } from '../notification.interface';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-notifications-viewer',
  templateUrl: './notifications-viewer.component.html',
  styleUrls: ['./notifications-viewer.component.scss'],
  standalone: true,
  imports: [
    IonSpinner,
    IonIcon,
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
  public readonly notification = signal<INotification | null>(null);
  public readonly loading = signal(true);
  public readonly error = signal<string | null>(null);

  private notificationSub: Subscription = Subscription.EMPTY;
  private route = inject(ActivatedRoute);
  private notificationsService = inject(NotificationsService);
  constructor() {
    addIcons({ alertCircleOutline, notificationsOffOutline });
  }

  ngOnInit() {
    // Extract ID from route parameters
    const id = this.route.snapshot.params['id'];
    this.loading.set(true);
    this.error.set(null);
    this.notificationSub.unsubscribe();
    this.notificationSub = this.notificationsService
      .getNotificationById(Number(id))
      .subscribe({
        next: (notification: INotification) => {
          if (notification) {
            this.notification.set(notification);
            this.notificationsService.markAsRead(Number(id));
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
      });
  }

  ngOnDestroy() {
    // Clean up subscription to prevent memory leaks
    if (this.notificationSub != Subscription.EMPTY) {
      this.notificationSub.unsubscribe();
    }
  }
}
