import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { OneSignalService } from './onesignal.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor(oneSignalService: OneSignalService) {
    console.log('OneSignalService loaded:', oneSignalService);
  }
}
