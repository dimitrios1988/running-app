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
import { Location } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';

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
  ],
})
export class SettingsComponent implements OnInit {
  private location = inject(Location);
  currentLang: string;

  constructor(private translate: TranslateService) {
    this.currentLang = translate.getCurrentLang() || 'en';
  }

  goBack() {
    this.location.back();
  }

  ngOnInit() {}

  switchLanguage(lang: string) {
    this.translate.use(lang).subscribe(() => {
      this.currentLang = lang;
      // Optionally persist to storage and update Ionic RTL if needed
    });
  }
}
