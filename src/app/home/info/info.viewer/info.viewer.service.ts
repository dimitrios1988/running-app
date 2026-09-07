import { inject, Injectable } from '@angular/core';
import { IInfoViewer } from './info.viewer.interface';
import { map, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AUTH_CREDENTIALS } from '../../../secrets';
import { AuthService } from '../../../auth/auth.service';
import { InfoViewerResponse } from './response/infoviewer.resp';
import { withHttpCache } from '../../../shared/cache/http-cache.context';

@Injectable({
  providedIn: 'root',
})
export class InfoViewerService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly infoApi = new URL(
    `/api/mobile_app_manager/info_view/v1`,
    AUTH_CREDENTIALS.app_url,
  ).toString();

  constructor() {}

  getInfo(id: number, forceRefresh = false): Observable<IInfoViewer | null> {
    // No `language` param here, unlike every other content endpoint - the
    // cached copy is language-neutral in exactly the same way the live call is.
    return this.http
      .get<InfoViewerResponse[]>(`${this.infoApi}/${id}`, {
        context: withHttpCache({ scope: 'shared', refresh: forceRefresh }),
      })
      .pipe(
        map((resp) => {
          if (resp.length === 0) {
            return null;
          }
          return {
            title: resp[0]['0(page_element)'].title,
            content: resp[0]['0(page_element)'].content,
            image: resp[0]['0(page_element)'].primary_image
              ? new URL(
                  `/data/download/${
                    resp[0]['0(page_element)'].primary_image[0].name
                  }?attribute_id=cc6d340b-2728-4bdb-95c3-90feb97dbcb2&file_id=${
                    resp[0]['0(page_element)'].primary_image[0].id
                  }&version=0&token=${this.authService.getToken()}`,
                  AUTH_CREDENTIALS.app_url,
                ).toString()
              : null,
            link: resp[0]['0(page_element)'].url,
          };
        }),
      );
  }
}
