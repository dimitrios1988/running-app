import { Component, inject, effect, OnDestroy } from '@angular/core';
import {
  IonButtons,
  IonButton,
  IonIcon,
  IonHeader,
  IonToolbar,
  IonContent,
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

@Component({
  selector: 'home-tab',
  standalone: true,
  imports: [
    IonButtons,
    IonButton,
    IonIcon,
    IonHeader,
    IonToolbar,
    IonContent,
    PageElementComponent,
  ],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnDestroy {
  private homeService = inject(HomeService);
  private router = inject(Router);
  private sub: Subscription = Subscription.EMPTY;
  pageElementModels: PageElementModel[] = [];
  headerElementModel?: HeaderElementModel;

  constructor() {
    addIcons({ settingsOutline });
    effect(() => {
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
    });
  }
  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  navigateToSettings() {
    void this.router.navigate(['/tabs/home/settings']);
  }
}
