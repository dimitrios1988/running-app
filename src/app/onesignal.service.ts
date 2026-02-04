import { effect, inject, Injectable } from '@angular/core';
import OneSignal, { NotificationClickEvent } from 'onesignal-cordova-plugin';
import { ONESIGNAL } from './secrets';
import { SettingsService } from './settings/settings.service';
import { Router } from '@angular/router';
import { AuthService } from './auth/auth.service';

@Injectable({
  providedIn: 'root',
})
export class OneSignalService {
  private settingsService = inject(SettingsService);
  private authService = inject(AuthService);
  private router = inject(Router);

  constructor() {
    try {
      OneSignal.Debug.setLogLevel(6);
      OneSignal.initialize(ONESIGNAL.app_id);
      OneSignal.Notifications.requestPermission(false).then(
        (accepted: boolean) => {
          console.log('User accepted notifications: ' + accepted);
          this.settingsService.setNotificationsEnabled(accepted);
        },
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
        },
      );
    } catch (error) {
      //console.error('OneSignal initialization error:', error);
    }

    effect(() => {
      const selectedLanguage = this.settingsService.selectedLanguage$();
      if (selectedLanguage) {
        try {
          this.setSubscriberLanguage(selectedLanguage);
        } catch (error) {
          //console.error('OneSignal setLanguage error:', error);
        }
      }
    });

    effect(() => {
      const notificationsEnabled = this.settingsService.notificationsEnabled$();
      console.log(
        'OneSignalService notificationsEnabled effect:',
        notificationsEnabled,
      );
      if (notificationsEnabled) {
        OneSignal.Notifications.requestPermission(false).then(
          (accepted: boolean) => {
            console.log('User accepted notifications: ' + accepted);
            OneSignal.User.pushSubscription.optIn();
          },
          (error: any) => {
            console.error('OneSignal requestPermission error:', error);
          },
        );
      } else {
        try {
          OneSignal.User.pushSubscription.optOut();
        } catch (error) {
          console.error('OneSignal optOut error:', error);
        }
      }
    });

    effect(() => {
      const userPayload = this.authService.userPayload();
      if (userPayload) {
        this.setSubscriberUUID(userPayload.uuid);
      } else {
        this.logoutSubscriber();
      }
    });
  }

  setSubscriberLanguage(lang: string) {
    try {
      OneSignal.User.setLanguage(lang);
    } catch (error) {
      //console.error('OneSignal setLanguage error:', error);
    }
  }

  setSubscriberUUID(uuid: string) {
    try {
      OneSignal.login(uuid);
    } catch (error) {}
  }

  logoutSubscriber() {
    try {
      OneSignal.logout();
    } catch (error) {}
  }
}
