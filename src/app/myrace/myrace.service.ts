import { inject, Injectable, signal } from '@angular/core';
import { IRunner } from './runner.interface';
import { AUTH_CREDENTIALS } from '../secrets';
import { catchError, map, Observable, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { RunnerInfoResponse } from './runner.info.resp';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class MyRaceService {
  private readonly _runner = signal<IRunner | null>(null);
  public readonly runner$ = this._runner.asReadonly();
  private readonly http: HttpClient = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {}

  getRunnerInfo(uuid: string): Observable<IRunner> {
    const runnerInfoApi = new URL(
      `/api/mobile_app_manager/get_runner_info/v1`,
      AUTH_CREDENTIALS.app_url,
    ).toString();
    // Implementation of the HTTP request to fetch runner info goes here
    return this.http
      .get<RunnerInfoResponse[]>(runnerInfoApi, {
        params: { uuid },
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
            },
            event: {
              nameEn: response[0]['1(event)'].name_en,
              nameGr: response[0]['1(event)'].name_gr,
            },
            place: {
              nameGr: response[0]['2(category)'].name_gr,
              nameEn: response[0]['2(category)'].name_en,
            },
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
