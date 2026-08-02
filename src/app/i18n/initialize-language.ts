import { inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { SettingsService } from '../settings/settings.service';
import { AppConfigurationService } from '../app.configuration.service';

/**
 * Resolves the language to start the app with and loads its catalog before the
 * first render. Runs as an app initializer, so bootstrap blocks until the
 * translations are in the store.
 *
 * Precedence: the language the user picked previously, then the device locale,
 * then the configured default.
 */
export function initializeLanguage(): Promise<void> {
  const translate = inject(TranslateService);
  const settings = inject(SettingsService);
  const { defaultLanguage, supportedLanguages } = inject(
    AppConfigurationService,
  ).appConfiguration;

  return (async () => {
    const codes = supportedLanguages.map((language) => language.code);
    const stored = await settings.getSelectedLanguage();
    // getBrowserLang() normalises the device locale, e.g. "el-GR" -> "el"
    const device = translate.getBrowserLang();

    let lang = defaultLanguage.code;
    if (stored && codes.includes(stored)) {
      lang = stored;
    } else if (device && codes.includes(device)) {
      lang = device;
    }

    translate.setFallbackLang(defaultLanguage.code);
    // Persists the choice and populates the signal the language effects read.
    await settings.setSelectedLanguage(lang);

    try {
      await firstValueFrom(translate.use(lang));
    } catch (error) {
      // Never block bootstrap on a failed catalog load - the fallback language
      // still renders, and a cold start offline must not hang on a white screen.
      console.error(`[i18n] Failed to load translations for "${lang}"`, error);
    }
  })();
}
