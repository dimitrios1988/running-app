import {
  Component,
  HostBinding,
  inject,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';
import { hexToRgb } from '../../shared/color.utils';
import { SelfieElementModel } from '../../shared/page.element/page.element.model';
import { Camera, CameraDirection } from '@capacitor/camera';
import { Share } from '@capacitor/share';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-selfie',
  templateUrl: './selfie.component.html',
  styleUrls: ['./selfie.component.scss'],
  standalone: true,
  imports: [IonIcon],
})
export class SelfieComponent implements OnChanges {
  @Input() selfieElementModel!: SelfieElementModel;
  @HostBinding('style.--bg-color') hostBgColor?: string;
  @HostBinding('style.--title-size') hostTitleSize?: string;
  @HostBinding('style.--text-color') hostTextColor?: string;
  private readonly translateService = inject(TranslateService);

  constructor() {
    addIcons({ chevronForwardOutline });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selfieElementModel'] && this.selfieElementModel) {
      this.updateCssVars();
    }
  }

  onSelfieElementClick() {
    this.takePhotoAndShare().then(() => {
      console.log('Picture taken successfully');
    });
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

  private async takePhotoAndShare() {
    try {
      const photo = await Camera.takePhoto({
        quality: 90,
        editable: 'no',
        saveToGallery: false,
        cameraDirection: CameraDirection.Front,
      });

      if (!photo.uri) {
        throw new Error('No file path returned');
      }
      await Share.share({
        title: 'My Photo',
        text: this.selfieElementModel.shareText ?? '',
        url: `file://${photo.uri}`,
        dialogTitle: this.translateService.instant('SELFIE.SHARE_PHOTO'),
      });
    } catch (err) {
      console.error(err);
    }
  }
}
