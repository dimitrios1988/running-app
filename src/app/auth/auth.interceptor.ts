import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, EMPTY, of, from } from 'rxjs';
import { catchError, switchMap, finalize } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { Preferences } from '@capacitor/preferences';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenPromise: Promise<string> | null = null;

  constructor(private authService: AuthService) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    // Skip interceptor for login and refresh token endpoints
    if (request.url.includes('/api/auth')) {
      return next.handle(request);
    }

    // Add access token to request if available
    const accessToken = this.authService.getToken();
    if (accessToken) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !this.isRefreshing) {
          return this.handle401Error(request, next);
        }
        return throwError(() => error);
      })
    );
  }

  private handle401Error(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;

      // Clear the refresh token promise
      this.refreshTokenPromise = null;

      // Try to refresh the token
      return this.refreshAccessToken().pipe(
        switchMap((newToken: string) => {
          if (newToken) {
            // Update the request with new token
            const newRequest = request.clone({
              setHeaders: {
                Authorization: `Bearer ${newToken}`,
              },
            });

            // Store the new token
            Preferences.set({ key: 'access_token', value: newToken });

            // Retry the original request with new token
            return next.handle(newRequest);
          } else {
            // If refresh failed, redirect to login
            //this.redirectToLogin();
            return EMPTY;
          }
        }),
        catchError((refreshError) => {
          // If refresh also fails, redirect to login
          //this.redirectToLogin();
          return throwError(() => refreshError);
        }),
        finalize(() => {
          this.isRefreshing = false;
        })
      );
    } else {
      // If refresh is already in progress, wait for it to complete
      return from(this.refreshTokenPromise!).pipe(
        switchMap((token: string) => {
          const newRequest = request.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`,
            },
          });
          return next.handle(newRequest);
        }),
        catchError(() => {
          //this.redirectToLogin();
          return EMPTY;
        })
      );
    }
  }

  private refreshAccessToken(): Observable<string> {
    return this.authService.loginWithAppCredentials().pipe(
      switchMap((response: any) => {
        if (response && response.token) {
          Preferences.set({
            key: 'access_token',
            value: response.token,
          });
          return of(response.token);
        }
        return of('');
      }),
      catchError(() => {
        // Clear tokens on refresh failure
        Preferences.remove({ key: 'access_token' });
        return of('');
      })
    );
  }
}
