import {
  Component,
  HostBinding,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { LinkElementModel } from '../../shared/page.element/page.element.model';
import { Browser } from '@capacitor/browser';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';
import { hexToCssFilter, hexToRgb } from '../../shared/color.utils';

@Component({
  selector: 'app-link',
  templateUrl: './link.component.html',
  styleUrls: ['./link.component.scss'],
  standalone: true,
  imports: [IonIcon],
})
export class LinkComponent implements OnChanges {
  @Input() linkElementModel!: LinkElementModel;
  @HostBinding('style.--bg-color') hostBgColor?: string;
  @HostBinding('style.--filter-color') hostFilterColor?: string;
  @HostBinding('style.--title-size') hostTitleSize?: string;
  @HostBinding('style.--text-color') hostTextColor?: string;

  constructor() {
    addIcons({ chevronForwardOutline });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['linkElementModel'] && this.linkElementModel) {
      this.updateCssVars();
    }
  }

  async navigateToLink(link: string | null | undefined) {
    if (!link) return;
    try {
      await Browser.open({ url: link });
    } catch {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  }

  private updateCssVars() {
    const m = this.linkElementModel!;
    if (m?.backgroundColor) {
      const rgb = hexToRgb(m.backgroundColor);
      this.hostBgColor = rgb
        ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`
        : undefined;
    } else {
      this.hostBgColor = 'transparent';
    }

    if (m?.textColor) {
      this.hostFilterColor = hexToCssFilter(m.textColor);
      this.hostTextColor = `${m.textColor}`;
    }
    if (m?.title_size) {
      this.hostTitleSize = `${m.title_size}rem`;
    }
  }
}
