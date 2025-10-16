import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonIcon,
  IonButton,
  IonButtons,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { settingsOutline } from 'ionicons/icons';
import { PageElementComponent } from '../shared/page.element/page.element.component';
import { InfoChildElementModel } from './info/info-child/info-child-element.interface';
import { HomeService } from './home.service';
import { HeaderElementModel } from './entities/header-element.interface';
import { NewsElementModel } from './news/news-element.interface';
import { Router } from '@angular/router';
import { TrackingElementModel } from './tracking/tracking-element.interface';

@Component({
  selector: 'home-tab',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    IonButtons,
    IonButton,
    IonIcon,
    IonHeader,
    IonToolbar,
    IonContent,
    PageElementComponent,
  ],
})
export class HomePage implements OnInit, AfterViewInit {
  @ViewChild('headerToolbar', { static: true, read: ElementRef })
  headerToolbar!: ElementRef<HTMLElement>;

  infoChildElementModelArray!: InfoChildElementModel[];
  headerElementModel?: HeaderElementModel;
  newsElementModel?: NewsElementModel;
  trackingElementModel?: TrackingElementModel;

  private router = inject(Router);

  constructor(private homeService: HomeService) {
    addIcons({ settingsOutline });
  }

  ngOnInit(): void {
    this.headerElementModel = this.homeService.getHeaderElement('en');
    this.newsElementModel = this.homeService.getNewsElement('en');
    this.infoChildElementModelArray =
      this.homeService.getInfoChildElements('en');
    this.trackingElementModel = this.homeService.getTrackingElement('en');
  }

  ngAfterViewInit(): void {
    this.initializeHeaderToolbarStyles();
  }

  initializeHeaderToolbarStyles() {
    const el = this.headerToolbar?.nativeElement;
    if (!el) return;
    el.style.setProperty(
      '--background',
      this.headerElementModel?.backgroundColor ?? ''
    );
    el.style.setProperty(
      '--main-image-width',
      this.headerElementModel?.mainImageWidth ?? '0px'
    );
    el.style.setProperty(
      '--secondary-image-width',
      this.headerElementModel?.secondaryImageWidth ?? '0px'
    );
  }

  navigateToSettings() {
    this.router.navigate(['/tabs/home/settings']);
  }
}
