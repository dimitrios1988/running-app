import { effect, inject, Injectable, signal } from '@angular/core';
import { IRunner } from './runner.interface';
import { AUTH_CREDENTIALS } from '../secrets';
import { catchError, map, Observable, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { RunnerInfoResponse } from './runner.info.resp';
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

  constructor() {
    effect(() => {
      const payload = this.authService.userPayload();
      if (!payload) {
        this._runner.set(null);
      } else {
        this.getRunnerInfo(payload.uuid).subscribe();
      }
    });
  }

  getRunnerInfo(uuid: string, forceRefresh = false): Observable<IRunner> {
    const runnerInfoApi = new URL(
      `/api/mobile_app_manager/get_runner_info/v1`,
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
            },
            event: {
              nameEn: response[0]['1(event)'].name_en,
              nameGr: response[0]['1(event)'].name_gr,
              id: response[0]['1(event)'].id,
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
                }
              : null,
          } as IRunner;
        }),
        tap((runner: IRunner) => {
          this._runner.set(runner);
        }),

        catchError((error) => {
          this.authService.logoutRunner();
          this.router.navigate(['/tabs/login']);
          throw error;
        }),
      );
  }
}
