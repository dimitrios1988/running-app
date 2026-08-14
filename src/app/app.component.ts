import { Component, inject, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { OneSignalService } from './onesignal.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  // Injecting the service is what starts OneSignal - it initialises in its own
  // constructor and registers the notification click handler.
  private oneSignalService = inject(OneSignalService);

  ngOnInit(): void {
    // ngOnInit rather than the constructor: the first-launch prompt presents an
    // Ionic alert, which needs the view to exist.
    void this.oneSignalService.promptForNotificationsOnFirstLaunch();
  }
}
