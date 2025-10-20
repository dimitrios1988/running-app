import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  constructor() {}

  async getSelectedLanguage() {
    const selectedLanguage = await Preferences.get({
      key: 'selectedLanguage',
    });
    return selectedLanguage.value;
  }

  setSelectedLanguage(lang: string): Promise<void> {
    return Preferences.set({
      key: 'selectedLanguage',
      value: lang,
    });
  }
}
