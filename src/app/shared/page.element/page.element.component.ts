import { Component, Input } from '@angular/core';
import { TrackingComponent } from '../../home/tracking/tracking.component';
import { NewsComponent } from '../../home/news/news.component';
import { InfoComponent } from '../../home/info/info.component';
import { PageElementModel } from './page.element.model';
import { CountdowntimerComponent } from '../../home/countdowntimer/countdowntimer.component';

@Component({
  selector: 'app-page-element',
  templateUrl: './page.element.component.html',
  styleUrls: ['./page.element.component.scss'],
  imports: [
    TrackingComponent,
    NewsComponent,
    InfoComponent,
    CountdowntimerComponent,
  ],
})
export class PageElementComponent {
  @Input() element!: PageElementModel;
}
