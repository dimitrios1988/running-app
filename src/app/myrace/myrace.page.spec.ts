import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';
import { Observable, of, tap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { SettingsService } from '../settings/settings.service';
import { ToastService } from '../shared/services/toast.service';
import { MyracePage } from './myrace.page';
import { MyRaceService, RunnerNotFoundError } from './myrace.service';
import { IRunner } from './runner.interface';

const UUID = 'runner-uuid';

const RUNNER: IRunner = {
  runner: {
    uuid: UUID,
    bib: '1234',
    birthdate: null,
    block: null,
    club: null,
    email: 'runner@example.com',
    fathersName: null,
    firstName: 'Maria',
    gender: null,
    nationality: null,
    lastName: 'Papa',
    ageGroup: null,
    registrationLevel: null,
  },
  event: { id: 7, nameEn: 'Road Race', nameGr: null, lp_event_id: null },
  place: { nameEn: '5K', nameGr: null },
  // No registration record, so no QR face and no request for one.
  lp_runner: null,
};

/** What a request fails with when the device is offline. */
const offline = () =>
  new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' });

describe('MyracePage', () => {
  let fixture: ComponentFixture<MyracePage>;
  let page: MyracePage;
  /** The store MyRaceService keeps. */
  let runner: WritableSignal<IRunner | null>;
  /** What the next getRunnerInfo call answers with. */
  let response: () => Observable<IRunner>;
  let getRunnerInfo: jasmine.Spy;
  let logoutRunner: jasmine.Spy;
  let showWarning: jasmine.Spy;

  function render(): void {
    TestBed.configureTestingModule({
      imports: [MyracePage],
      providers: [
        // ModalController only exists once Ionic's providers are present.
        provideIonicAngular(),
        provideTranslateService(),
        provideRouter([]),
        {
          provide: MyRaceService,
          useValue: { runner$: runner.asReadonly(), getRunnerInfo },
        },
        {
          provide: AuthService,
          useValue: { getRunnerUUID: () => UUID, logoutRunner },
        },
        {
          provide: SettingsService,
          useValue: { selectedLanguage$: signal('en').asReadonly() },
        },
        { provide: ToastService, useValue: { showWarning } },
      ],
    });
    fixture = TestBed.createComponent(MyracePage);
    page = fixture.componentInstance;
    fixture.detectChanges();
    // Ionic calls this on navigation; a TestBed render does not.
    page.ionViewWillEnter();
    fixture.detectChanges();
  }

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);
  const bib = () => query('.bib-number')?.textContent ?? '';

  /** Answers as MyRaceService does: a success lands in the store. */
  const succeeds =
    (card: IRunner = RUNNER) =>
    () =>
      of(card).pipe(tap((r) => runner.set(r)));
  const fails = (error: unknown) => () => throwError(() => error);

  function pullToRefresh(): jasmine.Spy {
    const complete = jasmine.createSpy('complete');
    page.doRefresh({ target: { complete } } as unknown as Parameters<
      MyracePage['doRefresh']
    >[0]);
    fixture.detectChanges();
    return complete;
  }

  beforeEach(() => {
    runner = signal<IRunner | null>(null);
    response = succeeds();
    getRunnerInfo = jasmine
      .createSpy('getRunnerInfo')
      .and.callFake(() => response());
    logoutRunner = jasmine.createSpy('logoutRunner').and.resolveTo();
    showWarning = jasmine.createSpy('showWarning').and.resolveTo();
  });

  it('shows the card once it loads', () => {
    render();

    expect(bib()).toContain('1234');
    expect(query('.app-empty')).toBeNull();
  });

  it('shows an offline message, not the login page, when there is no card to show', () => {
    response = fails(offline());
    render();

    expect(query('.app-empty')?.textContent).toContain(
      'MY_RACE.ERRORS.LOAD_FAILED',
    );
    expect(query('.app-skeleton')).toBeNull();
    expect(logoutRunner).not.toHaveBeenCalled();
  });

  it('loads the card when Try again is tapped on the offline message', () => {
    response = fails(offline());
    render();

    response = succeeds();
    query('.app-empty ion-button')?.click();
    fixture.detectChanges();

    expect(getRunnerInfo).toHaveBeenCalledTimes(2);
    expect(query('.app-empty')).toBeNull();
    expect(bib()).toContain('1234');
  });

  it('keeps the card and warns when a pull-to-refresh fails', () => {
    render();

    response = fails(offline());
    const complete = pullToRefresh();

    expect(getRunnerInfo).toHaveBeenCalledWith(UUID, true);
    expect(complete).toHaveBeenCalled();
    expect(showWarning).toHaveBeenCalledOnceWith(
      'MY_RACE.ERRORS.REFRESH_FAILED',
    );
    expect(bib()).toContain('1234');
    expect(query('.app-empty')).toBeNull();
  });

  it('keeps a saved card on screen, without a warning, when the tab is entered offline', () => {
    runner.set(RUNNER);
    response = fails(offline());
    render();

    expect(bib()).toContain('1234');
    expect(showWarning).not.toHaveBeenCalled();
  });

  it('draws the QR code on the device rather than fetching it', () => {
    response = succeeds({
      ...RUNNER,
      lp_runner: {
        id: 1755621,
        runnerQrData: 'QR-1234',
        isPrinted: false,
        isPrintable: true,
        receivesAsAGroup: false,
        assignedBibTemplate: null,
        registrationLevel: { bibTemplateSelectionAllowed: false },
      },
    });
    render();

    // Also proves Angular's URL sanitizer lets the data URL through: an
    // unsafe one would come back prefixed with "unsafe:".
    const src = query('img.bib-qr-img')?.getAttribute('src') ?? '';
    expect(src.startsWith('data:image/svg+xml;base64,')).toBeTrue();
  });

  it('leaves a registration the server no longer knows to MyRaceService', () => {
    response = fails(new RunnerNotFoundError());
    render();

    // The service signs out and redirects; no offline message in between.
    expect(query('.app-empty')).toBeNull();
    expect(showWarning).not.toHaveBeenCalled();
  });
});
