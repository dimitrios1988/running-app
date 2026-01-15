import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, timer } from 'rxjs';
import { retry } from 'rxjs/operators';

@Injectable()
export class HttpRetryInterceptor implements HttpInterceptor {
  private readonly maxRetries = 3;
  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      retry({
        count: this.maxRetries,
        delay: (err: any, retryIndex: number) => {
          if (!(err instanceof HttpErrorResponse) || err.status !== 0) {
            throw err;
          }
          const backoffMs = Math.pow(2, retryIndex - 1) * 500;
          return timer(backoffMs);
        },
      })
    );
  }
}
