import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ModalController,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';
import { EMPTY, Observable, of, Subject, throwError } from 'rxjs';
import { ImageCacheService } from '../../shared/cache/image-cache.service';
import { ToastService } from '../../shared/services/toast.service';
import { MyRaceService } from '../myrace.service';
import { IRunner } from '../runner.interface';
import { IBibTemplate } from './bib-template.interface';
import { BibTemplatePickerComponent } from './bib-template-picker.component';
import { BibTemplateService } from './bib-template.service';

/** A local image, so CachedSrcDirective never goes near the network. */
const PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const TEMPLATES: IBibTemplate[] = [
  { id: 2, previewUrl: PIXEL },
  { id: 3, previewUrl: PIXEL },
];

function runnerAssignedTo(templateId: number | null): IRunner {
  return {
    runner: {
      uuid: 'runner-uuid',
      bib: '1234',
      birthdate: null,
      block: null,
      club: null,
      email: 'runner@example.com',
      fathersName: null,
      firstName: null,
      gender: null,
      nationality: null,
      lastName: null,
      ageGroup: null,
    },
    event: { id: 7, nameEn: null, nameGr: null },
    place: { nameEn: null, nameGr: null },
    lp_runner: {
      id: 1755621,
      runnerQrData: '',
      isPrinted: false,
      isPrintable: true,
      receivesAsAGroup: false,
      assignedBibTemplate: templateId,
      registrationLevel: { bibTemplateSelectionAllowed: true },
    },
  };
}

