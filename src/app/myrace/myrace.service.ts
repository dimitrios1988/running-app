import { effect, inject, Injectable, signal } from '@angular/core';
import { IRunner } from './runner.interface';
import { AUTH_CREDENTIALS } from '../secrets';
import {
  catchError,
  map,
  Observable,
  Subscription,
  tap,
  throwError,
  throwIfEmpty,
} from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Preferences } from '@capacitor/preferences';
import { RunnerInfoResponse } from './runner.info.resp';
import {
  AssignBibTemplateRequest,
  AssignBibTemplateResponse,
} from './assign-bib-template.resp';
import { AuthService, RUNNER_CARD_PREF_KEY } from '../auth/auth.service';
import { Router } from '@angular/router';
import { withHttpCache } from '../shared/cache/http-cache.context';

/**
 * The server answered and has no registration for this runner: get_runner_info
 * returns 200 with an empty list for a uuid it does not know. This is the only
 * load failure that signs the runner out - being offline, a timeout or a server
 * error never does.
 */
export class RunnerNotFoundError extends Error {
  constructor() {
    super('get_runner_info/v1 has no registration for this runner');
    this.name = 'RunnerNotFoundError';
  }
}

/**
 * Maps a get_runner_info body to the store's card. The network path and the
 * saved card both go through it, so both get the same guards.
 */
function toRunner(response: RunnerInfoResponse[]): IRunner {
  if (Array.isArray(response) && !response[0]?.['0(runner)']) {
    throw new RunnerNotFoundError();
  }
  return {
    runner: {
      uuid: response[0]['0(runner)'].uuid,
      bib: response[0]['0(runner)'].bib,
      birthdate: response[0]['0(runner)'].birthdate
        ? new Date(response[0]['0(runner)'].birthdate * 1000)
        : null,
      block: response[0]['0(runner)'].block,
      club: response[0]['0(runner)'].club,
      email: response[0]['0(runner)'].email,
      fathersName: response[0]['0(runner)'].fathers_name,
      firstName: response[0]['0(runner)'].first_name,
      gender: response[0]['0(runner)'].gender,
      lastName: response[0]['0(runner)'].last_name,
      nationality: response[0]['0(runner)'].nationality,
      ageGroup: response[0]['0(runner)'].age_group,
      registrationLevel: response[0]['0(runner)'].registration_level,
    },
    event: {
      nameEn: response[0]['1(event)'].name_en,
      nameGr: response[0]['1(event)'].name_gr,
      id: response[0]['1(event)'].id,
      lp_event_id: response[0]['1(event)'].lp_event_id,
    },
    place: {
      nameGr: response[0]['2(category)'].name_gr,
      nameEn: response[0]['2(category)'].name_en,
    },
    lp_runner: response[0]['3(runner)']
      ? {
          isPrintable: response[0]['3(runner)'].is_printable,
          isPrinted: response[0]['3(runner)'].is_printed,
          runnerQrData: response[0]['3(runner)'].runner_qr_data,
          receivesAsAGroup: response[0]['3(runner)'].receives_as_a_group,
          // All guarded: a throw in here fails the whole card. Bodies cached
          // or saved before the backend added these fields are replayed first
          // after an app update, so the missing shape has to map to "no record
          // id, no template, not allowed".
          id: response[0]['3(runner)'].id ?? null,
          assignedBibTemplate:
            response[0]['3(runner)'].assigned_bib_template ?? null,
          registrationLevel: {
            bibTemplateSelectionAllowed:
              response[0]['4(registration_level)']
                ?.bib_template_selection_allowed ?? false,
          },
        }
      : null,
  } as IRunner;
}

@Injectable({
  providedIn: 'root',
})
export class MyRaceService {
  private readonly _runner = signal<IRunner | null>(null);
  public readonly runner$ = this._runner.asReadonly();
  private readonly http: HttpClient = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private backgroundRefreshSub: Subscription = Subscription.EMPTY;
  private runnerInfoSub: Subscription = Subscription.EMPTY;
  /** The body last written to Preferences. Every tab entry replays the same
   * card from the HTTP cache, and an unchanged one costs no write. */
  private savedCardJson: string | null = null;

  private readonly assignBibTemplateApi = new URL(
    `/api/${AUTH_CREDENTIALS.app_name}/assign_bib_template/v1`,
    AUTH_CREDENTIALS.app_url
  ).toString();

  constructor() {
    // Read no signal here but userPayload. Each signed-in run fetches the
    // runner, so depending on _runner would re-fetch every time one lands.
    effect(() => {
      const payload = this.authService.userPayload();
      // Signing out removed the saved card, so a new session must write its
      // first one even when the body matches the last write.
      this.savedCardJson = null;
      if (!payload) {
        // Reads still in flight must not put a signed-out runner back.
        this.runnerInfoSub.unsubscribe();
        this.backgroundRefreshSub.unsubscribe();
        this._runner.set(null);
      } else {
        // Signed in: a login, or a saved session restored at app start.
        void this.restoreSavedCard(payload.uuid);
        // A failure keeps whatever card is on screen; the page shows its own
        // offline state.
        this.runnerInfoSub = this.getRunnerInfo(payload.uuid).subscribe({
          error: () => undefined,
        });
      }
    });
  }

