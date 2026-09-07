import { Component, effect, inject, OnDestroy, ViewChild } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonRefresher,
  IonRefresherContent,
  IonItem,
  IonLabel,
  IonText,
  IonIcon,
  RefresherEventDetail,
  IonList,
  IonNote,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import {
  CdkVirtualScrollViewport,
  ScrollingModule,
} from '@angular/cdk/scrolling';
import { IonRefresherCustomEvent } from '@ionic/core';
import { NotificationsService } from './notifications.service';
import { INotification } from './notification.interface';
import { addIcons } from 'ionicons';
import {
  chevronDownCircleOutline,
  chevronForwardOutline,
  notificationsOutline,
} from 'ionicons/icons';
import { Observable, Subscription, tap } from 'rxjs';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MyRaceService } from '../myrace/myrace.service';
import { SettingsService } from '../settings/settings.service';

@Component({
  selector: 'app-notifications',
  templateUrl: 'notifications.page.html',
  styleUrls: ['notifications.page.scss'],
  imports: [
    IonNote,
    IonList,
    IonIcon,
    IonText,
    IonLabel,
    IonItem,
    IonRefresherContent,
    IonRefresher,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    CdkVirtualScrollViewport,
    ScrollingModule,
    TranslatePipe,
    CommonModule,
  ],
})
export class NotificationsPage implements OnDestroy {
  @ViewChild(CdkVirtualScrollViewport) viewport?: CdkVirtualScrollViewport;

  notifications?: INotification[];
  private atTop = true;
  private settingsService = inject(SettingsService);
  private myRaceService = inject(MyRaceService);
  private notificationsService: NotificationsService =
    inject(NotificationsService);
  private notificationSub$?: Subscription;
  private router: Router = inject(Router);

  constructor() {
    addIcons({
      chevronDownCircleOutline,
      chevronForwardOutline,
      notificationsOutline,
    });
    effect(() => {
      const language = this.settingsService.selectedLanguage$();
      const eventId = this.myRaceService.runner$()?.event.id;
      if (language) {
        this.notificationSub$?.unsubscribe();
        this.notificationSub$ = this.notificationsService
          .getNotifications(language, eventId)
          .subscribe((data: INotification[]) => {
            this.notifications = new Array(...data);
            this.checkViewportSize();
          });
      }
    });
  }

  ionViewWillEnter(): void {
    this.notificationSub$?.unsubscribe();
    this.notificationSub$ = this.loadNotifications().subscribe();
  }

  ionViewWillLeave(): void {
    this.notificationSub$?.unsubscribe();
  }

  ngOnDestroy(): void {
    this.notificationSub$?.unsubscribe();
  }

  private loadNotifications(forceRefresh = false): Observable<INotification[]> {
    return this.notificationsService
      .getNotifications(
        this.settingsService.selectedLanguage$()!,
        this.myRaceService.runner$()?.event?.id,
        forceRefresh,
      )
      .pipe(
        tap((data: INotification[]) => {
          this.notifications = new Array(...data);
          // Measured per emission rather than in `finalize`: the cached copy
          // paints first and the viewport must size itself against it, not wait
          // for the revalidation behind it.
          this.checkViewportSize();
        }),
      );
  }

  private checkViewportSize() {
    setTimeout(() => this.viewport?.checkViewportSize());
  }

  doRefresh(event: IonRefresherCustomEvent<RefresherEventDetail>) {
    this.notificationSub$?.unsubscribe();
    const complete = () =>
      (event.target as HTMLIonRefresherElement)?.complete();
    this.notificationSub$ = this.loadNotifications(true).subscribe({
      next: complete,
      error: complete,
    });
  }

  onScroll() {
    if (!this.viewport) return;
    const offset = this.viewport?.measureScrollOffset('top');
    this.atTop = offset! <= 115;
  }

  isAtTop() {
    return this.atTop;
  }

  openNotification(notification: INotification) {
    this.router.navigate(['/tabs/notifications/viewer/', notification.id]);
  }
}
