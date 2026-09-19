import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { API_BASE_URL } from '../api.base-url';
import { AuthSessionStore } from './auth-session.store';

const isApiRequest = (url: string): boolean =>
  url.startsWith(API_BASE_URL) || url.startsWith('/');

const isLoginRequest = (url: string): boolean => url.endsWith('/auth/login');

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(AuthSessionStore);
  const router = inject(Router);
  const token = session.token();

  // Only attach the bearer token to our own API; never leak it to third parties.
  const authorised =
    token !== null && isApiRequest(request.url)
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;

  return next(authorised).pipe(
    catchError((error: unknown) => {
      // A rejected token means the stored session is dead (expired, revoked or
      // wiped on the server). Drop it and send the user to the sign-in page
      // instead of leaving them on a page whose requests can only fail.
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        isApiRequest(request.url) &&
        !isLoginRequest(request.url)
      ) {
        session.clear();

        void router.navigate(['/login'], { queryParams: { session: 'expired' } });
      }

      return throwError(() => error);
    })
  );
};
