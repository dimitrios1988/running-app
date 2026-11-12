import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { EMPTY } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { UserPayload } from '../auth/responses/user-payload';
import { AUTH_CREDENTIALS } from '../secrets';
import { MyRaceService } from './myrace.service';
import { RunnerInfoResponse } from './runner.info.resp';

const UUID = '879d0b94-9ea8-4985-9309-9af5020e3fe0';
const RECORD_ID = 1755621;

const RUNNER_INFO_API = new URL(
  '/api/mobile_app_manager/get_runner_info/v1',
  AUTH_CREDENTIALS.app_url,
).toString();
const ASSIGN_API = new URL(
  '/api/mobile_app_manager/assign_bib_template/v1',
  AUTH_CREDENTIALS.app_url,
).toString();

function runnerInfo(assignedTemplate = 3): RunnerInfoResponse {
  return {
    '0(runner)': {
      uuid: UUID,
      bib: '1234',
      birthdate: null,
      block: null,
      club: null,
      email: 'runner@example.com',
      fathers_name: null,
      first_name: 'Maria',
      gender: null,
      nationality: null,
      last_name: 'Papa',
      age_group: null,
    },
    '1(event)': { name_en: 'Road Race', name_gr: null, id: 7 },
    '2(category)': { name_gr: null, name_en: '5K' },
    '3(runner)': {
      id: RECORD_ID,
      runner_qr_data: 'qr',
      is_printed: false,
      is_printable: true,
      receives_as_a_group: false,
      assigned_bib_template: assignedTemplate,
    },
    '4(registration_level)': { bib_template_selection_allowed: true },
  };
}

describe('MyRaceService', () => {
  let service: MyRaceService;
  let httpMock: HttpTestingController;
  let logoutRunner: jasmine.Spy;
  let signedInUuid: string | null;
  /** Makes a POST complete without a value, as AuthInterceptor does when it
   * cannot recover from a 401. */
  let swallowPost: boolean;

  beforeEach(() => {
    signedInUuid = UUID;
    swallowPost = false;
    logoutRunner = jasmine.createSpy('logoutRunner').and.resolveTo();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(
          withInterceptors([
            (req, next) =>
              swallowPost && req.method === 'POST' ? EMPTY : next(req),
          ]),
        ),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            userPayload: signal<UserPayload | null>(null).asReadonly(),
            getRunnerUUID: () => signedInUuid,
            logoutRunner,
          },
        },
        {
          provide: Router,
          useValue: { navigate: jasmine.createSpy('navigate').and.resolveTo(true) },
        },
      ],
    });
    service = TestBed.inject(MyRaceService);
    httpMock = TestBed.inject(HttpTestingController);
    // Settle the constructor's effect (signed out: it clears the store)
    // before a test seeds the store.
    TestBed.tick();
  });

  afterEach(() => httpMock.verify());

  function seed(body: RunnerInfoResponse = runnerInfo()): void {
    service.getRunnerInfo(UUID).subscribe({ error: () => undefined });
    httpMock.expectOne((r) => r.url === RUNNER_INFO_API).flush([body]);
  }

  const assigned = () => service.runner$()?.lp_runner?.assignedBibTemplate;
  const expectAssign = () =>
    httpMock.expectOne((r) => r.url === ASSIGN_API && r.method === 'POST');
  const expectReRead = () =>
    httpMock.expectOne((r) => r.url === RUNNER_INFO_API);

  describe('runner info', () => {
    it("maps the registration record's id", () => {
      seed();
      expect(service.runner$()?.lp_runner?.id).toBe(RECORD_ID);
    });

    it('reads a body cached before the template fields as "not allowed", without logging out', () => {
      seed({
        ...runnerInfo(),
        '3(runner)': {
          runner_qr_data: 'qr',
          is_printed: false,
          is_printable: true,
          receives_as_a_group: false,
        },
        '4(registration_level)': undefined,
      } as unknown as RunnerInfoResponse);

      expect(logoutRunner).not.toHaveBeenCalled();
      expect(service.runner$()?.lp_runner).toEqual(
        jasmine.objectContaining({
          id: null,
          assignedBibTemplate: null,
          registrationLevel: { bibTemplateSelectionAllowed: false },
        }),
      );
    });
  });

  describe('assignBibTemplate', () => {
    it('posts the choice in the shape the endpoint expects', () => {
      seed();
      service.assignBibTemplate(2).subscribe();

      const req = expectAssign();
      expect(req.request.body).toEqual({
        '0(runner)': { id: RECORD_ID, assigned_bib_template: 2 },
        '1(runner)': { uuid: UUID },
      });
      req.flush({ '0': RECORD_ID, '1': 3672890 });
      expectReRead().flush([runnerInfo(2)]);
    });

    it('on a confirmed save, moves the store and re-reads the runner past the cache', () => {
      seed();
      let saved = false;
      service.assignBibTemplate(2).subscribe(() => (saved = true));
      expectAssign().flush({ '0': RECORD_ID, '1': 3672890 });

      expect(saved).toBeTrue();
      expect(assigned()).toBe(2);
      const reRead = expectReRead();
      expect(reRead.request.params.get('uuid')).toBe(UUID);
      reRead.flush([runnerInfo(2)]);
      expect(assigned()).toBe(2);
    });

    it('keeps the runner signed in when that re-read fails', () => {
      seed();
      service.assignBibTemplate(2).subscribe();
      expectAssign().flush({ '0': RECORD_ID, '1': 3672890 });

      expectReRead().error(new ProgressEvent('error'));

      expect(logoutRunner).not.toHaveBeenCalled();
      expect(assigned()).toBe(2);
    });

    it('skips the re-read for a runner who signed out while it saved', () => {
      seed();
      service.assignBibTemplate(2).subscribe();
      signedInUuid = null;
      expectAssign().flush({ '0': RECORD_ID, '1': 3672890 });

      httpMock.expectNone((r) => r.url === RUNNER_INFO_API);
      expect(assigned()).toBe(2);
    });

    it('treats a 200 that does not name the record as a failed save', () => {
      seed();
      let failed = false;
      service.assignBibTemplate(2).subscribe({ error: () => (failed = true) });
      expectAssign().flush({ '0': null, '1': null });

      expect(failed).toBeTrue();
      expect(assigned()).toBe(3);
    });

    it('fails on an HTTP error and leaves the store alone', () => {
      seed();
      let failed = false;
      service.assignBibTemplate(2).subscribe({ error: () => (failed = true) });
      expectAssign().flush(
        { message: 'already printed' },
        { status: 409, statusText: 'Conflict' },
      );

      expect(failed).toBeTrue();
      expect(assigned()).toBe(3);
      expect(logoutRunner).not.toHaveBeenCalled();
    });

    it('fails, rather than hanging, when the request completes without a response', () => {
      seed();
      swallowPost = true;
      let failed = false;
      service.assignBibTemplate(2).subscribe({ error: () => (failed = true) });

      expect(failed).toBeTrue();
      expect(assigned()).toBe(3);
    });

    it('sends nothing without a registration record id', () => {
      const body = runnerInfo();
      seed({
        ...body,
        '3(runner)': { ...body['3(runner)'], id: null },
      } as unknown as RunnerInfoResponse);

      let failed = false;
      service.assignBibTemplate(2).subscribe({ error: () => (failed = true) });

      expect(failed).toBeTrue();
      // httpMock.verify() fails if a POST went out anyway
    });
  });
});
