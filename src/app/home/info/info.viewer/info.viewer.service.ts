import { Injectable } from '@angular/core';
import { IInfoViewer } from './info.viewer.interface';

@Injectable({
  providedIn: 'root',
})
export class InfoViewerService {
  constructor() {}

  getInfo(id: number): IInfoViewer {
    return {
      title: `Info Viewer ${id}s`,
      backgroundColor: '#2a7b9b',
      content: `<p>Hello</p>`,
      image:
        'https://cdn.outsideonline.com/wp-content/uploads/2021/11/boston-marathon-elite-men-start-line_h.jpg',
      link: 'https://www.athensauthenticmarathon.gr',
    };
  }
}
