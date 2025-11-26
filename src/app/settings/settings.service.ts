import { inject, Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { AppConfigurationService } from '../app.configuration.service';

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
