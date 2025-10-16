import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';
import { cssFilterFromHex, hexToRgb } from '../../shared/color.utils';
import { TrackingElementModel } from './tracking-element.interface';

@Component({
  selector: 'app-tracking',
  templateUrl: './tracking.component.html',
  styleUrls: ['./tracking.component.scss'],
  imports: [IonIcon],
})
export class TrackingComponent implements OnInit {
  @ViewChild('trackingElement', { static: true }) trackingElement!: ElementRef;
  @ViewChild('trackingIcon', { static: true }) trackingIcon!: ElementRef;
  @Input() trackingElementModel!: TrackingElementModel;

  constructor() {
    addIcons({ chevronForwardOutline });
  }

  ngOnInit() {
    this.initializeFromModel();
  }

  navigateToTracking() {
    throw new Error('Method not implemented.');
  }

  private setBackgroudColor() {
    if (!this.trackingElementModel.backgroundColor) {
      return;
    }
    const backgroundRgb = hexToRgb(this.trackingElementModel.backgroundColor);
    this.trackingElement.nativeElement.style.setProperty(
      '--bg-color',
      `rgba(${backgroundRgb?.r}, ${backgroundRgb?.g}, ${backgroundRgb?.b}, 0.8)`
    );
  }

  private setIconColor() {
    if (!this.trackingElementModel.textColor) {
      return;
    }
    const filterColor = cssFilterFromHex(this.trackingElementModel.textColor);
    this.trackingIcon.nativeElement.style.setProperty(
      '--filter-color',
      filterColor
    );
  }

  private initializeFromModel() {
    this.setBackgroudColor();
    this.setIconColor();
  }
}
