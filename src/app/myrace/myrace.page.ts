import {
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  ElementRef,
  viewChild,
} from '@angular/core';
import { finalize, Subscription } from 'rxjs';
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
  IonRefresher,
  IonRefresherContent,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chevronDownCircleOutline,
  exitOutline,
  personCircleOutline,
  qrCodeOutline,
  alertCircle,
  checkmarkCircle,
} from 'ionicons/icons';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MyRaceService } from './myrace.service';
import { SettingsService } from '../settings/settings.service';
import { IonRefresherCustomEvent, RefresherEventDetail } from '@ionic/core';
import { ScreenBrightness } from '@capacitor-community/screen-brightness';
import { Capacitor } from '@capacitor/core';

// Vector output: deliberately no `size` param - the SVG scales to its CSS box.
const QR_ENDPOINT = 'https://api.qrserver.com/v1/create-qr-code/';
const QR_PARAMS = '&ecc=H&bgcolor=fff&qzone=4&format=svg';

@Component({
  selector: 'app-myrace',
  templateUrl: './myrace.page.html',
  styleUrls: ['./myrace.page.scss'],
  standalone: true,
  imports: [
    IonRefresherContent,
    IonRefresher,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonIcon,
    IonSpinner,
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
export class MyracePage implements OnDestroy {
  private authService = inject(AuthService);
  private settingsService = inject(SettingsService);
  private myRaceService = inject(MyRaceService);
  private router = inject(Router);
  private runnerSub: Subscription = Subscription.EMPTY;

  // Read the store signal straight through instead of copying it into a field.
  // The page instance survives tab switches (IonicRouteStrategy), so a copy
  // kept in sync by a lifecycle-managed effect silently froze the card the
  // first time the page was left.
  readonly runnerInfo = this.myRaceService.runner$;

  readonly eventName = computed(() => {
    const event = this.runnerInfo()?.event;
    return this.settingsService.selectedLanguage$() === 'el'
      ? event?.nameGr
      : event?.nameEn;
  });

  readonly placeName = computed(() => {
    const place = this.runnerInfo()?.place;
    return this.settingsService.selectedLanguage$() === 'el'
      ? place?.nameGr
      : place?.nameEn;
  });

  // Only runners who collect their own printed bib have a QR to show.
  readonly canFlip = computed(() => {
    const lp = this.runnerInfo()?.lp_runner;
    return !!lp?.isPrintable && !lp.receivesAsAGroup;
  });

  // Memoised by construction: a refresh that returns the same payload yields an
  // identical string, so [src] receives a stable value and the <img> is never
  // asked to reload on an unrelated change. Never put a nonce or Date.now() in
  // here - an unstable URL would re-request forever.
  readonly qrUrl = computed<string | null>(() => {
    const data = this.runnerInfo()?.lp_runner?.runnerQrData ?? '';
    // encodeURIComponent is required, not cosmetic: an unencoded '#' would
    // truncate the query and the QR would silently encode a partial payload.
    return data
      ? `${QR_ENDPOINT}?data=${encodeURIComponent(data)}${QR_PARAMS}`
      : null;
  });

  // ---- QR flip state -------------------------------------------------------
  qrFlipped = false;
  qrLoading = false;
  qrError = false;

  private readonly flipRoot = viewChild<ElementRef<HTMLElement>>('flipRoot');
  private readonly frontCta =
    viewChild<ElementRef<HTMLButtonElement>>('frontCta');
  private readonly backCta =
    viewChild<ElementRef<HTMLButtonElement>>('backCta');

  constructor() {
    addIcons({
      exitOutline,
      personCircleOutline,
      chevronDownCircleOutline,
      qrCodeOutline,
      alertCircle,
      checkmarkCircle,
    });
    // Runs only when the URL actually changes, so a no-op refresh never flashes
    // the spinner. Angular destroys this effect with the component - it must
    // never be destroyed by hand, or the reset stops happening.
    effect(() => {
      const url = this.qrUrl();
      this.qrLoading = url !== null;
      this.qrError = url === null; // no payload -> render the error face
    });
  }

  ngOnDestroy(): void {
    this.runnerSub.unsubscribe();
  }

  ionViewWillEnter(): void {
    // The page instance survives tab switches, so without this the card would
    // still be showing the QR on re-entry. Deliberately does NOT touch
    // qrLoading: the <img> is still in the DOM and already loaded, so it will
    // never fire `load` again and the spinner would stay up forever.
    this.qrFlipped = false;
    this.loadRunnerInfo();
  }

  ionViewWillLeave(): void {
    this.runnerSub.unsubscribe();
  }

  logoutRunner() {
    this.authService.logoutRunner().then(() => {
      this.router.navigate(['/tabs/login']);
    });
  }

  doRefresh(event: IonRefresherCustomEvent<RefresherEventDetail>) {
    this.loadRunnerInfo(() => event.target.complete());
  }

  async onCardTap(): Promise<void> {
    if (!this.canFlip()) return;
    this.qrFlipped = !this.qrFlipped;
    const brightness = this.qrFlipped ? 1.0 : -1.0;
    if (Capacitor.isNativePlatform()) {
      await ScreenBrightness.setBrightness({ brightness });
    }
    this.moveFocusToVisibleFace();
  }

  onQrLoad(): void {
    this.qrLoading = false;
  }

  onQrLoadError(): void {
    this.qrLoading = false;
    this.qrError = true;
  }

  retryQr(event: Event): void {
    // The button sits inside the back face's flip-back click handler.
    event.stopPropagation();
    if (!this.qrUrl()) return;
    // Clearing qrError makes @if destroy and re-create the <img>, so the
    // browser issues a fresh request. Re-assigning the same src string would
    // not: Angular skips the DOM write when the bound value is unchanged.
    this.qrError = false;
    this.qrLoading = true;
  }

  private moveFocusToVisibleFace(): void {
    const root = this.flipRoot()?.nativeElement;
    // Only chase focus for keyboard users. Mobile Safari does not focus a
    // <button> on tap, so touch users never get a stray focus ring.
    if (!root?.contains(document.activeElement)) return;

    const target = this.qrFlipped ? this.backCta() : this.frontCta();
    // Let change detection apply the inert swap before moving focus.
    setTimeout(() => target?.nativeElement.focus());
  }

  // onSettled runs on success, failure and cancellation, so the refresher is
  // never left spinning.
  private loadRunnerInfo(onSettled?: () => void): void {
    const uuid = this.authService.getRunnerUUID();
    if (!uuid) {
      onSettled?.();
      return;
    }

    this.runnerSub.unsubscribe();
    this.runnerSub = this.myRaceService
      .getRunnerInfo(uuid)
      .pipe(finalize(() => onSettled?.()))
      // MyRaceService already logs out and redirects on failure.
      .subscribe({ error: () => undefined });
  }
}
