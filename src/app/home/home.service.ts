import { Injectable } from '@angular/core';
import { HeaderElementModel } from './entities/header-element.interface';
import { Observable, of } from 'rxjs';
import {
  NewsElementModel,
  InfoParentElementModel,
  TrackingElementModel,
  CountdownTimerElementModel,
} from '../shared/page.element/page.element.model';

@Injectable({
  providedIn: 'root',
})
export class HomeService {
  constructor() {}

  getHeaderElement(language: string): Observable<HeaderElementModel> {
    return of({
      mainImage:
        'https://www.athensauthenticmarathon.gr/img/authenticmarathon_layout/logo.svg',
      mainImageWidth: '80px',
      mainImagePosition: 'center',
      secondaryImage: '',
      secondaryImageWidth: '50px',
    });
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

  getCountdowntimerElements(): Observable<CountdownTimerElementModel[]> {
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
}
