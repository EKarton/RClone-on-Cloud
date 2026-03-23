import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, EMPTY, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { WINDOW } from '../../app.tokens';
import { Router } from '@angular/router';

/**
 * An Angular request interceptor that automatically redirects the user to the login page
 * whenever the call to the web api returns a 401.
 */
export const webApiAuthRequestInterceptor: HttpInterceptorFn = (req, next) => {
  const window: Window = inject(WINDOW);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (req.url.startsWith(environment.webApiEndpoint)) {
        if (error.status == 401) {
          window.localStorage.setItem('auth_redirect_path', window.location.pathname);
          router.navigate(['/auth/v1/google/login']);

          return EMPTY;
        }
      }

      return throwError(() => error);
    }),
  );
};
