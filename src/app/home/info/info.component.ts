import { Component, Input, OnInit } from '@angular/core';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';
import { InfoChildElementModel } from './info-child/info-child-element.interface';
import { InfoChildComponent } from './info-child/info-child.component';

@Component({
  selector: 'app-info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss'],
  imports: [InfoChildComponent],
})
export class InfoComponent implements OnInit {
  @Input() infoChildElementModelArray: InfoChildElementModel[] | undefined;

  constructor() {
    addIcons({ chevronForwardOutline });
  }

  ngOnInit() {}
}
