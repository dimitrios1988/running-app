import {
  Component,
  HostBinding,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';
import { hexToRgb } from '../../shared/color.utils';
import { SelfieElementModel } from '../../shared/page.element/page.element.model';
import { Router } from '@angular/router';

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

  constructor(private router: Router) {
    addIcons({ chevronForwardOutline });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selfieElementModel'] && this.selfieElementModel) {
      this.updateCssVars();
    }
  }

  onSelfieElementClick() {
    this.router.navigate(['/tabs/home/selfie/camera']);
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
