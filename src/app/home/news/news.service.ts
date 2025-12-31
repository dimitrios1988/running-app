import { effect, inject, Injectable, signal } from '@angular/core';
import { INewsListItem } from './news-list/news.list.interface';
import { Observable, tap, map, Subscription } from 'rxjs';
import { INews } from './news-viewer/news.item';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../auth/auth.service';
import { AUTH_CREDENTIALS } from '../../../app/secrets';
import { NewsListResponse } from './responses/news.list.resp';
import { NewsItemResponse } from './responses/news.item.resp';
import { SettingsService } from '../../settings/settings.service';

@Injectable({ providedIn: 'root' })
export class NewsService {
  // Using a signal makes it reactive across components if needed
  private readonly _newsList = signal<INewsListItem[]>([]);
  public readonly newsList$ = this._newsList.asReadonly();
  private readonly _news = signal<INews | null>(null);
  public readonly news$ = this._news.asReadonly();
  private newsListSub$: Subscription = Subscription.EMPTY;
  private readonly http: HttpClient = inject(HttpClient);
  private readonly authService = inject(AuthService);

  constructor(private settingsService: SettingsService) {
    effect(() => {
      const language = this.settingsService.selectedLanguage$();
      if (language) {
        this.newsListSub$.unsubscribe();
        this.newsListSub$ = this.getNewsItems(language).subscribe();
      }
    });
  }

  getNewsItems(language: string): Observable<INewsListItem[]> {
    const newsItemsApi = new URL(
      `/api/mobile_app_manager/news_items/v1`,
      AUTH_CREDENTIALS.app_url
    ).toString();
    return this.http
      .get<NewsListResponse[]>(newsItemsApi, {
        params: { language },
      })
      .pipe(
        map((response: NewsListResponse[]) => {
          return response.map((item) => ({
            id: item['0(post)'].id,
            title: item['0(post)'].title,
            excerpt: item['0(post)'].excerpt,
            featuredImageUrl:
              item['0(post)'].header_image &&
              item['0(post)'].header_image.length > 0
                ? new URL(
                    `/data/download/${
                      item['0(post)'].header_image[0].name
                    }?attribute_id=9ec4d1de-8886-4eb4-b501-6128916a3124&file_id=${
                      item['0(post)'].header_image[0].id
                    }&version=0&token=${this.authService.getToken()}`,
                    AUTH_CREDENTIALS.app_url
                  ).toString()
                : null,
            publishedDate: new Date(item['0(post)'].published_at * 1000),
          }));
        }),
        tap((items: INewsListItem[]) => {
          this._newsList.set(items);
        })
      );
  }

  getNews(id: number, language: string): Observable<INews> {
    const newsItemApi = new URL(
      `/api/mobile_app_manager/news_item/v1/${id}`,
      AUTH_CREDENTIALS.app_url
    ).toString();
    return this.http
      .get<NewsItemResponse[]>(newsItemApi, {
        params: { language },
      })
      .pipe(
        map((response: NewsItemResponse[]) => {
          const item = response[0]['0(post)'];
          return {
            id: item.id,
            title: item.title,
            content: item.content,
            publishedDate: new Date(item.published_at * 1000),
            featuredImageUrl:
              item.header_image && item.header_image.length > 0
                ? new URL(
                    `/data/download/${
                      item.header_image[0].name
                    }?attribute_id=9ec4d1de-8886-4eb4-b501-6128916a3124&file_id=${
                      item.header_image[0].id
                    }&version=0&token=${this.authService.getToken()}`,
                    AUTH_CREDENTIALS.app_url
                  ).toString()
                : null,
          };
        }),
        tap((news: INews) => {
          this._news.set(news);
        })
      );
  }
}
