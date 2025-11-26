import { Component, Input, OnInit } from '@angular/core';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';
import { InfoChildComponent } from './info-child/info-child.component';
import { InfoChildElementModel } from '../../shared/page.element/page.element.model';

@Component({
  selector: 'app-info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss'],
  imports: [InfoChildComponent],
})
export class InfoComponent implements OnInit {
  @Input() infoChildElementModelArray!: InfoChildElementModel[];

  constructor() {
    addIcons({ chevronForwardOutline });
  }

  ngOnInit() {}
}
