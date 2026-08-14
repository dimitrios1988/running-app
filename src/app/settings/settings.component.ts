import { Component, inject } from '@angular/core';
import {
  IonItem,
  IonList,
  IonSelect,
  IonSelectOption,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonContent,
  IonListHeader,
  IonLabel,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { languageOutline, notificationsOutline } from 'ionicons/icons';
import { Location } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SettingsService } from './settings.service';
import { AppConfigurationService } from '../app.configuration.service';
import { ToastService } from '../shared/services/toast.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonBackButton,
    IonButtons,
    IonToolbar,
    IonTitle,
    IonHeader,
    IonList,
    IonListHeader,
    IonLabel,
    IonIcon,
    IonItem,
    IonSelect,
    IonSelectOption,
    TranslatePipe,
  ],
})
export class SettingsComponent {
  private location = inject(Location);
  private settingsService = inject(SettingsService);
  private toastService = inject(ToastService);
  private translate = inject(TranslateService);
  public appConfiguration = inject(AppConfigurationService).appConfiguration;
  currentLang = this.settingsService.selectedLanguage$;
  notificationsEnabled = this.settingsService.notificationsEnabled$;

  constructor() {
    addIcons({ languageOutline, notificationsOutline });
  }

  goBack() {
    this.location.back();
  }

  selectedLanguageChanged(lang: string) {
    // The select is bound to currentLang(), so writing to the signal echoes
    // back through (ionChange). Ignore the echo.
    if (!lang || lang === this.currentLang()) {
      return;
    }
    this.settingsService.setSelectedLanguage(lang).then(() => {
      this.switchLanguage(lang);
    });
  }

  notificationsOptionChanged(enabled: boolean) {
    if (enabled === this.notificationsEnabled()) {
      return;
    }
    this.settingsService.setNotificationsEnabled(enabled);
  }

  switchLanguage(lang: string) {
    this.translate.use(lang).subscribe({
      error: (error) => {
        console.error(`[i18n] Failed to load translations for "${lang}"`, error);
        this.toastService.showError(
          this.translate.instant('SETTINGS.ERRORS.FAILED_TO_LOAD_LANGUAGE'),
        );
      },
    });
  }
}
