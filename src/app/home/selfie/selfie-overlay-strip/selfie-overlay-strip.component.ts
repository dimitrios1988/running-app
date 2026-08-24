import { Component, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { banOutline } from 'ionicons/icons';

export type SelfieOverlayId = number | string;

export interface SelfieOverlayOption {
  id: SelfieOverlayId;
  name: string | null;
  /** Already-resolved, taint-free url (see SelfieOverlayLoader). */
  thumbnailUrl: string;
}

/**
 * The row of square overlay options under the camera preview. Presentational
 * only - no DI, no I/O - so the modal owns all the loading and error handling.
 */
@Component({
  selector: 'app-selfie-overlay-strip',
  templateUrl: './selfie-overlay-strip.component.html',
  styleUrls: ['./selfie-overlay-strip.component.scss'],
  standalone: true,
  imports: [IonIcon, TranslatePipe],
})
export class SelfieOverlayStripComponent {
  readonly options = input.required<SelfieOverlayOption[]>();
  /** null is the "no overlay" option, which is always first. */
  readonly selectedId = input<SelfieOverlayId | null>(null);
  readonly overlaySelect = output<SelfieOverlayId | null>();

  constructor() {
    addIcons({ banOutline });
  }
}
