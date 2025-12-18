import {
  Component,
  ElementRef,
  inject,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';
import { hexToRgb } from '../../../shared/color.utils';
import { Router } from '@angular/router';
import { Browser } from '@capacitor/browser';
import { InfoChildElementModel } from '../../../shared/page.element/page.element.model';
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
    if (this.infoChildElementModel?.backgroundColor) {
      const backgroundRgb = hexToRgb(
        this.infoChildElementModel?.backgroundColor
      );
      this.infoChildElement.nativeElement.style.setProperty(
        '--bg-color',
        `rgba(${backgroundRgb?.r}, ${backgroundRgb?.g}, ${backgroundRgb?.b}, 0.8)`
      );
    }
    if (this.infoChildElementModel?.textColor) {
      this.infoChildElement.nativeElement.style.setProperty(
        '--text-color',
        this.infoChildElementModel?.textColor
      );
    }
  }

  navigateToInfo() {
    if (this.infoChildElementModel?.opens_in_external_url === false) {
      this.router.navigate([
        '/tabs/home/info/viewer',
        this.infoChildElementModel?.id,
      ]);
    } else {
      this.navigateToLink(this.infoChildElementModel?.link);
    }
  }

  private async navigateToLink(link: string | null | undefined) {
    if (!link) return;
    try {
      await Browser.open({ url: link });
    } catch {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  }
}
