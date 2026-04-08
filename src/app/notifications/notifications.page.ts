import { Component, inject, OnDestroy, ViewChild } from '@angular/core';
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
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
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
} from 'ionicons/icons';
import { Observable, Subscription, tap } from 'rxjs';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MyRaceService } from '../myrace/myrace.service';

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
  private translateService = inject(TranslateService);
  private myRaceService = inject(MyRaceService);
  private notificationsService: NotificationsService =
    inject(NotificationsService);
  private notificationSub$?: Subscription;
  private router: Router = inject(Router);

  constructor() {
    addIcons({ chevronDownCircleOutline, chevronForwardOutline });
  }

  ionViewWillEnter(): void {
    this.notificationSub$ = this.loadNotifications().subscribe();
  }

  ionViewWillLeave(): void {
    this.notificationSub$?.unsubscribe();
  }

  ngOnDestroy(): void {
    this.notificationSub$?.unsubscribe();
  }

  private loadNotifications(): Observable<INotification[]> {
    return this.notificationsService
      .getNotifications(
        this.translateService.getCurrentLang(),
        this.myRaceService.runner$()?.event?.id,
      )
      .pipe(
        tap((data: INotification[]) => {
          this.notifications = data;
          this.checkViewportSize();
        }),
      );
  }

  private checkViewportSize() {
    setTimeout(() => this.viewport?.checkViewportSize());
  }

  doRefresh(event: IonRefresherCustomEvent<RefresherEventDetail>) {
    this.notificationSub$?.unsubscribe();
    this.notificationSub$ = this.loadNotifications()
      .pipe(tap(() => (event.target as HTMLIonRefresherElement)?.complete()))
      .subscribe();
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
