import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { AuthService } from '../../auth/auth.service';
import { AUTH_CREDENTIALS } from '../../secrets';
import { BibTemplateResponse } from './bib-template.resp';
import { IBibTemplate } from './bib-template.interface';
import { BibTemplateService } from './bib-template.service';

const API = new URL(
  '/api/mobile_app_manager/get_available_bib_templates/v1',
  AUTH_CREDENTIALS.app_url,
).toString();

/** One row as the endpoint returns it (see the sample in the feature plan). */
function row(
  templateId: number | null,
  file: { id: string; name: string } | null,
): BibTemplateResponse {
  return {
    '0(available_bibs_events)': { bib_template: templateId },
    '1(bib_template)': {
      preview: file
        ? [{ changed: 1794236379, hash: 'h', size: 62, version: 0, ...file }]
        : null,
    },
  };
}

describe('BibTemplateService', () => {
  let service: BibTemplateService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getToken: () => 'live-token' } },
      ],
    });
    service = TestBed.inject(BibTemplateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('asks for the templates of the given event', () => {
    service.getAvailableBibTemplates(7).subscribe();

    const req = httpMock.expectOne((r) => r.url === API);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('event')).toBe('7');
    req.flush([]);
  });

  it('takes the id from the join row and builds the preview download url', () => {
    let result: IBibTemplate[] = [];
    service.getAvailableBibTemplates(7).subscribe((t) => (result = t));

    httpMock
      .expectOne((r) => r.url === API)
      .flush([
        row(2, { id: '4901939b-4989-435b-bd85-e48b5cfabf74', name: 'kids.png' }),
        row(3, { id: '5e6554ef-da3d-4d6a-9d0b-ef5f8d74da9c', name: 'heraklion.png' }),
      ]);

    expect(result.map((t) => t.id)).toEqual([2, 3]);
    const url = new URL(result[0].previewUrl);
    expect(url.pathname).toBe('/data/download/kids.png');
    expect(url.searchParams.get('attribute_id')).toBe(
      '83910437-bd1f-49e7-a217-85abf6a274d5',
    );
    expect(url.searchParams.get('file_id')).toBe(
      '4901939b-4989-435b-bd85-e48b5cfabf74',
    );
    expect(url.searchParams.get('version')).toBe('0');
    expect(url.searchParams.get('token')).toBe('live-token');
  });

  it('keeps a "#" in a file name inside the path instead of cutting the query off', () => {
    let result: IBibTemplate[] = [];
    service.getAvailableBibTemplates(7).subscribe((t) => (result = t));

    httpMock
      .expectOne((r) => r.url === API)
      .flush([row(2, { id: 'f1', name: 'bib #1.png' })]);

    const url = new URL(result[0].previewUrl);
    expect(decodeURIComponent(url.pathname)).toBe('/data/download/bib #1.png');
    expect(url.searchParams.get('file_id')).toBe('f1');
  });

  it('leaves out rows without a template id or a preview', () => {
    let result: IBibTemplate[] = [];
    service.getAvailableBibTemplates(7).subscribe((t) => (result = t));

    httpMock.expectOne((r) => r.url === API).flush([
      row(null, { id: 'f1', name: 'a.png' }),
      row(4, null),
      { ...row(5, { id: 'f5', name: 'e.png' }), '1(bib_template)': null },
      { ...row(6, { id: 'f6', name: 'f.png' }), '0(available_bibs_events)': null },
      row(7, { id: 'f7', name: 'g.png' }),
    ]);

    expect(result.map((t) => t.id)).toEqual([7]);
  });
});
