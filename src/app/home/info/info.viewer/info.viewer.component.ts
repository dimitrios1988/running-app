import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  IonToolbar,
  IonButton,
  IonTitle,
  IonHeader,
  IonContent,
  IonBackButton,
  IonButtons,
} from '@ionic/angular/standalone';
import { IInfoViewer } from './info.viewer.interface';
import { InfoViewerService } from './info.viewer.service';
import { Location } from '@angular/common';
import { InAppBrowser, DefaultWebViewOptions } from '@capacitor/inappbrowser';

@Component({
  selector: 'app-info.viewer',
  templateUrl: './info.viewer.component.html',
  styleUrls: ['./info.viewer.component.scss'],
  imports: [
    IonButtons,
    IonBackButton,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonContent,
    IonButton,
  ],
})
export class InfoViewerComponent implements AfterViewInit {
  @ViewChild('headerToolbar', { static: true, read: ElementRef })
  headerToolbar!: ElementRef<HTMLElement>;
  @ViewChild('infoButton', { static: false, read: ElementRef })
  infoButton?: ElementRef<HTMLElement>;
  info?: IInfoViewer;

  private activatedRoute = inject(ActivatedRoute);
  private location = inject(Location);
  private infoId: number;
  constructor(infoViewerService: InfoViewerService) {
    this.infoId = Number(this.activatedRoute.snapshot.paramMap.get('id'));
    this.info = infoViewerService.getInfo(this.infoId);
  }
  ngAfterViewInit(): void {
    this.initializeHeaderToolbarStyles();
    this.initializeInfoButtonStyles();
  }

  navigateToLink(link: string | null | undefined) {
    if (link) {
      window.open(link, '_blank', 'noopener,noreferrer');
      InAppBrowser.openInWebView({
        url: 'https://www.google.com',
        options: DefaultWebViewOptions,
      });
    }
  }

  goBack() {
    this.location.back();
  }

  initializeHeaderToolbarStyles() {
    const headerToolbarElement = this.headerToolbar?.nativeElement;
    if (!headerToolbarElement) return;
    if (
      this.info?.backgroundColor !== null &&
      this.info?.backgroundColor !== undefined &&
      this.info?.backgroundColor.trim() !== ''
    ) {
      headerToolbarElement.style.setProperty(
        '--background',
        this.info?.backgroundColor ?? ''
      );
    }
  }

  initializeInfoButtonStyles() {
    const infoButtonElement = this.infoButton?.nativeElement;
    if (!infoButtonElement) return;
    if (
      this.info?.backgroundColor !== null &&
      this.info?.backgroundColor !== undefined &&
      this.info?.backgroundColor.trim() !== ''
    ) {
      infoButtonElement.style.setProperty(
        '--background',
        this.info?.backgroundColor ?? ''
      );
    }
  }
}
