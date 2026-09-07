import {
  Component,
  HostBinding,
  inject,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { IonIcon, ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';
import { hexToRgb } from '../../shared/color.utils';
import { SelfieElementModel } from '../../shared/page.element/page.element.model';
import { CachedSrcDirective } from '../../shared/cache/cached-src.directive';

@Component({
  selector: 'app-selfie',
  templateUrl: './selfie.component.html',
  styleUrls: ['./selfie.component.scss'],
  standalone: true,
  imports: [IonIcon, CachedSrcDirective],
})
export class SelfieComponent implements OnChanges {
  @Input() selfieElementModel!: SelfieElementModel;
  @HostBinding('style.--bg-color') hostBgColor?: string;
  @HostBinding('style.--title-size') hostTitleSize?: string;
  @HostBinding('style.--text-color') hostTextColor?: string;
  private readonly modalController = inject(ModalController);

  constructor() {
    addIcons({ chevronForwardOutline });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selfieElementModel'] && this.selfieElementModel) {
      this.updateCssVars();
    }
  }

  async onSelfieElementClick(): Promise<void> {
    // Loaded on demand: this card renders on every home visit, but the camera
    // (and the canvas/filesystem code behind it) is opened rarely, so it has no
    // business sitting in the home chunk.
    const { SelfieCameraComponent } = await import(
      './selfie-camera/selfie-camera.component'
    );

    const modal = await this.modalController.create({
      component: SelfieCameraComponent,
      componentProps: { selfieElementModel: this.selfieElementModel },
      cssClass: 'app-modal-fullscreen',
      backdropDismiss: false,
    });
    await modal.present();
  }

  private updateCssVars() {
    const m = this.selfieElementModel!;
    if (m?.backgroundColor) {
      const rgb = hexToRgb(m.backgroundColor);
      this.hostBgColor = rgb
        ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`
        : undefined;
    } else {
      this.hostBgColor = 'transparent';
    }

    if (m?.textColor) {
      this.hostTextColor = `${m.textColor}`;
    }
    if (m?.title_size) {
      this.hostTitleSize = `${m.title_size}rem`;
    }
  }
}
