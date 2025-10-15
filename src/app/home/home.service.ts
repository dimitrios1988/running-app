import { Injectable } from '@angular/core';
import { HeaderElementModel } from './entities/header-element.interface';
import { NewsElementModel } from './news/news-element.interface';

@Injectable({
  providedIn: 'root',
})
export class HomeService {
  constructor() {}

  getHeaderElement(language: string): HeaderElementModel {
    return {
      backgroundColor: '#2a7b9b',
      mainImage:
        'https://www.athensauthenticmarathon.gr/img/authenticmarathon_layout/logo.svg',
      mainImageWidth: '80px',
      mainImagePosition: 'center',
      secondaryImage: '',
      secondaryImageWidth: '50px',
    };
  }

  getNewsElement(language: string): NewsElementModel {
    return {
      title: 'NEWS',
      subtitle: 'Latest Updates',
      backgroundColor: '#4a90e2',
      textColor: '#ece4e4',
      backgroundImage:
        'https://hips.hearstapps.com/hmg-prod/images/utmb25-occ-fo-00-0865-68b09bc260625.jpg?resize=1200:*',
      icon: 'https://unpkg.com/ionicons@7.1.0/dist/svg/analytics-outline.svg',
    };
  }

  getInfoChildElements(language: string) {
    return [
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
    ];
  }
}
