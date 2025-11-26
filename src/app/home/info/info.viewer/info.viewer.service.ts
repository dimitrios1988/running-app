import { Injectable } from '@angular/core';
import { IInfoViewer } from './info.viewer.interface';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class InfoViewerService {
  constructor() {}

  getInfo(id: number): Observable<IInfoViewer> {
    return of({
      title: `Info Viewer ${id}`,
      backgroundColor: '#2a7b9b',
      content: `<p>Hello</p>`,
      image:
        'https://cdn.outsideonline.com/wp-content/uploads/2021/11/boston-marathon-elite-men-start-line_h.jpg',
      link: 'https://www.athensauthenticmarathon.gr',
    });
  }
}
