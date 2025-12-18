import {
  Component,
  inject,
  ChangeDetectionStrategy,
  effect,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonButtons,
  IonToolbar,
  IonBackButton,
  IonTitle,
} from '@ionic/angular/standalone';
import { NewsService } from '../news.service';
import { INews } from './news.item';
import { Observable, Subscription } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { map, switchMap, shareReplay } from 'rxjs/operators';

@Component({
  selector: 'app-news.viewer',
  templateUrl: './news.viewer.component.html',
  styleUrls: ['./news.viewer.component.scss'],
  standalone: true,
  imports: [
    IonTitle,
    IonBackButton,
    IonToolbar,
    IonButtons,
    IonHeader,
    IonContent,
    AsyncPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsViewerComponent implements OnDestroy {
  private route = inject(ActivatedRoute);
  private newsService = inject(NewsService);
  private newsSubscription: Subscription;

  // reactive pipeline: responds to route param changes, shared for template consumption
  readonly news$: Observable<INews> = this.route.paramMap.pipe(
    map((pm) => Number(pm.get('id'))),
    switchMap((id) => this.newsService.getNews(id)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor() {
    this.newsSubscription = this.news$.subscribe();
    effect(() => {
      this.newsService.news$();
      this.newsSubscription = this.news$.subscribe();
    });
  }
  ngOnDestroy(): void {
    this.newsSubscription.unsubscribe();
  }
}
