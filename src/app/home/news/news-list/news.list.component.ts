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
  IonNote,
  IonIcon,
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
import { chevronDownCircleOutline, newspaperOutline } from 'ionicons/icons';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { SettingsService } from '../../../settings/settings.service';
import { CachedBackgroundDirective } from '../../../shared/cache/cached-background.directive';

@Component({
  selector: 'app-news.list',
  templateUrl: './news.list.component.html',
  styleUrls: ['./news.list.component.scss'],
  standalone: true,
  imports: [
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
    IonNote,
    IonIcon,
    TranslatePipe,
    ScrollingModule,
    DatePipe,
    CachedBackgroundDirective,
  ],
})
export class NewsListComponent implements OnDestroy {
  @ViewChild(CdkVirtualScrollViewport) viewport?: CdkVirtualScrollViewport;
  newsListItems?: INewsListItem[];
  /*
   * Presentation-only flag: the service seeds its signal with [], so an empty
   * array cannot distinguish "still loading" from "genuinely no news". Without
   * this the empty state flashes on every cold open.
   */
  isLoading = true;

  private router = inject(Router);
  private newsService = inject(NewsService);
  private atTop = true;
  private newsListItemsSub?: Subscription;
  private settingsService = inject(SettingsService);

  constructor() {
    addIcons({ chevronDownCircleOutline, newspaperOutline });
    effect(() => {
      this.newsListItems = this.newsService.newsList$();
      this.checkViewportSize();
    });
  }

  private checkViewportSize() {
    setTimeout(() => this.viewport?.checkViewportSize());
  }

  ionViewWillEnter(): void {
    this.isLoading = !this.newsListItems?.length;
    this.newsListItemsSub = this.newsService
      .getNewsItems(this.settingsService.selectedLanguage$()!)
      // First emission, not completion: the cached copy arrives before the
      // revalidation, and the skeletons should give way to it immediately.
      .subscribe({
        next: () => (this.isLoading = false),
        error: () => (this.isLoading = false),
      });
    this.checkViewportSize();
  }

  /** Keeps rows (and their images) alive across the second, revalidated
   * emission, which rebuilds every item object. */
  trackById(_index: number, item: INewsListItem): number {
    return item.id;
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
    const complete = () =>
      (event.target as HTMLIonRefresherElement)?.complete();
    this.newsListItemsSub = this.newsService
      // Bypass the cache: a pull-to-refresh must hit the network, and its
      // failure must reach the toast rather than being swallowed.
      .getNewsItems(currentLang, true)
      .subscribe({ next: complete, error: complete });
  }

  openNewsItem(item: INewsListItem) {
    this.router.navigate(['/tabs/home/news/viewer', item.id]);
  }
}
