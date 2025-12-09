import { Component, EnvironmentInjector, inject } from '@angular/core';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonBadge,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { ellipse, home, notifications } from 'ionicons/icons';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [
    IonBadge,
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel,
    TranslatePipe,
  ],
})
export class TabsPage {
  public environmentInjector = inject(EnvironmentInjector);
  private router = inject(Router);

  constructor() {
    addIcons({ home, ellipse, notifications });
  }
}
