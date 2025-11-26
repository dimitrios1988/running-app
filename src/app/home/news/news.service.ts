import { Injectable, signal } from '@angular/core';
import { INewsListItem } from './news-list/news.list.interface';
import { Observable, of, delay, tap, retry } from 'rxjs';
import { INews } from './news-viewer/news.item';

/**
 * Provides mock news data.
 * In production, replace with HttpClient calls and return Observables.
 */
@Injectable({ providedIn: 'root' })
export class NewsService {
  // Using a signal makes it reactive across components if needed
  readonly items = signal<INewsListItem[]>([]);
  private readonly _newsList = signal<INewsListItem[]>([]);
  public readonly newsList$ = this._newsList.asReadonly();
  private readonly _news = signal<INews | null>(null);
  public readonly news$ = this._news.asReadonly();

  constructor() {}

  /** Simulates async load (e.g., API) */
  getNewsItems(): Observable<INewsListItem[]> {
    return of(
      Array.from({ length: 200 }, (_, i) => ({
        id: i + 1,
        title: `News Item ${i + 1}`,
        excerpt: `This is the excerpt for news item ${i + 1}.`,
        featuredImageUrl: `https://picsum.photos/1280/720?random=${i + 1}`,
        publishedDate: new Date(),
      }))
    )
      .pipe(delay(3000))
      .pipe(tap((data) => this._newsList.set(data)));
  }

  /** Single news item (placeholder for HTTP call) */
  getNews(id: number): Observable<INews> {
    return of({
      id,
      title: `News Item ${id}`,
      content: `This is the full content for news item ${id}.`,
      publishedDate: new Date(),
      featuredImageUrl: `https://picsum.photos/1280/720?random=${id}`,
    })
      .pipe(delay(200))
      .pipe(tap((data) => this._news.set(data)));
  }
}
