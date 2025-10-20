import { Component, inject, OnInit } from '@angular/core';
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
} from '@ionic/angular/standalone';
import { Location, AsyncPipe } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SettingsService } from './settings.service';

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
    IonItem,
    IonSelect,
    IonSelectOption,
    AsyncPipe,
    TranslatePipe,
  ],
})
export class SettingsComponent implements OnInit {
  private location = inject(Location);
  private settingsService = inject(SettingsService);
  currentLang: Promise<string | null>;

  constructor(private translate: TranslateService) {
    this.currentLang =
      this.settingsService.getSelectedLanguage() || Promise.resolve('en');
  }

  goBack() {
    this.location.back();
  }

  ngOnInit() {}

  selectedLanguageChanged(lang: string) {
    this.settingsService.setSelectedLanguage(lang).then(() => {
      // Language preference saved
      this.switchLanguage(lang);
    });
  }

  switchLanguage(lang: string) {
    this.translate.use(lang).subscribe(() => {
      //this.currentLang = lang;
      // Optionally persist to storage and update Ionic RTL if needed
    });
  }
}
