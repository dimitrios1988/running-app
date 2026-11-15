import { Component, EnvironmentInjector, inject } from '@angular/core';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  home,
  homeOutline,
  notifications,
  notificationsOutline,
  person,
  personOutline,
} from 'ionicons/icons';
import { TranslatePipe } from '@ngx-translate/core';
import { FeatureFlagsService } from '../client/feature-flags.service';
@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, TranslatePipe],
})
export class TabsPage {
  public environmentInjector = inject(EnvironmentInjector);

  /** The "My Registration" tab is optional per client (feature flag `myRace`). */
  public readonly myRaceEnabled = inject(FeatureFlagsService).isEnabled('myRace');

  constructor() {
    addIcons({
      home,
      homeOutline,
      person,
      personOutline,
      notifications,
      notificationsOutline,
    });
  }
}
