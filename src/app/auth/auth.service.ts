import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { Preferences } from '@capacitor/preferences';
import { AUTH_CREDENTIALS } from '../secrets';

export interface LoginResponse {
  token: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private token: string = '';

  constructor(private http: HttpClient) {
    Preferences.get({ key: 'access_token' }).then((value) => {
      if (value.value) {
        this.token = value.value;
      }
    });
  }

  login(credentials: {
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
        this.currentUserSubject.next(response);
        return response;
      })
    );
  }

  /* refreshToken(refreshToken: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>('/api/auth/refresh', { refresh_token: refreshToken })
      .pipe(
        map((response) => {
          // Store new tokens
          Preferences.set({
            key: 'access_token',
            value: response.access_token,
          });
          this.currentUserSubject.next(response);
          return response;
        })
      );
  } */

  logout(): void {
    Preferences.remove({
      key: 'access_token',
    });
    this.token = '';
    this.currentUserSubject.next(null);
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await Preferences.get({ key: 'access_token' });
    return !!token;
  }

  getCurrentUser(): any {
    return this.currentUserSubject.value;
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
}
