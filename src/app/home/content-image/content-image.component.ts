import { Component, Input, OnInit } from '@angular/core';
import { ContentImageElementModel } from '../../shared/page.element/page.element.model';
import { Browser } from '@capacitor/browser';

@Component({
  selector: 'app-content-image',
  templateUrl: './content-image.component.html',
  styleUrls: ['./content-image.component.scss'],
  standalone: true,
})
export class ContentImageComponent implements OnInit {
  @Input() contentImageElementModel!: ContentImageElementModel;

  constructor() {}

  ngOnInit() {}

  async navigateToLink(link: string | null | undefined) {
    if (!link) return;
    try {
      await Browser.open({ url: link });
    } catch {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  }
}
