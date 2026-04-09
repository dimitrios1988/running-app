import {
  Component,
  inject,
  effect,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
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
import { chevronDownCircleOutline, settingsOutline } from 'ionicons/icons';
import { PageElementComponent } from '../shared/page.element/page.element.component';
import { HomeService } from './home.service';
import { Router } from '@angular/router';
import {
  HeaderElementModel,
  HomeElementModel,
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
  @ViewChild('homepageToolbar', { read: ElementRef })
  homepageToolbarElement!: ElementRef;
  pageElementModels: PageElementModel[] = [];
  headerElementModel?: HeaderElementModel;
  homeElementModel: HomeElementModel | null = null;

  constructor() {
    addIcons({ settingsOutline, chevronDownCircleOutline });
    effect(() => {
      this.homeElementModel = this.homeService.homeElements();
      if (this.homeElementModel) {
        this.populateHomeElements();
      }
    });
  }

  ionViewWillEnter(): void {
    this.homeElementsSub.unsubscribe();
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
    if (this.homeElementModel) {
      this.headerElementModel = this.homeElementModel.headerElementModel
        ? this.homeElementModel.headerElementModel
        : undefined;
      this.pageElementModels = [
        ...(this.homeElementModel.newsElementModel
          ? [this.homeElementModel.newsElementModel]
          : []),
        ...(this.homeElementModel.countdownTimerElementModels ?? []),
        ...(this.homeElementModel.contentImageElementModels ?? []),
        ...(this.homeElementModel.linkElementModels ?? []),
        ...(this.homeElementModel.trackingElementModel
          ? [this.homeElementModel.trackingElementModel]
          : []),
        ...(this.homeElementModel.infoParentElementModel
          ? [this.homeElementModel.infoParentElementModel]
          : []),
      ].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    if (
      this.headerElementModel?.backgroundColor &&
      this.headerElementModel?.backgroundColor.trim() !== ''
    ) {
      this.homepageToolbarElement?.nativeElement.style.setProperty(
        '--background',
        this.headerElementModel?.backgroundColor,
      );
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
