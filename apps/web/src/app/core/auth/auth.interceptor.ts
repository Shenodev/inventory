import {
  HttpErrorResponse,
  HttpClient,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, Observable, share, switchMap, tap, throwError } from 'rxjs';

import { API_BASE_URL } from '../api.base-url';
import { AuthSessionStore } from './auth-session.store';

const isApiRequest = (url: string): boolean =>
  url.startsWith(API_BASE_URL) || url.startsWith('/');

const isAuthRequest = (url: string): boolean =>
  url.endsWith('/auth/login') || url.endsWith('/auth/refresh');

interface RefreshResponse {
  access_token: string;
  refresh_token?: string;
}

/**
 * One refresh call at a time. If several requests get rejected with a 401 while
 * a refresh is already in flight they all wait on the same exchange instead of
 * hammering /auth/refresh with copies of the same token.
 */
let refreshInFlight: Observable<RefreshResponse> | null = null;

const refreshAccessToken = (
  http: HttpClient,
  session: AuthSessionStore
): Observable<RefreshResponse> => {
  if (refreshInFlight === null) {
    // Send refresh via httpOnly cookie (withCredentials) when available;
    // body fallback for legacy clients that still have token in memory.
    const body: Record<string, string> = {};
    const rt = session.refreshToken();
    if (rt) body['refresh_token'] = rt;
    refreshInFlight = http
      .post<RefreshResponse>(`${API_BASE_URL}/auth/refresh`, body, { withCredentials: true })
      .pipe(
        // Multicast so every request that got a 401 waits on the single
        // in-flight exchange instead of each firing its own refresh call.
        share(),
        finalize(() => (refreshInFlight = null))
      );
  }

  return refreshInFlight;
};

const endSession = (session: AuthSessionStore, router: Router): void => {
  session.clear();

  void router.navigate(['/login'], { queryParams: { session: 'expired' } });
};

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(AuthSessionStore);
  const router = inject(Router);
  const http = inject(HttpClient);
  const token = session.token();

  // Only attach the bearer token to our own API; never leak it to third
  // parties, and skip the auth endpoints themselves (login/refresh carry their
  // own credentials and would only include a stale bearer).
  const authorised =
    token !== null && isApiRequest(request.url) && !isAuthRequest(request.url)
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;

  return next(authorised).pipe(
    catchError((error: unknown) => {
      const rejected =
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        isApiRequest(request.url) &&
        !isAuthRequest(request.url);

      if (!rejected) {
        return throwError(() => error);
      }

      // No refresh token in memory means the session cannot be refreshed;
      // tokens are intentionally not persisted to localStorage (memory only)
      // so a page reload loses them and requires re-authentication.
      if (session.refreshToken() === null) {
        endSession(session, router);

        return throwError(() => error);
      }

      return refreshAccessToken(http, session).pipe(
        tap((response) => {
          session.setToken(response.access_token);
          // Refresh tokens are rotated server-side; keep the in-memory mirror
          // in sync so the fallback path never sends a spent token.
          if (response.refresh_token) session.setRefreshToken(response.refresh_token);
        }),
        // Retry the original request with the freshly issued access token.
        switchMap((response) =>
          next(
            request.clone({
              setHeaders: { Authorization: `Bearer ${response.access_token}` },
            })
          )
        ),
        // If the refresh itself is rejected (stale or revoked refresh token)
        // the session is dead, so drop it and route back to sign-in.
        catchError(() => {
          endSession(session, router);

          return throwError(() => error);
        })
      );
    })
  );
};