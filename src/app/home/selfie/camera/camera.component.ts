import { Component, OnInit } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonBackButton,
  IonButtons,
  IonTitle,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-camera',
  templateUrl: './camera.component.html',
  styleUrls: ['./camera.component.scss'],
  standalone: true,
  imports: [
    IonTitle,
    IonHeader,
    IonContent,
    IonBackButton,
    IonToolbar,
    IonButtons,
    TranslatePipe,
  ],
})
export class CameraComponent implements OnInit {
  constructor() {}

  ngOnInit() {}

  ionViewWillEnter(): void {}
}
