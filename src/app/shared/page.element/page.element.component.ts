import { Component, Input, OnInit } from '@angular/core';
import { TrackingComponent } from '../../home/tracking/tracking.component';
import { NewsComponent } from '../../home/news/news.component';
import { InfoComponent } from '../../home/info/info.component';
import { InfoChildElementModel } from '../../home/info/info-child/info-child-element.interface';

@Component({
  selector: 'app-page-element',
  templateUrl: './page.element.component.html',
  styleUrls: ['./page.element.component.scss'],
  imports: [TrackingComponent, NewsComponent, InfoComponent],
})
export class PageElementComponent implements OnInit {
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() backgroundColor: string = '#eee7e7ff';
  @Input() textColor: string = '#000000';
  @Input() backgroundImage: string = '';
  @Input() type: 'tracking' | 'info' | 'news' = 'info';
  @Input() icon: string = '';
  @Input() infoChildElementModelArray: InfoChildElementModel[] = [];

  constructor() {}

  ngOnInit() {}
}
