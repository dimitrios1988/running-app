import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';
import { cssFilterFromHex, hexToRgb } from '../../shared/color.utils';

@Component({
  selector: 'app-tracking',
  templateUrl: './tracking.component.html',
  styleUrls: ['./tracking.component.scss'],
  imports: [IonIcon],
})
export class TrackingComponent implements OnInit {
  @ViewChild('trackingElement', { static: true }) trackingElement!: ElementRef;
  @ViewChild('trackingIcon', { static: true }) trackingIcon!: ElementRef;
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() backgroundColor: string = '#2a7b9b';
  @Input() textColor: string = '#ece4e4';
  @Input() backgroundImage: string = '';
  @Input() icon: string = '';

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
    const backgroundRgb = hexToRgb(this.backgroundColor);
    this.trackingElement.nativeElement.style.setProperty(
      '--bg-color',
      `rgba(${backgroundRgb?.r}, ${backgroundRgb?.g}, ${backgroundRgb?.b}, 0.8)`
    );
  }

  private setIconColor() {
    const filterColor = cssFilterFromHex(this.textColor);
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
