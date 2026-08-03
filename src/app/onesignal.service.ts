import { effect, inject, Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import OneSignal, { NotificationClickEvent } from '@onesignal/capacitor-plugin';
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

  private readonly isNative = Capacitor.isNativePlatform();

  constructor() {
    if (!this.isNative) {
      // OneSignalCapacitor has no web implementation, so every call throws
      // "plugin is not implemented on web". Skip the plugin entirely here.
      return;
    }

    OneSignal.Debug.setLogLevel(6);
    OneSignal.initialize(ONESIGNAL.app_id);
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

    effect(() => {
      const selectedLanguage = this.settingsService.selectedLanguage$();
      if (selectedLanguage) {
        this.setSubscriberLanguage(selectedLanguage);
      }
    });

    effect(() => {
      const notificationsEnabled = this.settingsService.notificationsEnabled$();
      this.syncPushSubscription(notificationsEnabled);

      const selectedLanguage = this.settingsService.selectedLanguage$();
      if (selectedLanguage) {
        this.setSubscriberLanguage(selectedLanguage);
      }
    });

    effect(() => {
      const userPayload = this.authService.userPayload();
      if (userPayload) {
        this.setSubscriberUUID(userPayload.uuid);
      } else {
        this.logoutSubscriber();
      }
      const selectedLanguage = this.settingsService.selectedLanguage$();
      if (selectedLanguage) {
        this.setSubscriberLanguage(selectedLanguage);
      }
    });
  }

  /**
   * Drives the OneSignal push subscription from the user's stored preference,
   * prompting for OS permission only when the user actively opts in.
   */
  private async syncPushSubscription(enabled: boolean): Promise<void> {
    if (!this.isNative) {
      return;
    }
    try {
      if (!enabled) {
        await OneSignal.User.pushSubscription.optOut();
        return;
      }
      if (!(await OneSignal.Notifications.hasPermission())) {
        // fallbackToSettings=true: send the user to the system settings if
        // they previously denied, since this toggle is an explicit opt-in.
        const accepted = await OneSignal.Notifications.requestPermission(true);
        if (!accepted) {
          // Reflect the denial back into the stored setting so the toggle
          // doesn't sit "on" while push is actually off.
          await this.settingsService.setNotificationsEnabled(false);
          return;
        }
      }
      await OneSignal.User.pushSubscription.optIn();
    } catch (error) {
      console.error('OneSignal push subscription sync failed:', error);
    }
  }

  async setSubscriberLanguage(lang: string): Promise<void> {
    if (!this.isNative) {
      return;
    }
    try {
      await OneSignal.User.setLanguage(lang);
    } catch (error) {
      console.error('OneSignal setLanguage failed:', error);
    }
  }

  async setSubscriberUUID(uuid: string): Promise<void> {
    if (!this.isNative) {
      return;
    }
    try {
      await OneSignal.login(uuid);
    } catch (error) {
      console.error('OneSignal login failed:', error);
    }
  }

  async logoutSubscriber(): Promise<void> {
    if (!this.isNative) {
      return;
    }
    try {
      await OneSignal.logout();
    } catch (error) {
      console.error('OneSignal logout failed:', error);
    }
  }
}
