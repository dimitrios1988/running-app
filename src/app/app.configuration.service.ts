import { Injectable } from '@angular/core';
import { IAppConfiguration } from './app.configuration.interface';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AppConfigurationService {
  appConfiguration!: IAppConfiguration;
  constructor() {
    this.getAppConfiguration().subscribe((conf) => {
      this.appConfiguration = conf;
    });
  }

  private getAppConfiguration(): Observable<IAppConfiguration> {
    return new Observable<IAppConfiguration>((observer) => {
      const config = {
        defaultLanguage: { name: 'English', code: 'en' },
        supportedLanguages: [
          { name: 'English', code: 'en' },
          { name: 'Greek', code: 'el' },
        ],
      };
      observer.next(config);
      observer.complete();
    });
  }
}
