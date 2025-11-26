import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
} from '@angular/core';
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
import { HeaderElementModel } from './entities/header-element.interface';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import {
  CountdownTimerElementModel,
  InfoParentElementModel,
  NewsElementModel,
  PageElementModel,
  TrackingElementModel,
} from '../shared/page.element/page.element.model';
import { TranslateService } from '@ngx-translate/core';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private homeService = inject(HomeService);
  private router = inject(Router);
  private translateService = inject(TranslateService);

  // Observables converted to signals
  readonly headerElementModel = toSignal<HeaderElementModel | undefined>(
    this.homeService.getHeaderElement(this.translateService.getCurrentLang()),
    { initialValue: undefined }
  );
  readonly newsElementModel = toSignal<NewsElementModel | undefined>(
    this.homeService.getNewsElement(this.translateService.getCurrentLang()),
    { initialValue: undefined }
  );
  readonly trackingElementModel = toSignal<TrackingElementModel | undefined>(
    this.homeService.getTrackingElement(this.translateService.getCurrentLang()),
    { initialValue: undefined }
  );
  readonly infoParentElementModel = toSignal<
    InfoParentElementModel | undefined
  >(
    this.homeService.getInfoParentElement(
      this.translateService.getCurrentLang()
    ),
    { initialValue: undefined }
  );
  readonly countdowntimerElementModels = toSignal<
    CountdownTimerElementModel[] | undefined
  >(this.homeService.getCountdowntimerElements(), { initialValue: undefined });

  // CSS variables for toolbar images
  readonly mainImageWidth = computed(
    () => this.headerElementModel()?.mainImageWidth ?? '0px'
  );
  readonly secondaryImageWidth = computed(
    () => this.headerElementModel()?.secondaryImageWidth ?? '0px'
  );

  // Discriminated union array of page elements sorted by `order`
  readonly pageElementModel = computed<PageElementModel[]>(() => {
    const elements: PageElementModel[] = [];
    if (this.infoParentElementModel())
      elements.push(this.infoParentElementModel()!);
    if (this.newsElementModel()) elements.push(this.newsElementModel()!);
    if (this.trackingElementModel())
      elements.push(this.trackingElementModel()!);
    if (
      this.countdowntimerElementModels() !== undefined &&
      this.countdowntimerElementModels()!.length > 0
    ) {
      elements.push(...this.countdowntimerElementModels()!);
    }

    return elements.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  });

  constructor() {
    addIcons({ settingsOutline });
  }

  navigateToSettings() {
    void this.router.navigate(['/tabs/home/settings']);
  }
}
