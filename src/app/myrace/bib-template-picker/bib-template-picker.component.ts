import {
  Component,
  computed,
  inject,
  linkedSignal,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { Subscription } from 'rxjs';
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
  alertCircleOutline,
  checkmarkCircle,
  closeOutline,
  imagesOutline,
} from 'ionicons/icons';
import { CachedSrcDirective } from '../../shared/cache/cached-src.directive';
import { ToastService } from '../../shared/services/toast.service';
import { MyRaceService } from '../myrace.service';
import { BibTemplateService } from './bib-template.service';
import { IBibTemplate } from './bib-template.interface';

@Component({
  selector: 'app-bib-template-picker',
  templateUrl: './bib-template-picker.component.html',
  styleUrls: ['./bib-template-picker.component.scss'],
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonSpinner,
    IonContent,
    TranslatePipe,
    CachedSrcDirective,
  ],
})
export class BibTemplatePickerComponent implements OnInit, OnDestroy {
  private readonly modalController = inject(ModalController);
  private readonly myRaceService = inject(MyRaceService);
  private readonly bibTemplateService = inject(BibTemplateService);
  private readonly toastService = inject(ToastService);
  private readonly translateService = inject(TranslateService);
  private loadSub: Subscription = Subscription.EMPTY;
  /** Closed by the runner, or already on its way out. */
  private dismissed = false;

  // Read straight from the store, as MyracePage does, rather than handed in
  // through componentProps: when a saved assignment refreshes the runner, the
  // selection follows without the modal having to be told.
  private readonly runner = this.myRaceService.runner$;
  private readonly assignedId = computed(
    () => this.runner()?.lp_runner?.assignedBibTemplate ?? null,
  );

  /** The server's assignment, which a tap can move ahead of the save. */
  readonly selectedId = linkedSignal(() => this.assignedId());
  readonly templates = signal<IBibTemplate[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  /** The template whose save is in flight; every card is locked meanwhile. */
  readonly savingId = signal<number | null>(null);

  constructor() {
    addIcons({
      alertCircleOutline,
      checkmarkCircle,
      closeOutline,
      imagesOutline,
    });
  }

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.dismissed = true;
    this.loadSub.unsubscribe();
  }

  async close(): Promise<void> {
    this.dismissed = true;
    await this.modalController.dismiss();
  }

  retry(): void {
    this.load(true);
  }

  select(template: IBibTemplate): void {
    if (this.savingId() !== null || template.id === this.selectedId()) {
      return;
    }
    const previous = this.selectedId();
    this.selectedId.set(template.id);
    this.savingId.set(template.id);

    // Deliberately not cancelled when the modal closes: the server may already
    // have applied the change, and the store and the runner still need to hear
    // how it went.
    this.myRaceService.assignBibTemplate(template.id).subscribe({
      next: () => {
        this.savingId.set(null);
        void this.toast('success', 'MY_RACE.BIB_APPEARANCE.SAVED');
        if (!this.dismissed) {
          this.dismissed = true;
          // The catch covers a back-button dismiss still animating out.
          this.modalController
            .dismiss(template.id, 'saved')
            .catch(() => undefined);
        }
      },
      error: () => {
        this.savingId.set(null);
        this.selectedId.set(previous);
        void this.toast('error', 'MY_RACE.BIB_APPEARANCE.SAVE_ERROR');
      },
    });
  }

  private load(forceRefresh = false): void {
    this.loadSub.unsubscribe();
    const eventId = this.runner()?.event.lp_event_id;
    if (eventId == null) {
      this.fail();
      return;
    }

    this.loading.set(true);
    this.loadError.set(false);
    this.loadSub = this.bibTemplateService
      .getAvailableBibTemplates(eventId, forceRefresh)
      .subscribe({
        // A cached copy arrives first and paints at once; the revalidation
        // only emits again if the list actually changed.
        next: (templates) => {
          this.templates.set(templates);
          this.loading.set(false);
        },
        // Only reached with nothing on screen: HttpCacheInterceptor swallows a
        // failed revalidation of a cached copy.
        error: () => this.fail(),
        // AuthInterceptor completes without a value when it cannot recover a
        // 401, which would otherwise leave the skeletons up for good.
        complete: () => {
          if (this.loading()) {
            this.fail();
          }
        },
      });
  }

  private fail(): void {
    this.loading.set(false);
    this.loadError.set(true);
  }

  private async toast(kind: 'success' | 'error', key: string): Promise<void> {
    const message = this.translateService.instant(key);
    await (kind === 'success'
      ? this.toastService.showSuccess(message)
      : this.toastService.showError(message));
  }
}
