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
      // Enable verbose logging for debugging (remove in production)
      OneSignal.Debug.setLogLevel(6);
      // Initialize with your OneSignal App ID
      OneSignal.initialize(ONESIGNAL.app_id);
      // Use this method to prompt for push notifications.
      // We recommend removing this method after testing and instead use In-App Messages to prompt for notification permission.
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
      //this.router.navigate([`/tabs/notifications/viewer/1`]);
      //console.error('OneSignal initialization error:', error);
    }

    effect(() => {
      const selectedLanguage = this.settingsService.selectedLanguage$();
      try {
        OneSignal.User.setLanguage(selectedLanguage || 'en');
      } catch (error) {
        //console.error('OneSignal setLanguage error:', error);
      }
    });
  }
}
