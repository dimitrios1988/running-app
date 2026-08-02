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
@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, TranslatePipe],
})
export class TabsPage {
  public environmentInjector = inject(EnvironmentInjector);

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
