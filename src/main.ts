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
  // 1️⃣ Choose default language (you could make this dynamic later)
  const lang = 'en';
  const fallbackLang = 'en';

  // 2️⃣ Preload translations before Angular starts
  const translations = await preloadTranslations(lang);

  // 3️⃣ Bootstrap Angular + Ionic application
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
        lang,
        fallbackLang,
      }),
    ],
  });

  // 4️⃣ Inject TranslateService and set preloaded translations
  const translateService = appRef.injector.get(TranslateService);
  translateService.setTranslation(lang, translations, true);
  const settingsService = appRef.injector.get(SettingsService);
  settingsService.getSelectedLanguage().then((lang) => {
    if (lang) {
      translateService.use(lang).subscribe();
    } else {
      translateService.use(fallbackLang).subscribe(); // default language
    }
  });
})();
