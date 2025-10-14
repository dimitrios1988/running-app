import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
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
    IonTitle,
    IonContent,
    PageElementComponent,
  ],
})
export class HomePage implements OnInit, AfterViewInit {
  @ViewChild('headerToolbar', { static: true, read: ElementRef })
  headerToolbar!: ElementRef<HTMLElement>;
  infoChildElementModelArray: InfoChildElementModel[] = [
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

  headerElementModel?: HeaderElementModel;
  newsElementModel?: NewsElementModel;

  constructor(private homeService: HomeService) {
    addIcons({ settingsOutline });
  }

  ngOnInit(): void {
    this.headerElementModel = this.homeService.getHeaderElement('en');
    this.newsElementModel = this.homeService.getNewsElement('en');
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
    el.style.setProperty('padding', '10px');
  }
}
