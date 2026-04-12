import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  HostBinding,
} from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { hexToRgb } from '../../shared/color.utils';
import { TrackingElementModel } from '../../shared/page.element/page.element.model';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';
import { Browser } from '@capacitor/browser';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tracking',
  templateUrl: './tracking.component.html',
  styleUrls: ['./tracking.component.scss'],
  imports: [IonIcon],
})
export class TrackingComponent implements OnChanges {
  @Input() trackingElementModel?: TrackingElementModel;

  // bind CSS custom properties to the host so we don't manipulate DOM directly
  @HostBinding('style.--bg-color') hostBgColor?: string;
  @HostBinding('style.--title-size') hostTitleSize?: string;
  @HostBinding('style.--subtitle-size') hostSubtitleSize?: string;
  @HostBinding('style.--text-color') hostTextColor?: string;

  constructor(private router: Router) {
    addIcons({ chevronForwardOutline });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['trackingElementModel'] && this.trackingElementModel) {
      this.updateCssVars();
    }
  }

  async onClick() {
    if (
      this.trackingElementModel?.link &&
      this.trackingElementModel?.opens_in_external_url
    ) {
      try {
        await Browser.open({ url: this.trackingElementModel?.link });
      } catch {
        window.open(
          this.trackingElementModel?.link,
          '_blank',
          'noopener,noreferrer',
        );
      }
    } else {
      this.router.navigate(['/tabs/home/tracking/viewer']);
    }
  }

  private updateCssVars() {
    const m = this.trackingElementModel!;
    if (m?.backgroundColor) {
      const rgb = hexToRgb(m.backgroundColor);
      this.hostBgColor = rgb
        ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`
        : undefined;
    } else {
      this.hostBgColor = 'transparent';
    }

    if (m?.textColor) {
      //this.hostFilterColor = hexToCssFilter(m.textColor);
      this.hostTextColor = `${m.textColor}`;
    }
    if (m?.title_size) {
      this.hostTitleSize = `${m.title_size}rem`;
    }
    if (m?.subtitle_size) {
      this.hostSubtitleSize = `${m.subtitle_size}rem`;
    }
  }
}
