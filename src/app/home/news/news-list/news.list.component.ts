import { Component, inject, ViewChild, OnDestroy, effect } from '@angular/core';
import {
  IonHeader,
  IonContent,
  IonBackButton,
  IonToolbar,
  IonButtons,
  IonTitle,
  IonRefresher,
  IonRefresherContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonText,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { NewsService } from '../news.service';
import { INewsListItem } from './news.list.interface';
import { IonRefresherCustomEvent, RefresherEventDetail } from '@ionic/core';
import {
  CdkVirtualScrollViewport,
  ScrollingModule,
} from '@angular/cdk/scrolling';

import { addIcons } from 'ionicons';
import { chevronDownCircleOutline } from 'ionicons/icons';
import { DatePipe } from '@angular/common';
import { Subscription, tap } from 'rxjs';
import { SettingsService } from '../../../settings/settings.service';

@Component({
  selector: 'app-news.list',
  templateUrl: './news.list.component.html',
  styleUrls: ['./news.list.component.scss'],
  standalone: true,
  imports: [
    IonText,
    IonHeader,
    IonContent,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonRefresher,
    IonRefresherContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    TranslatePipe,
    ScrollingModule,
    DatePipe,
  ],
})
export class NewsListComponent implements OnDestroy {
  @ViewChild(CdkVirtualScrollViewport) viewport?: CdkVirtualScrollViewport;
  newsListItems?: INewsListItem[];

  private router = inject(Router);
  private newsService = inject(NewsService);
  private atTop = true;
  private newsListItemsSub?: Subscription;
  private settingsService = inject(SettingsService);

  constructor() {
    addIcons({ chevronDownCircleOutline });
    effect(() => {
      this.newsListItems = this.newsService.newsList$();
      this.checkViewportSize();
    });
  }

  private checkViewportSize() {
    setTimeout(() => this.viewport?.checkViewportSize());
  }

  ionViewWillEnter(): void {
    this.newsListItemsSub = this.newsService
      .getNewsItems(this.settingsService.selectedLanguage$()!)
      .subscribe();
    this.checkViewportSize();
  }

  ionViewWillLeave(): void {
    this.newsListItemsSub?.unsubscribe();
  }
  ngOnDestroy(): void {
    this.newsListItemsSub?.unsubscribe();
  }

  onScroll() {
    if (!this.viewport) return;
    const offset = this.viewport?.measureScrollOffset('top');
    this.atTop = offset! <= 300;
  }

  isAtTop() {
    return this.atTop;
  }

  doRefresh(event: IonRefresherCustomEvent<RefresherEventDetail>) {
    const currentLang = this.settingsService.selectedLanguage$();
    if (!currentLang) return;
    this.newsListItemsSub?.unsubscribe();
    this.newsListItemsSub = this.newsService
      .getNewsItems(currentLang)
      .pipe(tap(() => (event.target as HTMLIonRefresherElement)?.complete()))
      .subscribe();
  }

  openNewsItem(item: INewsListItem) {
    this.router.navigate(['/tabs/home/news/viewer', item.id]);
  }
}
