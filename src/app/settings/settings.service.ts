import { computed, Injectable, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private selectedLanguage = signal<string | null>(null);

  // Expose the signal as a computed property
  selectedLanguage$ = computed(() => this.selectedLanguage());

  constructor() {
    this.initLanguage();
  }

  private async initLanguage() {
    const lang = await Preferences.get({ key: 'selectedLanguage' });
    if (lang.value) {
      this.selectedLanguage.set(lang.value);
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
}
