import { Component, inject, effect, OnDestroy } from '@angular/core';
import {
  IonButtons,
  IonButton,
  IonIcon,
  IonHeader,
  IonToolbar,
  IonContent,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { settingsOutline } from 'ionicons/icons';
import { PageElementComponent } from '../shared/page.element/page.element.component';
import { HomeService } from './home.service';
import { Router } from '@angular/router';
import {
  HeaderElementModel,
  PageElementModel,
} from '../shared/page.element/page.element.model';
import { Subscription } from 'rxjs';
import { SettingsService } from '../settings/settings.service';
import { IonRefresherCustomEvent, RefresherEventDetail } from '@ionic/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'home-tab',
  standalone: true,
  imports: [
    IonRefresherContent,
    IonRefresher,
    IonButtons,
    IonButton,
    IonIcon,
    IonHeader,
    IonToolbar,
    IonContent,
    PageElementComponent,
    TranslatePipe,
  ],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnDestroy {
  private homeService = inject(HomeService);
  private router = inject(Router);
  private settingsService = inject(SettingsService);
  private homeElementsSub: Subscription = Subscription.EMPTY;
  pageElementModels: PageElementModel[] = [];
  headerElementModel?: HeaderElementModel;

  constructor() {
    addIcons({ settingsOutline });
    effect(() => {
      this.homeElementsSub.unsubscribe();
      this.populateHomeElements();
    });
  }

  ionViewWillEnter(): void {
    this.homeElementsSub = this.homeService
      .getHomeElements(this.settingsService.selectedLanguage$()!)
      .subscribe();
    this.populateHomeElements();
  }

  ionViewWillLeave(): void {
    this.homeElementsSub.unsubscribe();
  }

  ngOnDestroy(): void {
    this.homeElementsSub.unsubscribe();
  }

  navigateToSettings() {
    void this.router.navigate(['/tabs/home/settings']);
  }

  populateHomeElements(): void {
    const homeElements = this.homeService.homeElements();
    if (homeElements) {
      this.headerElementModel = homeElements.headerElementModel
        ? homeElements.headerElementModel
        : undefined;
      this.pageElementModels = [
        ...(homeElements.newsElementModel
          ? [homeElements.newsElementModel]
          : []),
        ...(homeElements.countdownTimerElementModels ?? []),
        ...(homeElements.contentImageElementModels ?? []),
        ...(homeElements.trackingElementModel
          ? [homeElements.trackingElementModel]
          : []),
        ...(homeElements.infoParentElementModel
          ? [homeElements.infoParentElementModel]
          : []),
      ].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
  }

  doRefresh(event: IonRefresherCustomEvent<RefresherEventDetail>) {
    this.homeElementsSub.unsubscribe();
    this.homeElementsSub = this.homeService
      .getHomeElements(this.settingsService.selectedLanguage$()!)
      .subscribe(() => {
        (event.target as HTMLIonRefresherElement)?.complete();
      });
    this.populateHomeElements();
  }
}
