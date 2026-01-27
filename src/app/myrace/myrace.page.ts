import {
  Component,
  effect,
  inject,
  OnDestroy,
  OnInit,
  EffectRef,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonCardHeader,
  IonCard,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { exitOutline } from 'ionicons/icons';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MyRaceService } from './myrace.service';
import { IRunner } from './runner.interface';
import { SettingsService } from '../settings/settings.service';
import { IonRefresherCustomEvent, RefresherEventDetail } from '@ionic/core';

@Component({
  selector: 'app-myrace',
  templateUrl: './myrace.page.html',
  styleUrls: ['./myrace.page.scss'],
  standalone: true,
  imports: [
    IonRefresherContent,
    IonRefresher,
    IonCardContent,
    IonCardSubtitle,
    IonCardTitle,
    IonCard,
    IonCardHeader,
    IonIcon,
    IonButtons,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonButton,
    TranslatePipe,
  ],
})
export class MyracePage implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private settingsService = inject(SettingsService);
  private myRaceService = inject(MyRaceService);
  private router = inject(Router);
  private stopEffect?: EffectRef;
  private runnerSub: Subscription = Subscription.EMPTY;
  runnerInfo!: IRunner;

  constructor() {
    addIcons({ exitOutline });
    this.stopEffect = effect(() => {
      const runnerInfo = this.myRaceService.runner$();
      if (runnerInfo) {
        this.runnerInfo = runnerInfo;
      }
    });
  }

  ngOnDestroy(): void {
    this.stopEffect?.destroy?.();
    this.runnerSub?.unsubscribe();
  }

  ionViewWillEnter(): void {
    const uuid = this.authService.getRunnerUUID();
    if (uuid) {
      this.runnerSub = this.myRaceService.getRunnerInfo(uuid).subscribe();
    }
  }

  ionViewWillLeave(): void {
    this.stopEffect?.destroy?.();
    this.runnerSub?.unsubscribe();
  }

  ngOnInit() {}

  logoutRunner() {
    this.authService.logoutRunner().then(() => {
      this.router.navigate(['/tabs/login']);
    });
  }

  getPlaceName() {
    return this.settingsService.selectedLanguage$() === 'el'
      ? this.runnerInfo.place.nameGr
      : this.runnerInfo.place.nameEn;
  }
  getEventName() {
    return this.settingsService.selectedLanguage$() === 'el'
      ? this.runnerInfo.event.nameGr
      : this.runnerInfo.event.nameEn;
  }

  doRefresh(event: IonRefresherCustomEvent<RefresherEventDetail>) {
    this.runnerSub.unsubscribe();
    this.runnerSub = this.myRaceService
      .getRunnerInfo(this.runnerInfo.runner.uuid)
      .subscribe(() => {
        (event.target as HTMLIonRefresherElement)?.complete();
      });
  }
}
