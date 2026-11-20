import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Preferences } from '@capacitor/preferences';
import { EMPTY } from 'rxjs';
import { AuthService, RUNNER_CARD_PREF_KEY } from '../auth/auth.service';
import { UserPayload } from '../auth/responses/user-payload';
import { AUTH_CREDENTIALS } from '../secrets';
import { MyRaceService, RunnerNotFoundError } from './myrace.service';
import { RunnerInfoResponse } from './runner.info.resp';

const UUID = '879d0b94-9ea8-4985-9309-9af5020e3fe0';
const RECORD_ID = 1755621;

const RUNNER_INFO_API = new URL(
  `/api/${AUTH_CREDENTIALS.app_name}/get_runner_info/v1`,
  AUTH_CREDENTIALS.app_url,
).toString();
const ASSIGN_API = new URL(
  `/api/${AUTH_CREDENTIALS.app_name}/assign_bib_template/v1`,
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
      registration_level: null,
    },
    '1(event)': { name_en: 'Road Race', name_gr: null, id: 7, lp_event_id: null },
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
  let navigate: jasmine.Spy;
  let signedInUuid: string | null;
  /** Drives the service's sign-in effect. */
  let payload: WritableSignal<UserPayload | null>;
  /** Makes a POST complete without a value, as AuthInterceptor does when it
   * cannot recover from a 401. */
  let swallowPost: boolean;

  beforeEach(async () => {
    // Clears a card saved by an earlier test. Awaiting it also loads the
    // plugin's web implementation (localStorage) up front, so later calls run
    // in the order they are made.
    await Preferences.remove({ key: RUNNER_CARD_PREF_KEY });

    signedInUuid = UUID;
    swallowPost = false;
    payload = signal<UserPayload | null>(null);
    logoutRunner = jasmine.createSpy('logoutRunner').and.resolveTo();
    navigate = jasmine.createSpy('navigate').and.resolveTo(true);

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
            userPayload: payload.asReadonly(),
            getRunnerUUID: () => signedInUuid,
            logoutRunner,
          },
        },
        { provide: Router, useValue: { navigate } },
      ],
    });
    service = TestBed.inject(MyRaceService);
    httpMock = TestBed.inject(HttpTestingController);
    // Settle the constructor's effect (signed out: it clears the store)
    // before a test seeds the store.
    TestBed.tick();
  });

  afterEach(async () => {
    httpMock.verify();
    await Preferences.remove({ key: RUNNER_CARD_PREF_KEY });
  });

  function seed(body: RunnerInfoResponse = runnerInfo()): void {
    service.getRunnerInfo(UUID).subscribe({ error: () => undefined });
    httpMock.expectOne((r) => r.url === RUNNER_INFO_API).flush([body]);
  }

  /** Lets Preferences' promises resolve. */
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
  const offline = { status: 0, statusText: '' };
  const expectRunnerInfo = () =>
    httpMock.expectOne((r) => r.url === RUNNER_INFO_API);
  const savedCard = async () =>
    (await Preferences.get({ key: RUNNER_CARD_PREF_KEY })).value;
  const saveCard = (body: RunnerInfoResponse) =>
    Preferences.set({
      key: RUNNER_CARD_PREF_KEY,
      value: JSON.stringify([body]),
    });
  /** What the effect does when a session starts or is restored at launch. */
  const signIn = () => {
    payload.set({ uuid: UUID });
    TestBed.tick();
  };

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

  describe('when a load fails', () => {
    it('keeps the runner signed in when offline, and passes the error on', () => {
      let failed = false;
      service.getRunnerInfo(UUID).subscribe({ error: () => (failed = true) });
      expectRunnerInfo().error(new ProgressEvent('error'), offline);

      expect(failed).toBeTrue();
      expect(logoutRunner).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('keeps the runner signed in on a server error', () => {
      service.getRunnerInfo(UUID).subscribe({ error: () => undefined });
      expectRunnerInfo().flush('down', {
        status: 500,
        statusText: 'Server Error',
      });

      expect(logoutRunner).not.toHaveBeenCalled();
    });

    it('keeps the runner signed in when the body is not a list, as from a captive portal', () => {
      service.getRunnerInfo(UUID).subscribe({ error: () => undefined });
      expectRunnerInfo().flush('<html>Sign in to the Wi-Fi</html>');

      expect(logoutRunner).not.toHaveBeenCalled();
    });

    it('keeps the card on screen when a refresh fails', () => {
      seed();
      service.getRunnerInfo(UUID, true).subscribe({ error: () => undefined });
      expectRunnerInfo().error(new ProgressEvent('error'), offline);

      expect(service.runner$()?.runner.bib).toBe('1234');
      expect(logoutRunner).not.toHaveBeenCalled();
    });

    it('signs the runner out when the server has no registration for them', () => {
      let error: unknown;
      service.getRunnerInfo(UUID).subscribe({ error: (e) => (error = e) });
      expectRunnerInfo().flush([]);

      expect(error).toBeInstanceOf(RunnerNotFoundError);
      expect(logoutRunner).toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith(['/tabs/login']);
    });

    it('does not store a card that lands after the runner signed out', async () => {
      service.getRunnerInfo(UUID).subscribe({ error: () => undefined });
      signedInUuid = null;
      expectRunnerInfo().flush([runnerInfo()]);
      await settle();

      expect(service.runner$()).toBeNull();
      expect(await savedCard()).toBeNull();
    });
  });

  describe('saved card', () => {
    it('saves the raw body of a successful read', async () => {
      seed();

      expect(JSON.parse((await savedCard()) ?? 'null')).toEqual([runnerInfo()]);
    });

    it('restores the saved card at sign-in when the network fails', async () => {
      await saveCard(runnerInfo());
      signIn();
      expectRunnerInfo().error(new ProgressEvent('error'), offline);
      await settle();

      expect(service.runner$()?.runner.bib).toBe('1234');
      expect(logoutRunner).not.toHaveBeenCalled();
    });

    it('ignores a saved card that belongs to another runner', async () => {
      const body = runnerInfo();
      await saveCard({
        ...body,
        '0(runner)': { ...body['0(runner)'], uuid: 'someone-else' },
      });
      signIn();
      expectRunnerInfo().error(new ProgressEvent('error'), offline);
      await settle();

      expect(service.runner$()).toBeNull();
    });

    it('never replaces a card that has already landed', async () => {
      await saveCard(runnerInfo(1));
      signIn();
      expectRunnerInfo().flush([runnerInfo(2)]);
      await settle();

      expect(assigned()).toBe(2);
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
