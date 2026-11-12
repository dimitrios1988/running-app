import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { AUTH_CREDENTIALS } from '../../secrets';
import { AuthService } from '../../auth/auth.service';
import { withHttpCache } from '../../shared/cache/http-cache.context';
import { BibTemplateResponse } from './bib-template.resp';
import { IBibTemplate } from './bib-template.interface';

/** CMS attribute of the bib_template `preview` file field. */
const PREVIEW_ATTRIBUTE_ID = '83910437-bd1f-49e7-a217-85abf6a274d5';

@Injectable({
  providedIn: 'root',
})
export class BibTemplateService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly availableTemplatesApi = new URL(
    `/api/mobile_app_manager/get_available_bib_templates/v1`,
    AUTH_CREDENTIALS.app_url,
  ).toString();

  getAvailableBibTemplates(
    eventId: number,
    forceRefresh = false,
  ): Observable<IBibTemplate[]> {
    return this.http
      .get<BibTemplateResponse[]>(this.availableTemplatesApi, {
        params: { event: eventId },
        // The list belongs to the event, not the runner, and `event` is
        // already part of the cache key.
        context: withHttpCache({ scope: 'shared', refresh: forceRefresh }),
      })
      .pipe(
        map((response) =>
          response.flatMap((item): IBibTemplate[] => {
            const id = item['0(available_bibs_events)']?.bib_template;
            const preview = item['1(bib_template)']?.preview?.[0];
            // Templates have no name, so one without a preview could not be
            // told apart from the others - leave it out rather than offer it.
            if (id == null || !preview) {
              return [];
            }
            return [{ id, previewUrl: this.previewUrl(preview.name, preview.id) }];
          }),
        ),
      );
  }

  private previewUrl(fileName: string, fileId: string): string {
    // Built through the URL API rather than a template string, so a '#' or
    // '?' in an uploaded file name cannot truncate the query.
    const url = new URL(
      `/data/download/${encodeURIComponent(fileName)}`,
      AUTH_CREDENTIALS.app_url,
    );
    url.searchParams.set('attribute_id', PREVIEW_ATTRIBUTE_ID);
    url.searchParams.set('file_id', fileId);
    url.searchParams.set('version', '0');
    url.searchParams.set('token', this.authService.getToken());
    return url.toString();
  }
}
