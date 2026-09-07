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
import {
  languageOutline,
  notificationsOutline,
  trashOutline,
} from 'ionicons/icons';
import { Location } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SettingsService } from './settings.service';
import { AppConfigurationService } from '../app.configuration.service';
import { ToastService } from '../shared/services/toast.service';
import { CacheStorageService } from '../shared/cache/cache-storage.service';
import { IonButton } from '@ionic/angular/standalone';

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
    IonButton,
    TranslatePipe,
  ],
})
export class SettingsComponent {
  private location = inject(Location);
  private settingsService = inject(SettingsService);
  private toastService = inject(ToastService);
  private translate = inject(TranslateService);
  private cache = inject(CacheStorageService);
  clearingCache = false;
  public appConfiguration = inject(AppConfigurationService).appConfiguration;
  currentLang = this.settingsService.selectedLanguage$;
  notificationsEnabled = this.settingsService.notificationsEnabled$;

  constructor() {
    addIcons({ languageOutline, notificationsOutline, trashOutline });
  }

  /**
   * Escape hatch for "it is showing me old content". The cache revalidates on
   * its own, so this exists for the rare case where a cached copy is wrong
   * rather than merely stale.
   */
  async clearCache(): Promise<void> {
    if (this.clearingCache) {
      return;
    }
    this.clearingCache = true;
    try {
      await this.cache.clearAll();
      this.toastService.showSuccess(
        this.translate.instant('SETTINGS.CACHE_CLEARED'),
      );
    } finally {
      this.clearingCache = false;
    }
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
