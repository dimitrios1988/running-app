import { Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
@Component({
  selector: 'app-notifications',
  templateUrl: 'notifications.page.html',
  styleUrls: ['notifications.page.scss'],
  imports: [
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
  ],
})
export class NotificationsPage implements OnInit, OnDestroy {
  @ViewChild(CdkVirtualScrollViewport) viewport?: CdkVirtualScrollViewport;

  notifications?: INotification[];
  private atTop = true;
  private translateService = inject(TranslateService);
  private notificationsService: NotificationsService =
    inject(NotificationsService);
  private notificationSub$?: Subscription;

  constructor() {
    addIcons({ chevronDownCircleOutline, chevronForwardOutline });
  }

  ngOnInit() {
    this.notificationSub$ = this.loadNotifications().subscribe();
  }

  ngOnDestroy(): void {
    this.notificationSub$?.unsubscribe();
  }

  private loadNotifications(): Observable<INotification[]> {
    return this.notificationsService
      .getNotifications(this.translateService.getCurrentLang())
      .pipe(
        tap((data: INotification[]) => {
          this.notifications = data;
          this.checkViewportSize();
        })
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
    this.atTop = offset! <= 300;
  }

  isAtTop() {
    return this.atTop;
  }
}
