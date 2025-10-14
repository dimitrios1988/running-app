import {
  Component,
  ElementRef,
  inject,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { InfoChildElementModel } from './info-child-element.interface';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';
import { hexToRgb } from '../../../shared/color.utils';
import { Router } from '@angular/router';
@Component({
  imports: [IonIcon],
  selector: 'app-info-child',
  templateUrl: './info-child.component.html',
  styleUrls: ['./info-child.component.scss'],
})
export class InfoChildComponent implements OnInit {
  @Input() infoChildElementModel: InfoChildElementModel | undefined;
  @ViewChild('infoChildElement', { static: true })
  infoChildElement!: ElementRef;

  private router = inject(Router);

  constructor() {
    addIcons({ chevronForwardOutline });
  }

  ngOnInit() {
    this.setBackgroudColor();
  }

  navigateToInfo() {
    if (!this.infoChildElementModel?.opens_in_external_url === false) {
      this.router.navigate([
        '/tabs/home/info/viewer',
        this.infoChildElementModel?.id,
      ]);
    }
  }

  private setBackgroudColor() {
    const backgroundRgb = hexToRgb(
      this.infoChildElementModel?.backgroundColor || '#2a7b9b'
    );
    this.infoChildElement.nativeElement.style.setProperty(
      '--bg-color',
      `rgba(${backgroundRgb?.r}, ${backgroundRgb?.g}, ${backgroundRgb?.b}, 0.8)`
    );
  }
}
