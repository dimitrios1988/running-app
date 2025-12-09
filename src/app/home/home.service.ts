import { inject, Injectable } from '@angular/core';
import { HeaderElementModel } from './entities/header-element.interface';
import { map, Observable, of } from 'rxjs';
import {
  NewsElementModel,
  InfoParentElementModel,
  TrackingElementModel,
  CountdownTimerElementModel,
  ContentImageElementModel,
} from '../shared/page.element/page.element.model';
import { HttpClient } from '@angular/common/http';
import { AUTH_CREDENTIALS } from '../secrets';
import { AuthService } from '../auth/auth.service';
import { HeaderElementResponse } from './models/header.element.resp';

@Injectable({
  providedIn: 'root',
})
export class HomeService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly pageElementsUrl = new URL(
    `/api/mobile_app_manager/page_elements/v1`,
    AUTH_CREDENTIALS.app_url
  ).toString();

  constructor() {}

  getHeaderElement(language: string): Observable<HeaderElementModel | null> {
    return this.http
      .get<HeaderElementResponse[]>(this.pageElementsUrl, {
        params: { language, element: 'header' },
      })
      .pipe(
        map((response: HeaderElementResponse[]) => {
          if (response.length === 0) return null;
          return {
            mainImage: response[0]['0(page_element)'].primary_image
              ? new URL(
                  `/data/download/${
                    response[0]['0(page_element)'].primary_image[0].name
                  }?attribute_id=cc6d340b-2728-4bdb-95c3-90feb97dbcb2&file_id=${
                    response[0]['0(page_element)'].primary_image[0].id
                  }&version=0&token=${this.authService.getToken()}`,
                  AUTH_CREDENTIALS.app_url
                ).toString()
              : '',
            mainImagePosition: 'center',
            mainImageWidth: `${
              response[0]['0(page_element)'].primary_image_width ?? '0'
            }%`,
            secondaryImage: response[0]['0(page_element)'].secondary_image
              ? new URL(
                  `/data/download/${
                    response[0]['0(page_element)'].secondary_image[0].name
                  }?attribute_id=45d68dae-2bf7-475a-9b92-35f7a9899912&file_id=${
                    response[0]['0(page_element)'].secondary_image[0].id
                  }&version=0&token=${this.authService.getToken()}`,
                  AUTH_CREDENTIALS.app_url
                ).toString()
              : '',
            secondaryImageWidth: `${
              response[0]['0(page_element)'].secondary_image_width ?? '0'
            }%`,
          };
        })
      );
  }

  getNewsElement(language: string): Observable<NewsElementModel> {
    return of({
      type: 'news',
      order: 3,
      title: 'NEWS',
      subtitle: 'Latest Updates',
      backgroundColor: '#4a90e2',
      textColor: '#ece4e4',
      backgroundImage:
        'https://hips.hearstapps.com/hmg-prod/images/utmb25-occ-fo-00-0865-68b09bc260625.jpg?resize=1200:*',
      icon: 'https://unpkg.com/ionicons@7.1.0/dist/svg/analytics-outline.svg',
    });
  }

  getInfoParentElement(language: string): Observable<InfoParentElementModel> {
    return of({
      type: 'info',
      order: 2,
      infoChildElements: [
        {
          id: 1,
          link: 'https://google.com',
          title: '42KM',
          subtitle: 'Event Info',
          backgroundColor: '#2a7b9b',
          textColor: '#ece4e4',
          opens_in_external_url: true,
        },
        {
          id: 2,
          link: 'https://google.com',
          title: '21KM',
          subtitle: 'Event Info',
          backgroundColor: '#2a7b9b',
          textColor: '#ece4e4',
          opens_in_external_url: false,
        },
        {
          id: 3,
          link: 'https://google.com',
          title: 'COVID-19 Info',
          subtitle: 'Latest updates and guidelines',
          backgroundColor: '#2a7b9b',
          textColor: '#ece4e4',
          opens_in_external_url: false,
        },
      ],
    });
  }

  getTrackingElement(language: string): Observable<TrackingElementModel> {
    return of({
      type: 'tracking',
      order: 1,
      title: 'TRACKING',
      subtitle: 'Follow your Favorites',
      backgroundColor: '#4a90e2',
      textColor: '#ece4e4',
      backgroundImage:
        'https://cdn.outsideonline.com/wp-content/uploads/2021/11/boston-marathon-elite-men-start-line_h.jpg',
      icon: 'https://unpkg.com/ionicons@7.1.0/dist/svg/analytics-outline.svg',
    });
  }

  getCountdowntimerElements(
    language: string
  ): Observable<CountdownTimerElementModel[]> {
    return of([
      {
        order: 6,
        type: 'countdowntimer',
        id: 11,
        targetDateTime: new Date(2025, 11, 3, 18, 30, 0, 0),
        backgroundColor: '#4a90e2',
        textColor: '#ece4e4',
        title: 'Timer 2',
      },
    ]);
  }

  getContentImageElements(
    language: string
  ): Observable<ContentImageElementModel[]> {
    return of([
      {
        order: 7,
        type: 'contentimage',
        id: 21,
        imageUrl: `https://picsum.photos/1280/320?random=1`,
        altText: 'Athens Marathon Logo',
        linkUrl: 'https://athensauthenticmarathon.gr',
      },
    ]);
  }
}
