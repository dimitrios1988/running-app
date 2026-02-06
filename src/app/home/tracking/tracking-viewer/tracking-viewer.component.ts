import {
  Component,
  inject,
  OnInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { HomeService } from '../../home.service';

@Component({
  selector: 'app-tracking-viewer',
  templateUrl: './tracking-viewer.component.html',
  styleUrls: ['./tracking-viewer.component.scss'],
  standalone: true,
  imports: [
    IonBackButton,
    IonButtons,
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
  ],
})
export class TrackingViewerComponent implements OnInit {
  private readonly homeService = inject(HomeService);

  @ViewChild('trackingFrame') trackingFrame!: ElementRef<HTMLIFrameElement>;

  constructor() {}

  ngOnInit() {}

  ionViewDidEnter(): void {
    const code =
      this.homeService.homeElements()?.trackingElementModel?.code || '';
    if (code && this.trackingFrame) {
      this.trackingFrame.nativeElement.srcdoc = code;
    }
  }
}
