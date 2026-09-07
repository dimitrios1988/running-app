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
  IonSpinner,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { alertCircleOutline } from 'ionicons/icons';
import { NewsService } from '../news.service';
import { INews } from './news.item';
import { Subscription } from 'rxjs';
import { SettingsService } from '../../../settings/settings.service';
import { TranslatePipe } from '@ngx-translate/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CachedSrcDirective } from '../../../shared/cache/cached-src.directive';

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
    IonSpinner,
    IonIcon,
    TranslatePipe,
    CachedSrcDirective,
  ],
})
export class NewsViewerComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private newsService = inject(NewsService);
  private settingsService = inject(SettingsService);
  private newsSubscription: Subscription = Subscription.EMPTY;
  private sanitizer = inject(DomSanitizer);
  public readonly loading = signal(true);
  public readonly error = signal<string | null>(null);
  news: (INews & { safeContent: SafeHtml }) | null = null;

  constructor() {
    addIcons({ alertCircleOutline });
    effect(() => {
      const news = this.newsService.news$();
      if (news) {
        this.news = {
          ...news,
          safeContent: this.sanitizer.bypassSecurityTrustHtml(
            news.content ?? '',
          ),
        };
      }
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
          // Cleared on the first emission, not on completion. The template
          // gates all content behind `@if (loading())`, so waiting for
          // completion would keep a cached article hidden until the
          // revalidation behind it settled.
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