  /**
   * Loads the runner's card into the store. Only RunnerNotFoundError signs the
   * runner out; every other failure keeps the session and the card already on
   * screen. Errors are rethrown either way, so callers can show their state.
   */
  getRunnerInfo(uuid: string, forceRefresh = false): Observable<IRunner> {
    return this.fetchRunnerInfo(uuid, forceRefresh).pipe(
      catchError((error) => {
        // The uuid check stops a late answer about a previous runner from
        // signing out whoever is signed in now.
        if (
          error instanceof RunnerNotFoundError &&
          this.authService.getRunnerUUID() === uuid
        ) {
          void this.authService.logoutRunner();
          this.router.navigate(['/tabs/login']);
        }
        throw error;
      })
    );
  }

  /**
   * Saves the runner's choice of bib template. Emits once the server has
   * confirmed it, by which point the store already holds the new assignment.
   */
  assignBibTemplate(templateId: number): Observable<void> {
    const current = this._runner();
    const lpRunnerId = current?.lp_runner?.id;
    if (!current || lpRunnerId == null) {
      return throwError(
        () => new Error('No registration to assign a bib template to')
      );
    }

    const uuid = current.runner.uuid;
    const body: AssignBibTemplateRequest = {
      '0(runner)': { id: lpRunnerId, assigned_bib_template: templateId },
      '1(runner)': { uuid },
    };
    return this.http
      .post<AssignBibTemplateResponse | null>(this.assignBibTemplateApi, body)
      .pipe(
        // AuthInterceptor completes without a value when it cannot recover a
        // 401. That is a failed save, not one still pending.
        throwIfEmpty(
          () => new Error('assign_bib_template/v1 gave no response')
        ),
        map((response) => {
          // A 200 is only trusted when it names the record that was sent.
          if (Number(response?.['0']) !== lpRunnerId) {
            throw new Error(
              'assign_bib_template/v1 did not confirm the assignment'
            );
          }
        }),
        tap(() => {
          this.patchAssignedBibTemplate(templateId);
          this.refreshInBackground(uuid);
        })
      );
  }

  /** The request, mapping, store update and saved card, without
   * getRunnerInfo's sign-out on RunnerNotFoundError. */
  private fetchRunnerInfo(
    uuid: string,
    forceRefresh: boolean
  ): Observable<IRunner> {
    const runnerInfoApi = new URL(
      `/api/${AUTH_CREDENTIALS.app_name}/get_runner_info/v1`,
      AUTH_CREDENTIALS.app_url
    ).toString();
    return this.http
      .get<RunnerInfoResponse[]>(runnerInfoApi, {
        params: { uuid },
        context: withHttpCache({ scope: 'user', refresh: forceRefresh }),
      })
      .pipe(
        map((response) => ({ response, runner: toRunner(response) })),
        tap(({ response, runner }) => {
          // Signed out, or someone else signed in, while this was in flight:
          // storing it would put a signed-out runner back.
          if (this.authService.getRunnerUUID() !== uuid) {
            return;
          }
          this._runner.set(runner);
          this.saveCard(response);
        }),
        map(({ runner }) => runner)
      );
  }

  /**
   * Keeps the raw body rather than the mapped card, as the HTTP cache does:
   * toRunner re-maps it with the guards of whichever version reads it back,
   * and the epoch birthdate needs no Date revival.
   */
  private saveCard(response: RunnerInfoResponse[]): void {
    const json = JSON.stringify(response);
    if (json === this.savedCardJson) {
      return;
    }
    this.savedCardJson = json;
    Preferences.set({ key: RUNNER_CARD_PREF_KEY, value: json }).catch(() => {
      // Let the next read try again rather than skip it as unchanged.
      this.savedCardJson = null;
    });
  }

  /**
   * Paints the last card this device saw, so the registration shows offline
   * even when the HTTP cache has nothing: expired, cleared, or purged by the OS.
   * Never replaces a card that has already landed, since that one is newer.
   */
  private async restoreSavedCard(uuid: string): Promise<void> {
    let saved: string | null;
    try {
      saved = (await Preferences.get({ key: RUNNER_CARD_PREF_KEY })).value;
    } catch {
      return;
    }
    // Every signal read sits after the await, so the calling effect still
    // tracks nothing but userPayload.
    if (!saved || this._runner() || this.authService.getRunnerUUID() !== uuid) {
      return;
    }
    try {
      const runner = toRunner(JSON.parse(saved) as RunnerInfoResponse[]);
      if (runner.runner.uuid === uuid) {
        this._runner.set(runner);
      }
    } catch {
      // Unreadable, or a shape this version cannot map. The HTTP cache or the
      // network fills the card in instead.
    }
  }

  private patchAssignedBibTemplate(templateId: number): void {
    this._runner.update((runner) =>
      runner?.lp_runner
        ? {
            ...runner,
            lp_runner: { ...runner.lp_runner, assignedBibTemplate: templateId },
          }
        : runner
    );
  }

  /**
   * Re-reads the runner after a change. HttpCacheInterceptor serves its copy
   * for 30s without touching the network, so otherwise the next tab switch
   * would put the old assignment back. A failure here must not log the runner
   * out the way getRunnerInfo would: the store already holds the change.
   */
  private refreshInBackground(uuid: string): void {
    // Signed out, or someone else signed in, while the save was in flight.
    if (this.authService.getRunnerUUID() !== uuid) {
      return;
    }
    this.backgroundRefreshSub.unsubscribe();
    this.backgroundRefreshSub = this.fetchRunnerInfo(uuid, true).subscribe({
      error: () => undefined,
    });
  }
}
