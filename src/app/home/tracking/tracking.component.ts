import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  HostBinding,
} from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { cssFilterFromHex, hexToRgb } from '../../shared/color.utils';
import { TrackingElementModel } from '../../shared/page.element/page.element.model';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tracking',
  templateUrl: './tracking.component.html',
  styleUrls: ['./tracking.component.scss'],
  imports: [IonIcon],
})
export class TrackingComponent implements OnChanges {
  @Input() trackingElementModel?: TrackingElementModel;
  @Output() open = new EventEmitter<void>();

  // bind CSS custom properties to the host so we don't manipulate DOM directly
  @HostBinding('style.--bg-color') hostBgColor?: string;
  @HostBinding('style.--filter-color') hostFilterColor?: string;

  constructor() {
    addIcons({ chevronForwardOutline });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['trackingElementModel'] && this.trackingElementModel) {
      this.updateCssVars();
    }
  }

  onClick() {
    this.open.emit();
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
      this.hostFilterColor = cssFilterFromHex(m.textColor);
    }
  }
}
