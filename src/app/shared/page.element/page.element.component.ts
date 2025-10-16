import { Component, Input, OnInit } from '@angular/core';
import { TrackingComponent } from '../../home/tracking/tracking.component';
import { NewsComponent } from '../../home/news/news.component';
import { InfoComponent } from '../../home/info/info.component';
import { InfoChildElementModel } from '../../home/info/info-child/info-child-element.interface';
import { TrackingElementModel } from '../../home/tracking/tracking-element.interface';
import { NewsElementModel } from '../../home/news/news-element.interface';

@Component({
  selector: 'app-page-element',
  templateUrl: './page.element.component.html',
  styleUrls: ['./page.element.component.scss'],
  imports: [TrackingComponent, NewsComponent, InfoComponent],
})
export class PageElementComponent implements OnInit {
  @Input() type: 'tracking' | 'info' | 'news' = 'info';
  @Input() infoChildElementModelArray?: InfoChildElementModel[];
  @Input() trackingElementModel?: TrackingElementModel;
  @Input() newsElementModel?: NewsElementModel;

  constructor() {}

  ngOnInit() {}
}
