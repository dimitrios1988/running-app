import { Component, inject, OnInit, ViewChild, OnDestroy } from '@angular/core';
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
import { Observable, Subscription, tap } from 'rxjs';

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
    IonCardContent,
    TranslatePipe,
    ScrollingModule,
    DatePipe,
  ],
})
export class NewsListComponent implements OnInit, OnDestroy {
  @ViewChild(CdkVirtualScrollViewport) viewport?: CdkVirtualScrollViewport;
  newsListItems?: INewsListItem[];

  private router = inject(Router);
  private newsService = inject(NewsService);
  private atTop = true;
  private newsListItemsSub?: Subscription;
  constructor() {
    addIcons({ chevronDownCircleOutline });
  }

  private loadNews(): Observable<INewsListItem[]> {
    return this.newsService.getNewsItems().pipe(
      tap((data: INewsListItem[]) => {
        this.newsListItems = data;
        this.checkViewportSize();
      })
    );
  }

  private checkViewportSize() {
    setTimeout(() => this.viewport?.checkViewportSize());
  }

  ngOnInit() {
    this.newsListItemsSub = this.loadNews().subscribe();
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

  async doRefresh(event: IonRefresherCustomEvent<RefresherEventDetail>) {
    this.newsListItemsSub?.unsubscribe();
    this.newsListItemsSub = this.loadNews()
      .pipe(tap(() => (event.target as HTMLIonRefresherElement)?.complete()))
      .subscribe();
  }

  openNewsItem(item: INewsListItem) {
    //this.router.navigate(['/tabs/home/news/viewer', item.id]);
  }
}
