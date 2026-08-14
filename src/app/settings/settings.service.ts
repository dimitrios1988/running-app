import { computed, Injectable, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private selectedLanguage = signal<string | null>(null);
  /**
   * `null` means "not yet loaded from Preferences" — distinct from `false`.
   * Consumers must treat it as unknown, otherwise they act on a default that
   * the stored preference is about to contradict. See OneSignalService.
   */
  private notificationsEnabled = signal<boolean | null>(null);

  // Expose the signal as a computed property
  selectedLanguage$ = computed(() => this.selectedLanguage());
  notificationsEnabled$ = computed(() => this.notificationsEnabled());

  /**
   * Resolves once the stored preferences have been read. Await this before
   * acting on `notificationsEnabled$`, otherwise a late init can overwrite a
   * choice the user just made. See OneSignalService's first-launch prompt.
   */
  readonly ready: Promise<void>;

  constructor() {
    // The selected language is resolved and applied by initializeLanguage(),
    // which runs as an app initializer and calls setSelectedLanguage().
    this.ready = this.initNotifications();
  }

  private async initNotifications() {
    try {
      const notif = await Preferences.get({ key: 'notificationsEnabled' });
      // Always resolve to an explicit boolean: nothing stored means a first
      // launch, which is "off" rather than "unknown".
      this.notificationsEnabled.set(notif.value === 'true');
    } catch (error) {
      console.error('Failed to read the notifications preference:', error);
      // Leaving the signal at null would strand push sync forever.
      this.notificationsEnabled.set(false);
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

  /**
   * Whether the one-time first-launch notification opt-in prompt has been
   * shown. Kept separate from `notificationsEnabled` so that declining the
   * prompt is distinguishable from never having been asked.
   */
  async hasSeenNotificationsPrompt(): Promise<boolean> {
    const seen = await Preferences.get({ key: 'notificationsPromptSeen' });
    return seen.value === 'true';
  }

  async markNotificationsPromptSeen(): Promise<void> {
    await Preferences.set({
      key: 'notificationsPromptSeen',
      value: 'true',
    });
  }
}
