import { computed, Injectable, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private selectedLanguage = signal<string | null>(null);
  private notificationsEnabled = signal<boolean>(false);

  // Expose the signal as a computed property
  selectedLanguage$ = computed(() => this.selectedLanguage());
  notificationsEnabled$ = computed(() => this.notificationsEnabled());

  constructor() {
    // The selected language is resolved and applied by initializeLanguage(),
    // which runs as an app initializer and calls setSelectedLanguage().
    this.initNotifications();
  }

  private async initNotifications() {
    const notif = await Preferences.get({ key: 'notificationsEnabled' });
    if (notif.value) {
      this.notificationsEnabled.set(notif.value === 'true');
    }
  }

  async setSelectedLanguage(lang: string): Promise<void> {
    this.selectedLanguage.set(lang);
    await Preferences.set({
      key: 'selectedLanguage',
      value: lang,
    });
  }

  async getSelectedLanguage(): Promise<string | null> {
    const lang = await Preferences.get({ key: 'selectedLanguage' });
    return lang.value;
  }

  async setNotificationsEnabled(enabled: boolean): Promise<void> {
    this.notificationsEnabled.set(enabled);
    await Preferences.set({
      key: 'notificationsEnabled',
      value: String(enabled),
    });
  }
}
