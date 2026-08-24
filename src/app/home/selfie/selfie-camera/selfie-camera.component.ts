import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { App } from '@capacitor/app';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  refreshOutline,
  shareSocialOutline,
} from 'ionicons/icons';
import {
  SelfieElementModel,
  SelfieOverlayModel,
} from '../../../shared/page.element/page.element.model';
import { ShareImageService } from '../../../shared/services/share-image.service';
import { ToastService } from '../../../shared/services/toast.service';
import { canvasToJpeg, composeSelfie } from '../selfie-capture.util';
import {
  LoadedOverlayImage,
  SelfieOverlayLoader,
} from '../selfie-overlay-loader';
import { DEFAULT_SELFIE_OVERLAYS } from '../selfie.overlays';
import {
  SelfieOverlayId,
  SelfieOverlayOption,
  SelfieOverlayStripComponent,
} from '../selfie-overlay-strip/selfie-overlay-strip.component';

interface OverlayEntry {
  model: SelfieOverlayModel;
  artwork: LoadedOverlayImage;
  thumbnail: LoadedOverlayImage;
}

/** What the live preview needs in order to mirror the capture exactly. */
interface ActiveOverlayView {
  displayUrl: string;
  left: number;
  top: number;
  width: number;
  /** null lets CSS `height: auto` keep the artwork's aspect ratio. */
  height: number | null;
  opacity: number | null;
}

@Component({
  selector: 'app-selfie-camera',
  templateUrl: './selfie-camera.component.html',
  styleUrls: ['./selfie-camera.component.scss'],
  standalone: true,
  imports: [
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonSpinner,
    IonTitle,
    IonToolbar,
    TranslatePipe,
    SelfieOverlayStripComponent,
  ],
  // Component-scoped so every object URL it created is revoked when the modal
  // is destroyed.
  providers: [SelfieOverlayLoader],
})
export class SelfieCameraComponent implements AfterViewInit, OnDestroy {
  /** Assigned by ModalController via componentProps. */
  @Input() selfieElementModel!: SelfieElementModel;

  private readonly modalController = inject(ModalController);
  private readonly overlayLoader = inject(SelfieOverlayLoader);
  private readonly shareImageService = inject(ShareImageService);
  private readonly toastService = inject(ToastService);
  private readonly translateService = inject(TranslateService);
  private readonly zone = inject(NgZone);

  private readonly videoEl =
    viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private readonly stageEl =
    viewChild.required<ElementRef<HTMLElement>>('stage');

  readonly starting = signal(true);
  readonly ready = signal(false);
  readonly busy = signal(false);
  /** Front cameras are shown mirrored, the way a mirror would. */
  readonly mirror = signal(true);
  readonly selectedId = signal<SelfieOverlayId | null>(null);
  readonly previewUrl = signal<string | null>(null);

  private readonly entries = signal<OverlayEntry[]>([]);

  readonly options = computed<SelfieOverlayOption[]>(() =>
    this.entries().map((entry) => ({
      id: entry.model.id,
      name: entry.model.name,
      thumbnailUrl: entry.thumbnail.displayUrl,
    })),
  );

  private readonly selectedEntry = computed<OverlayEntry | null>(() => {
    const id = this.selectedId();
    if (id === null) {
      return null;
    }
    return this.entries().find((entry) => entry.model.id === id) ?? null;
  });

  readonly activeOverlay = computed<ActiveOverlayView | null>(() => {
    const entry = this.selectedEntry();
    if (!entry) {
      return null;
    }
    const { model, artwork } = entry;
    return {
      displayUrl: artwork.displayUrl,
      left: model.x * 100,
      top: model.y * 100,
      width: model.width * 100,
      height: model.height != null ? model.height * 100 : null,
      opacity: model.opacity,
    };
  });

  private stream?: MediaStream;
  private capturedBlob: Blob | null = null;
  private appStateHandle?: PluginListenerHandle;
  private destroyed = false;
  private startInFlight?: Promise<void>;
  private readonly onVisibilityChange = () => {
    if (document.hidden) {
      this.stopStream();
    } else {
      void this.startCamera();
    }
  };

