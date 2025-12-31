import { Component, effect, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import OneSignal, { NotificationClickEvent } from 'onesignal-cordova-plugin';
import { ONESIGNAL } from './secrets';
import { SettingsService } from './settings/settings.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  private settingsService = inject(SettingsService);
  private router = inject(Router);
  constructor() {
    try {
      OneSignal.Debug.setLogLevel(6);
      OneSignal.initialize(ONESIGNAL.app_id);
      OneSignal.Notifications.requestPermission(false).then(
        (accepted: boolean) => {
          console.log('User accepted notifications: ' + accepted);
        }
      );
      OneSignal.Notifications.addEventListener(
        'click',
        (event: NotificationClickEvent) => {
          const additionalData = event.notification.additionalData as {
            deeplink?: string;
          };
          const deeplink = additionalData.deeplink;
          if (deeplink) {
            this.router.navigate([`/tabs/notifications/viewer/${deeplink}`]);
          }
        }
      );
    } catch (error) {
      //console.error('OneSignal initialization error:', error);
    }

    effect(() => {
      const selectedLanguage = this.settingsService.selectedLanguage$();
      if (selectedLanguage) {
        try {
          OneSignal.User.setLanguage(selectedLanguage);
        } catch (error) {
          //console.error('OneSignal setLanguage error:', error);
        }
      }
    });
  }
}
