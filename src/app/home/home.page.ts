import {
  Component,
  ChangeDetectionStrategy,
  inject,
  effect,
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
import { Router } from '@angular/router';
import { PageElementModel } from '../shared/page.element/page.element.model';
import { SettingsService } from '../settings/settings.service';
import { forkJoin, mergeMap, tap } from 'rxjs';

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
  private settingsService = inject(SettingsService);
  pageElementModels: PageElementModel[] = [];
  headerElementModel?: HeaderElementModel;

  constructor() {
    addIcons({ settingsOutline });
    effect(() => {
      const currentLang = this.settingsService.selectedLanguage$();
      if (!currentLang) return;
      const headerElementModel$ =
        this.homeService.getHeaderElement(currentLang);
      const newsElementModel$ = this.homeService.getNewsElement(currentLang);
      const trackingElementModel$ =
        this.homeService.getTrackingElement(currentLang);
      const infoParentElementModel$ =
        this.homeService.getInfoParentElement(currentLang);
      const countdowntimerElementModels$ =
        this.homeService.getCountdowntimerElements(currentLang);
      const contentImageElementModels$ =
        this.homeService.getContentImageElements(currentLang);

      headerElementModel$
        .pipe(
          tap((model) => {
            this.headerElementModel = model!;
          })
        )
        .subscribe();
      const pageElementModels$ = [
        newsElementModel$,
        trackingElementModel$,
        infoParentElementModel$,
        countdowntimerElementModels$.pipe(mergeMap((arr) => arr || [])),
        contentImageElementModels$.pipe(mergeMap((arr) => arr || [])),
      ];
      forkJoin(pageElementModels$).subscribe((value) => {
        this.pageElementModels = value.sort(
          (a, b) => (a.order ?? 0) - (b.order ?? 0)
        );
      });
    });
  }

  navigateToSettings() {
    void this.router.navigate(['/tabs/home/settings']);
  }
}
