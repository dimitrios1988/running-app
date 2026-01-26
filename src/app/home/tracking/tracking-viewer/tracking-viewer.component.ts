import { Component, effect, inject, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
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
  private readonly sanitizer = inject(DomSanitizer);
  sanitizedUrl: SafeResourceUrl =
    this.sanitizer.bypassSecurityTrustResourceUrl('');

  constructor() {
    effect(() => {
      const tracking_link =
        this.homeService.homeElements()?.trackingElementModel?.link || '';
      this.sanitizedUrl =
        this.sanitizer.bypassSecurityTrustResourceUrl(tracking_link);
    });
  }

  ngOnInit() {}
}
