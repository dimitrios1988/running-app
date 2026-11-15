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
import { RunnerInfoResponse } from './runner.info.resp';
import {
  AssignBibTemplateRequest,
  AssignBibTemplateResponse,
} from './assign-bib-template.resp';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';
import { withHttpCache } from '../shared/cache/http-cache.context';

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

  private readonly assignBibTemplateApi = new URL(
    `/api/${AUTH_CREDENTIALS.app_name}/assign_bib_template/v1`,
    AUTH_CREDENTIALS.app_url,
  ).toString();

  constructor() {
    effect(() => {
      const payload = this.authService.userPayload();
      if (!payload) {
        // A re-read still in flight must not put a signed-out runner back.
        this.backgroundRefreshSub.unsubscribe();
        this._runner.set(null);
      } else {
        this.getRunnerInfo(payload.uuid).subscribe();
      }
    });
  }

  getRunnerInfo(uuid: string, forceRefresh = false): Observable<IRunner> {
    return this.fetchRunnerInfo(uuid, forceRefresh).pipe(
      catchError((error) => {
        this.authService.logoutRunner();
        this.router.navigate(['/tabs/login']);
        throw error;
      }),
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
        () => new Error('No registration to assign a bib template to'),
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
          () => new Error('assign_bib_template/v1 gave no response'),
        ),
        map((response) => {
          // A 200 is only trusted when it names the record that was sent.
          if (Number(response?.['0']) !== lpRunnerId) {
            throw new Error(
              'assign_bib_template/v1 did not confirm the assignment',
            );
          }
        }),
        tap(() => {
          this.patchAssignedBibTemplate(templateId);
          this.refreshInBackground(uuid);
        }),
      );
  }

  /** The request, mapping and store update, without getRunnerInfo's logout
   * on failure. */
  private fetchRunnerInfo(
    uuid: string,
    forceRefresh: boolean,
  ): Observable<IRunner> {
    const runnerInfoApi = new URL(
      `/api/${AUTH_CREDENTIALS.app_name}/get_runner_info/v1`,
      AUTH_CREDENTIALS.app_url,
    ).toString();
    return this.http
      .get<RunnerInfoResponse[]>(runnerInfoApi, {
        params: { uuid },
        context: withHttpCache({ scope: 'user', refresh: forceRefresh }),
      })
      .pipe(
        // You can add any necessary transformations here
        map((response: RunnerInfoResponse[]) => {
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
                  receivesAsAGroup:
                    response[0]['3(runner)'].receives_as_a_group,
                  // All guarded: a throw in here reaches getRunnerInfo's
                  // catchError and logs the runner out. Bodies cached before
                  // the backend added these fields are replayed first after an
                  // app update, so the missing shape has to map to "no record
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
        }),
        tap((runner: IRunner) => {
          this._runner.set(runner);
        }),
      );
  }

  private patchAssignedBibTemplate(templateId: number): void {
    this._runner.update((runner) =>
      runner?.lp_runner
        ? {
            ...runner,
            lp_runner: { ...runner.lp_runner, assignedBibTemplate: templateId },
          }
        : runner,
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
