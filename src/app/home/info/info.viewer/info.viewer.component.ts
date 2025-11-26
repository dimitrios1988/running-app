import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AsyncPipe } from '@angular/common';
import { map, switchMap, shareReplay } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Browser } from '@capacitor/browser';

import {
  IonToolbar,
  IonButton,
  IonTitle,
  IonHeader,
  IonContent,
  IonBackButton,
  IonButtons,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { IInfoViewer } from './info.viewer.interface';
import { InfoViewerService } from './info.viewer.service';

@Component({
  selector: 'app-info.viewer',
  templateUrl: './info.viewer.component.html',
  styleUrls: ['./info.viewer.component.scss'],
  standalone: true,
  imports: [
    IonButtons,
    IonBackButton,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonContent,
    IonButton,
    TranslatePipe,
    AsyncPipe,
  ],
})
export class InfoViewerComponent {
  private route = inject(ActivatedRoute);
  private svc = inject(InfoViewerService);
  private sanitizer = inject(DomSanitizer);

  /**
   * info$ emits the viewer model enriched with `safeContent` (SafeHtml).
   * It reacts to route param changes and is shared/replayed for template consumption.
   */
  readonly info$: Observable<IInfoViewer & { safeContent: SafeHtml }> =
    this.route.paramMap.pipe(
      map((pm) => Number(pm.get('id'))),
      switchMap((id) => this.svc.getInfo(id)),
      map((info) => ({
        ...info,
        safeContent: this.sanitizer.bypassSecurityTrustHtml(info.content ?? ''),
      })),
      shareReplay({ bufferSize: 1, refCount: true })
    );

  // open links with Capacitor Browser (fallbacks to window.open if needed)
  async navigateToLink(link: string | null | undefined) {
    if (!link) return;
    try {
      await Browser.open({ url: link });
    } catch {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  }
}
