import {
  Component,
  ChangeDetectionStrategy,
  inject,
  effect,
  OnDestroy,
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
import { Router } from '@angular/router';
import {
  HeaderElementModel,
  PageElementModel,
} from '../shared/page.element/page.element.model';
import { SettingsService } from '../settings/settings.service';
import { forkJoin, mergeMap, Subscription, tap } from 'rxjs';

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
  private settingsService = inject(SettingsService);
  private sub: Subscription = Subscription.EMPTY;
  pageElementModels: PageElementModel[] = [];
  headerElementModel?: HeaderElementModel;

  constructor() {
    addIcons({ settingsOutline });
    effect(() => {
      const currentLang = this.settingsService.selectedLanguage$();
      if (!currentLang) return;
      const homeElementModel$ = this.homeService.getHomeElements(currentLang);

      this.sub = homeElementModel$
        .pipe(
          tap((model) => {
            if (!model) return;
            this.headerElementModel = model.headerElementModel
              ? model.headerElementModel
              : undefined;
            this.pageElementModels = [
              ...(model.newsElementModel ? [model.newsElementModel] : []),
              ...(model.countdownTimerElementModels ?? []),
              ...(model.contentImageElementModels ?? []),
              ...(model.trackingElementModel
                ? [model.trackingElementModel]
                : []),
              ...(model.infoParentElementModel
                ? [model.infoParentElementModel]
                : []),
            ].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          })
        )
        .subscribe();
    });
  }
  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  navigateToSettings() {
    void this.router.navigate(['/tabs/home/settings']);
  }
}
