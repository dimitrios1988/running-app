import {
  Component,
  inject,
  effect,
  OnDestroy,
  OnInit,
  signal,
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
import { Subscription } from 'rxjs';
import { SettingsService } from '../../../settings/settings.service';
import { TranslatePipe } from '@ngx-translate/core';

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
    TranslatePipe,
  ],
})
export class NewsViewerComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private newsService = inject(NewsService);
  private settingsService = inject(SettingsService);
  private newsSubscription: Subscription = Subscription.EMPTY;
  public readonly loading = signal(true);
  public readonly error = signal<string | null>(null);
  news: INews | null = null;

  constructor() {
    effect(() => {
      this.news = this.newsService.news$();
    });
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.params['id']);
    this.loading.set(true);
    this.error.set(null);
    const selectedLanguage = this.settingsService.selectedLanguage$();
    if (selectedLanguage) {
      this.newsSubscription.unsubscribe();
      this.newsSubscription = this.newsService
        .getNews(id, selectedLanguage)
        .subscribe({
          next: () => {
            this.loading.set(false);
          },
          error: () => {
            this.error.set('ERRORS.NEWS_LOADING_ERROR');
            this.loading.set(false);
          },
        });
    }
  }

  ngOnDestroy(): void {
    if (this.newsSubscription != Subscription.EMPTY) {
      this.newsSubscription.unsubscribe();
    }
  }
}
