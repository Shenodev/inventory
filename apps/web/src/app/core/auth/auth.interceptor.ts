import { HttpErrorResponse, HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, of, switchMap, throwError } from 'rxjs';

import { API_BASE_URL } from '../api.base-url';
import { AuthService } from './auth.service';
import { AuthSessionStore } from './auth-session.store';

const isApiRequest = (url: string): boolean =>
  url.startsWith(API_BASE_URL) || url.startsWith('/');

const isAuthRequest = (url: string): boolean =>
  url.endsWith('/auth/login') || url.endsWith('/auth/refresh');

/**
 * A 401 either means the access token expired (refresh silently) or the
 * session is genuinely dead (show sign-in). We can refresh only when an
 * httpOnly refresh cookie may be present — after a hard reload the in-memory
 * token is gone but the cookie is not, and that cookie path is what keeps a
 * reload from signing the user out.
 */
const canAttemptRefresh = (session: AuthSessionStore): boolean =>
  session.hasRefreshCookie();

const endSession = (session: AuthSessionStore, router: Router): void => {
  session.clear();

  void router.navigate(['/login'], { queryParams: { session: 'expired' } });
};

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(AuthSessionStore);
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = session.token();
  let sessionEnded = false;

  const isApi = isApiRequest(request.url) && !isAuthRequest(request.url);

  const forward = (): Observable<HttpEvent<unknown>> => {
    const bearer = session.token();

    // Only attach the bearer token to our own API; never leak it to third
    // parties, and skip the auth endpoints themselves (login/refresh carry their
    // own credentials and would only include a stale bearer).
    const authorised =
      isApi && bearer !== null
        ? request.clone({ setHeaders: { Authorization: `Bearer ${bearer}` } })
        : request;

    return next(authorised);
  };

  // Hard reloads wipe the in-memory token, but the httpOnly refresh cookie can
  // survive. Refresh BEFORE the first request lands, so the browser never logs
  // a doomed 401 probe for a perfectly valid session. AuthService single-flights
  // the exchange, so concurrent page-load fetches share one POST.
  const preAuth: Observable<void> =
    isApi && token === null && canAttemptRefresh(session)
      ? auth.tryRefresh(true).pipe(
          switchMap((response) => {
            if (response === null || response.access_token === '') {
              sessionEnded = true;
              endSession(session, router);

              return throwError(() => expiredSession(request.url));
            }

            return of(undefined);
          }),
          catchError(() => {
            sessionEnded = true;
            endSession(session, router);

            return throwError(() => expiredSession(request.url));
          })
        )
      : of(undefined);

  return preAuth.pipe(
    switchMap(() => forward()),
    catchError((error: unknown) => {
      const rejected =
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        isApiRequest(request.url) &&
        !isAuthRequest(request.url);

      if (!rejected) {
        return throwError(() => error);
      }

      // No token in memory and no refresh cookie possible — the session cannot
      // be refreshed, so drop it and route back to sign-in. Tokens are
      // intentionally memory-only (never localStorage), so a reload relies
      // entirely on the cookie path below.
      if (!canAttemptRefresh(session)) {
        if (!sessionEnded) {
          endSession(session, router);
        }

        return throwError(() => error);
      }

      // Single-flight silent refresh (AuthService shares one exchange across
      // every concurrent 401), then retry the original request with the
      // freshly issued access token. AuthService already stored the tokens.
      return auth.tryRefresh(true).pipe(
        switchMap((response) => {
          if (response === null || response.access_token === '') {
            return throwError(() => error);
          }

          return next(
            request.clone({
              setHeaders: { Authorization: `Bearer ${response.access_token}` },
            })
          );
        }),
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

const expiredSession = (url: string): HttpErrorResponse =>
  new HttpErrorResponse({ status: 401, statusText: 'Session expired', url });
