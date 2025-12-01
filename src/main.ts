import { bootstrapApplication } from '@angular/platform-browser';
import {
  RouteReuseStrategy,
  provideRouter,
  withPreloading,
  PreloadAllModules,
} from '@angular/router';
import {
  IonicRouteStrategy,
  provideIonicAngular,
} from '@ionic/angular/standalone';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { provideHttpClient } from '@angular/common/http';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { SettingsService } from './app/settings/settings.service';
import { AppConfigurationService } from './app/app.configuration.service';

/**
 * Preloads a translation file before bootstrapping Angular.
 */
async function preloadTranslations(
  lang: string
): Promise<Record<string, string>> {
  const response = await fetch(`/assets/i18n/${lang}.json`);
  if (!response.ok) {
    console.error(`Failed to preload translations for ${lang}`);
    return {};
  }
  return await response.json();
}

(async () => {
  const appRef = await bootstrapApplication(AppComponent, {
    providers: [
      { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
      provideIonicAngular(),
      provideRouter(routes, withPreloading(PreloadAllModules)),
      provideHttpClient(),
      provideTranslateService({
        loader: provideTranslateHttpLoader({
          prefix: '/assets/i18n/',
          suffix: '.json',
        }),
        //lang,
        //fallbackLang,
      }),
    ],
  });

  const appConfigurationService = appRef.injector.get(AppConfigurationService);
  const defaultLanguage =
    appConfigurationService.appConfiguration.defaultLanguage;
  const suppportedLanguages =
    appConfigurationService.appConfiguration.supportedLanguages;
  const translateService = appRef.injector.get(TranslateService);
  translateService.setFallbackLang(defaultLanguage.code);

  suppportedLanguages
    .filter((lang) => lang.code != defaultLanguage.code)
    .forEach(async (lang) => {
      let translations = await preloadTranslations(lang.code);
      translateService.setTranslation(lang.code, translations, false);
    });
  const settingsService = appRef.injector.get(SettingsService);
  settingsService.getSelectedLanguage().then((selectedLang) => {
    if (
      selectedLang &&
      suppportedLanguages.some((lang) => lang.code === selectedLang)
    ) {
      translateService.use(selectedLang).subscribe();
      if (suppportedLanguages.some((lang) => lang.code === selectedLang)) {
        translateService.use(selectedLang).subscribe();
      } else if (
        suppportedLanguages.some(
          (lang) => lang.code === translateService.getBrowserLang()
        )
      ) {
        translateService.use(translateService.getBrowserLang()!).subscribe();
        settingsService.setSelectedLanguage(translateService.getBrowserLang()!);
      } else {
        settingsService.setSelectedLanguage(defaultLanguage.code);
        translateService.use(defaultLanguage.code).subscribe();
      }
    } else {
      settingsService.setSelectedLanguage(defaultLanguage.code);
      translateService.use(defaultLanguage.code).subscribe();
    }
  });
})();
