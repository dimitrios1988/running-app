import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { Preferences } from '@capacitor/preferences';
import { AUTH_CREDENTIALS } from '../secrets';
import { LoginResponse } from './responses/login.resp';
import { LoginRunnerResponse } from './responses/login-runner.resp';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private token: string = '';
  private userUuid: string = '';

  constructor(private http: HttpClient) {
    Preferences.get({ key: 'access_token' }).then((value) => {
      if (value.value) {
        this.token = value.value;
      }
    });
    Preferences.get({ key: 'user_uuid' }).then((value) => {
      if (value.value) {
        this.userUuid = value.value;
      }
    });
  }

  private login(credentials: {
    username: string;
    password: string;
  }): Observable<LoginResponse> {
    const url = new URL(`${AUTH_CREDENTIALS.app_url}api/auth`).toString();
    return this.http.post<LoginResponse>(url, credentials).pipe(
      map((response) => {
        // Store tokens
        Preferences.set({
          key: 'access_token',
          value: response.token,
        });
        this.token = response.token;
        return response;
      })
    );
  }

  loginWithAppCredentials(): Observable<LoginResponse> {
    return this.login({
      username: AUTH_CREDENTIALS.username,
      password: AUTH_CREDENTIALS.password,
    });
  }

  getToken(): string {
    return this.token;
  }

  loginRunner(bib: string, email: string): Observable<LoginRunnerResponse[]> {
    const url = new URL(
      `/api/mobile_app_manager/login_runner/v1`,
      AUTH_CREDENTIALS.app_url
    ).toString();
    return this.http
      .get<LoginRunnerResponse[]>(url, {
        params: {
          bib: bib,
          email,
        },
      })
      .pipe(
        map((response) => {
          // Store tokens
          Preferences.set({
            key: 'user_uuid',
            value: response[0]['0(runner)'].uuid,
          });
          this.userUuid = response[0]['0(runner)'].uuid;
          return response;
        })
      );
  }

  getRunnerUUID(): string {
    return this.userUuid;
  }

  async logoutRunner(): Promise<void> {
    await Preferences.remove({
      key: 'user_uuid',
    });
    this.userUuid = '';
  }
}
