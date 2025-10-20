import { inject, Provider } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export const preloadTranslations: Provider = {
  provide: 'PRELOAD_TRANSLATIONS',
  useFactory: async () => {
    const translate = inject(TranslateService);

    // Load your default/fallback language
    await translate.use('en');

    // Optionally, preload additional languages
    await translate.addLangs(['el']);

    return true;
  },
};
