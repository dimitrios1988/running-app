import { effect, inject, Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import OneSignal, { NotificationClickEvent } from '@onesignal/capacitor-plugin';
import { AlertController } from '@ionic/angular/standalone';
import { TranslateService } from '@ngx-translate/core';
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
  private alertController = inject(AlertController);
  private translateService = inject(TranslateService);

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
        const additionalData = event.notification.additionalData as
          | { deeplink?: string }
          | undefined;
        const deeplink = additionalData?.deeplink;
        if (!deeplink) {
          return;
        }
        // The viewer resolves the segment with Number(id), so a non-numeric
        // payload would silently fetch NaN. Fall back to the list instead.
        const notificationId = Number(deeplink);
        if (Number.isFinite(notificationId)) {
          this.router.navigate([`/tabs/notifications/viewer/${notificationId}`]);
        } else {
          console.warn(
            `OneSignal deeplink "${deeplink}" is not a notification id; opening the list.`,
          );
          this.router.navigate(['/tabs/notifications']);
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
      // null means the stored preference hasn't loaded yet. Syncing on it would
      // opt the subscriber out on every cold start, then back in a tick later.
      if (notificationsEnabled !== null) {
        this.syncPushSubscription(notificationsEnabled);
      }

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
   * Shows a one-time in-app opt-in prompt on the very first launch.
   *
   * This is deliberately a "soft ask" rather than the OS dialog: iOS presents
   * its permission prompt exactly once per install, and a denial there is
   * unrecoverable short of sending the user into system settings. Asking in-app
   * first means a user who isn't interested costs us nothing — they can still
   * opt in later from Settings, with the OS prompt still available.
   *
   * Only the stored preference is written here; the effect above reacts to it
   * and runs the actual permission request through syncPushSubscription().
   */
  async promptForNotificationsOnFirstLaunch(): Promise<void> {
    if (!this.isNative) {
      return;
    }
    try {
      // Without this the prompt could resolve before the stored preference
      // loads, and the late load would overwrite the user's fresh choice.
      await this.settingsService.ready;

      if (await this.settingsService.hasSeenNotificationsPrompt()) {
        return;
      }
      // Recorded before presenting, so being force-quit mid-dialog doesn't
      // re-prompt on every subsequent launch.
      await this.settingsService.markNotificationsPromptSeen();

      const alert = await this.alertController.create({
        header: this.translateService.instant('NOTIFICATIONS_PROMPT.TITLE'),
        message: this.translateService.instant('NOTIFICATIONS_PROMPT.MESSAGE'),
        backdropDismiss: false,
        buttons: [
          {
            text: this.translateService.instant('NOTIFICATIONS_PROMPT.NOT_NOW'),
            role: 'cancel',
          },
          {
            text: this.translateService.instant('NOTIFICATIONS_PROMPT.ENABLE'),
            role: 'enable',
          },
        ],
      });

      await alert.present();
      const { role } = await alert.onDidDismiss();
      if (role === 'enable') {
        // Declining needs no write: the preference already defaults to false.
        await this.settingsService.setNotificationsEnabled(true);
      }
    } catch (error) {
      console.error('OneSignal first-launch prompt failed:', error);
    }
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
