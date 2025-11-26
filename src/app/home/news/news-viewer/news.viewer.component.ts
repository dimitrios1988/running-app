import {
  Component,
  inject,
  ChangeDetectionStrategy,
  effect,
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
import { Observable } from 'rxjs';
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
export class NewsViewerComponent {
  private route = inject(ActivatedRoute);
  private newsService = inject(NewsService);

  // reactive pipeline: responds to route param changes, shared for template consumption
  readonly news$: Observable<INews> = this.route.paramMap.pipe(
    map((pm) => Number(pm.get('id'))),
    switchMap((id) => this.newsService.getNews(id)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor() {
    this.news$.subscribe();
    effect(() => {
      this.newsService.news$();
      this.news$.subscribe((news) => console.log('Loaded news item:', news));
    });
  }
}