  constructor() {
    addIcons({ closeOutline, refreshOutline, shareSocialOutline });
  }

  ngAfterViewInit(): void {
    // Not ionViewDidEnter: the <video> has to exist before a stream can be
    // attached, and the modal's create/destroy cycle is the reliable boundary.
    void this.startCamera();
    void this.loadOverlays();
    void this.watchAppState();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.stopStream();
    void this.appStateHandle?.remove();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.clearPreview();
  }

  async close(): Promise<void> {
    // Before dismiss, so the camera light goes out immediately rather than after
    // the dismiss animation.
    this.stopStream();
    await this.modalController.dismiss();
  }

  onOverlaySelect(id: SelfieOverlayId | null): void {
    this.selectedId.set(id);
  }

  async capture(): Promise<void> {
    const video = this.videoEl().nativeElement;
    if (!this.ready() || this.busy() || !video.videoWidth) {
      return;
    }

    this.busy.set(true);
    void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => undefined);

    try {
      const entry = this.selectedEntry();
      // The box the user was actually looking at, measured rather than assumed,
      // so the capture stays correct if the layout ever changes.
      const box = this.stageEl().nativeElement.getBoundingClientRect();

      const canvas = composeSelfie({
        source: video,
        sourceWidth: video.videoWidth,
        sourceHeight: video.videoHeight,
        boxWidth: box.width,
        boxHeight: box.height,
        mirror: this.mirror(),
        overlay: entry
          ? {
              image: entry.artwork.image,
              intrinsicWidth: entry.artwork.width,
              intrinsicHeight: entry.artwork.height,
              x: entry.model.x,
              y: entry.model.y,
              width: entry.model.width,
              height: entry.model.height,
              opacity: entry.model.opacity,
            }
          : null,
      });

      const blob = await canvasToJpeg(canvas);
      this.clearPreview();
      this.capturedBlob = blob;
      this.previewUrl.set(URL.createObjectURL(blob));
    } catch (error) {
      console.error('Selfie capture failed', error);
      await this.toast('SELFIE.ERRORS.CAPTURE_FAILED');
    } finally {
      this.busy.set(false);
    }
  }

  retake(): void {
    this.clearPreview();
    // The stream is deliberately left running - restarting it is slow and can
    // fail, and nothing about a retake requires a fresh one.
  }

  async share(): Promise<void> {
    const blob = this.capturedBlob;
    if (!blob || this.busy()) {
      return;
    }

    this.busy.set(true);
    try {
      await this.shareImageService.share(blob, {
        title: this.selfieElementModel?.title ?? undefined,
        text: this.selfieElementModel?.shareText ?? undefined,
        dialogTitle: this.translateService.instant('SELFIE.SHARE_PHOTO'),
      });
    } catch (error) {
      // Dismissing the share sheet is a normal outcome, not a failure.
      if (!isAbort(error)) {
        console.error('Selfie share failed', error);
        await this.toast('SELFIE.ERRORS.SHARE_FAILED');
      }
    } finally {
      this.busy.set(false);
    }
  }

  /**
   * De-duplicated: `getUserMedia` can be in flight while a resume or a
   * visibility change asks for the camera again, and two concurrent grants would
   * leave one stream running with nothing holding a reference to it.
   */
  private startCamera(): Promise<void> {
    if (this.stream || this.destroyed) {
      return Promise.resolve();
    }
    this.startInFlight ??= this.runStartCamera().finally(() => {
      this.startInFlight = undefined;
    });
    return this.startInFlight;
  }

  private async runStartCamera(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      await this.fail('SELFIE.ERRORS.CAMERA_UNAVAILABLE');
      return;
    }

    this.starting.set(true);

    // Ask for a portrait-ish stream, but never depend on getting one - the
    // cover-crop math absorbs whatever the device actually hands back.
    const attempts: MediaStreamConstraints[] = [
      {
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 1080 },
          height: { ideal: 1440 },
        },
      },
      { video: { facingMode: 'user' } },
      { video: true },
    ];

    let lastError: unknown;
    for (const constraints of attempts) {
      let stream: MediaStream;
      // Only the request itself is guarded - an error out of attach() is a bug,
      // not a camera problem, and must not be reported as one or swallow the
      // stream it was handed.
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        lastError = error;
        // Relaxing the constraints cannot undo a permission denial.
        if (errorName(error) === 'NotAllowedError') {
          break;
        }
        continue;
      }
      this.attach(stream);
      return;
    }

    this.starting.set(false);
    await this.fail(cameraErrorKey(lastError));
  }

  private attach(stream: MediaStream): void {
    if (this.destroyed) {
      // The modal closed while the permission prompt was still up; nothing will
      // ever stop this stream otherwise and the camera light stays on.
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    this.stream = stream;
    const video = this.videoEl().nativeElement;
    video.srcObject = stream;
    this.mirror.set(usesFrontCamera(stream));
    // The autoplay attribute normally covers this; the explicit call keeps the
    // resume-from-background path from leaving a frozen frame.
    void video.play().catch(() => undefined);
    this.starting.set(false);
    this.ready.set(true);
  }

  private stopStream(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = undefined;
    this.ready.set(false);

    const video = this.videoEl().nativeElement;
    // Required: without this WKWebView keeps the capture indicator lit even
    // after every track has been stopped.
    video.srcObject = null;
  }

  private async watchAppState(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      // Capacitor listeners fire outside the Angular zone, so signal writes here
      // would not be picked up without this.
      this.appStateHandle = await App.addListener(
        'appStateChange',
        ({ isActive }) =>
          this.zone.run(() => {
            if (isActive) {
              void this.startCamera();
            } else {
              // iOS suspends the track while backgrounded and returns black
              // frames on return, so release it outright.
              this.stopStream();
            }
          }),
      );
      return;
    }
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  private async loadOverlays(): Promise<void> {
    const models = this.selfieElementModel?.overlays?.length
      ? this.selfieElementModel.overlays
      : DEFAULT_SELFIE_OVERLAYS;

    const results = await Promise.allSettled(
      models.map(async (model): Promise<OverlayEntry> => {
        const artwork = await this.overlayLoader.load(model.imageUrl);
        const thumbnail = model.thumbnailUrl
          ? await this.overlayLoader
              .load(model.thumbnailUrl)
              .catch(() => artwork)
          : artwork;
        return { model, artwork, thumbnail };
      }),
    );

    const loaded: OverlayEntry[] = [];
    let failed = false;
    for (const result of results) {
      if (result.status === 'fulfilled') {
        loaded.push(result.value);
      } else {
        failed = true;
        console.error('Selfie overlay failed to load', result.reason);
      }
    }

    this.entries.set(loaded);
    if (failed) {
      // Whatever did load stays usable; only the broken options are dropped.
      await this.toast('SELFIE.ERRORS.OVERLAY_LOAD_FAILED');
    }
  }

  private clearPreview(): void {
    const url = this.previewUrl();
    if (url) {
      // Revoked on every retake, otherwise each shot leaks a few MB.
      URL.revokeObjectURL(url);
    }
    this.previewUrl.set(null);
    this.capturedBlob = null;
  }

  private async fail(key: string): Promise<void> {
    await this.toast(key);
    // Never leave the user staring at a black screen with no way to tell why.
    await this.close();
  }

  private async toast(key: string): Promise<void> {
    await this.toastService.showError(this.translateService.instant(key));
  }
}

function errorName(error: unknown): string {
  return typeof error === 'object' && error !== null && 'name' in error
    ? String((error as { name: unknown }).name)
    : '';
}

function isAbort(error: unknown): boolean {
  return errorName(error) === 'AbortError';
}

function cameraErrorKey(error: unknown): string {
  switch (errorName(error)) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'SELFIE.ERRORS.PERMISSION_DENIED';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return 'SELFIE.ERRORS.NO_CAMERA';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'SELFIE.ERRORS.CAMERA_BUSY';
    default:
      return 'SELFIE.ERRORS.CAMERA_UNAVAILABLE';
  }
}

function usesFrontCamera(stream: MediaStream): boolean {
  // Desktop webcams report no facingMode at all, and those are conventionally
  // shown mirrored - so only an explicit rear camera turns mirroring off.
  return stream.getVideoTracks()[0]?.getSettings().facingMode !== 'environment';
}
