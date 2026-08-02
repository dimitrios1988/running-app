import { provideAppInitializer, provideZoneChangeDetection } from "@angular/core";
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
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { AuthInterceptor } from './app/auth/auth.interceptor';
import { HttpRetryInterceptor } from './app/httpretry.interceptor';
import { initializeLanguage } from './app/i18n/initialize-language';

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection(),{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptorsFromDi()),
    provideTranslateService({
      loader: provideTranslateHttpLoader({
        prefix: '/assets/i18n/',
        suffix: '.json',
        // Load the bundled catalogs straight off HttpBackend. They are local
        // assets, so they need neither the auth header nor the retry backoff,
        // and going through the interceptors breaks them inside the Capacitor
        // WebView.
        useHttpBackend: true,
      }),
    }),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HttpRetryInterceptor,
      multi: true,
    },
    provideAppInitializer(initializeLanguage),
  ],
});