describe('BibTemplatePickerComponent', () => {
  let fixture: ComponentFixture<BibTemplatePickerComponent>;
  let component: BibTemplatePickerComponent;
  let runner: WritableSignal<IRunner | null>;
  let response: Observable<IBibTemplate[]>;
  let getAvailableBibTemplates: jasmine.Spy;
  /** Each test decides when, and how, the save settles. */
  let save$: Subject<void>;
  let assignBibTemplate: jasmine.Spy;
  let toast: { showSuccess: jasmine.Spy; showError: jasmine.Spy };
  let dismiss: jasmine.Spy;

  function render(): void {
    TestBed.configureTestingModule({
      imports: [BibTemplatePickerComponent],
      providers: [
        // ModalController only exists once Ionic's providers are present.
        provideIonicAngular(),
        provideTranslateService(),
        {
          provide: MyRaceService,
          useValue: { runner$: runner.asReadonly(), assignBibTemplate },
        },
        { provide: BibTemplateService, useValue: { getAvailableBibTemplates } },
        { provide: ToastService, useValue: toast },
        {
          provide: ImageCacheService,
          useValue: {
            peek: (url: string | null | undefined) => url ?? null,
            resolve: (url: string) => Promise.resolve(url),
          },
        },
      ],
    });
    dismiss = spyOn(TestBed.inject(ModalController), 'dismiss').and.resolveTo(
      true,
    );
    fixture = TestBed.createComponent(BibTemplatePickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  const cards = (): HTMLButtonElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('button.template'));
  const checked = (): string[] =>
    cards().map((card) => card.getAttribute('aria-checked') ?? '');
  const pillText = (): string =>
    fixture.nativeElement.querySelector('.template-selected')?.textContent ??
    '';

  /** Taps the first design (id 2), which is not the assigned one. */
  function tapFirst(): void {
    cards()[0].click();
    fixture.detectChanges();
  }

  beforeEach(() => {
    runner = signal<IRunner | null>(runnerAssignedTo(3));
    response = of(TEMPLATES);
    getAvailableBibTemplates = jasmine
      .createSpy('getAvailableBibTemplates')
      .and.callFake(() => response);
    save$ = new Subject<void>();
    assignBibTemplate = jasmine
      .createSpy('assignBibTemplate')
      .and.callFake(() => save$);
    toast = {
      showSuccess: jasmine.createSpy('showSuccess').and.resolveTo(),
      showError: jasmine.createSpy('showError').and.resolveTo(),
    };
  });

  describe('showing the designs', () => {
    it("asks for the runner's event", () => {
      render();
      expect(getAvailableBibTemplates).toHaveBeenCalledOnceWith(7, false);
    });

    it('marks the assigned template, and only that one', () => {
      render();

      expect(checked()).toEqual(['false', 'true']);
      expect(cards()[1].classList.contains('is-selected')).toBeTrue();
      const pills = fixture.nativeElement.querySelectorAll('.template-selected');
      expect(pills.length).toBe(1);
      expect(cards()[1].contains(pills[0])).toBeTrue();
    });

    it('marks nothing when no template is assigned yet', () => {
      runner.set(runnerAssignedTo(null));
      render();

      expect(checked()).toEqual(['false', 'false']);
    });

    it("follows the server's assignment when it changes", () => {
      render();

      runner.set(runnerAssignedTo(2));
      fixture.detectChanges();

      expect(checked()).toEqual(['true', 'false']);
    });

    it('shows the empty state when the event has no templates', () => {
      response = of([]);
      render();

      expect(cards().length).toBe(0);
      expect(fixture.nativeElement.querySelector('.app-empty')).not.toBeNull();
    });

    it('offers a retry after a failure, and retries past the cache', () => {
      response = throwError(() => new Error('offline'));
      render();
      expect(cards().length).toBe(0);
      const retry: HTMLElement =
        fixture.nativeElement.querySelector('.app-empty ion-button');
      expect(retry).not.toBeNull();

      response = of(TEMPLATES);
      retry.click();
      fixture.detectChanges();

      expect(getAvailableBibTemplates).toHaveBeenCalledWith(7, true);
      expect(cards().length).toBe(2);
    });

    it('treats a load that completes with nothing as a failure', () => {
      // What AuthInterceptor does when it cannot recover from a 401.
      response = EMPTY;
      render();

      expect(component.loading()).toBeFalse();
      expect(component.loadError()).toBeTrue();
    });
  });

  describe('saving a choice', () => {
    it('moves the mark at once and saves the tapped design', () => {
      render();
      tapFirst();

      expect(checked()).toEqual(['true', 'false']);
      expect(assignBibTemplate).toHaveBeenCalledOnceWith(2);
    });

    it('does not save the design that is already selected', () => {
      render();
      cards()[1].click();

      expect(assignBibTemplate).not.toHaveBeenCalled();
    });

    it('locks every card and says it is saving while the save is in flight', () => {
      render();
      tapFirst();

      expect(cards().every((card) => card.disabled)).toBeTrue();
      expect(cards()[0].getAttribute('aria-busy')).toBe('true');
      expect(pillText()).toContain('MY_RACE.BIB_APPEARANCE.SAVING');

      cards()[1].click();
      expect(assignBibTemplate).toHaveBeenCalledTimes(1);
    });

    it('on success, confirms with a toast and closes the modal', () => {
      render();
      tapFirst();

      save$.next();
      save$.complete();

      expect(toast.showSuccess).toHaveBeenCalledOnceWith(
        'MY_RACE.BIB_APPEARANCE.SAVED',
      );
      expect(dismiss).toHaveBeenCalledOnceWith(2, 'saved');
    });

    it('on failure, puts the old choice back, explains, and stays open', () => {
      render();
      tapFirst();

      save$.error(new Error('rejected'));
      fixture.detectChanges();

      expect(checked()).toEqual(['false', 'true']);
      expect(toast.showError).toHaveBeenCalledOnceWith(
        'MY_RACE.BIB_APPEARANCE.SAVE_ERROR',
      );
      expect(dismiss).not.toHaveBeenCalled();
      expect(cards().some((card) => card.disabled)).toBeFalse();
    });

    it('still reports a save that lands after the runner closed the modal, without dismissing twice', async () => {
      render();
      tapFirst();

      await component.close();
      save$.next();
      save$.complete();

      expect(dismiss).toHaveBeenCalledTimes(1);
      expect(toast.showSuccess).toHaveBeenCalledTimes(1);
    });

    it('keeps the tapped choice through a refresh that leaves the assignment as it was', () => {
      render();
      tapFirst();

      // a new runner object, same assigned template - e.g. a pull-to-refresh
      // landing while the save is still in flight
      runner.set(runnerAssignedTo(3));
      fixture.detectChanges();

      expect(checked()).toEqual(['true', 'false']);
    });
  });
});
