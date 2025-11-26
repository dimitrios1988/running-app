import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';
import { cssFilterFromHex, hexToRgb } from '../../shared/color.utils';
import { Router } from '@angular/router';
import { NewsElementModel } from '../../shared/page.element/page.element.model';

@Component({
  selector: 'app-news',
  templateUrl: './news.component.html',
  styleUrls: ['./news.component.scss'],
  imports: [IonIcon],
})
export class NewsComponent implements OnInit {
  @ViewChild('newsElement', { static: true }) newsElement!: ElementRef;
  @Input() newsElementModel!: NewsElementModel;

  constructor(private router: Router) {
    addIcons({ chevronForwardOutline });
  }

  ngOnInit() {
    const backgroundRgb = hexToRgb(this.newsElementModel.backgroundColor);
    this.newsElement.nativeElement.style.setProperty(
      '--bg-color',
      `rgba(${backgroundRgb?.r}, ${backgroundRgb?.g}, ${backgroundRgb?.b}, 0.8)`
    );

    const filterColor = cssFilterFromHex(this.newsElementModel.textColor);
    this.newsElement.nativeElement.style.setProperty(
      '--filter-color',
      filterColor
    );
  }

  navigateToNews() {
    this.router.navigate(['/tabs/home/news/']);
  }
}
