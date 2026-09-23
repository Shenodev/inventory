import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { Observable, finalize, of, share, tap } from 'rxjs';

import { API_BASE_URL } from '../api.base-url';
import { AuthenticatedUser, AuthSessionStore } from './auth-session.store';

export type { AuthenticatedUser } from './auth-session.store';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AuthenticatedUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(AuthSessionStore);

  /**
   * One silent refresh at a time. Page boot and every 401 handler share this
   * exchange so a hard reload never causes two requests that race the server's
   * refresh-token rotation (the loser would 401 and appear to sign us out).
   */
  private refreshInFlight: Observable<LoginResponse | null> | null = null;

  readonly currentUser = this.session.user;
  readonly isAuthenticated = computed(() => this.session.token() !== null);

  /**
   * Silent refresh via the httpOnly cookie (withCredentials ensures the cookie
   * is sent). `force` bypasses the heuristic that skips the call when no local
   * user is present — the 401 handler uses it because a cookie may exist even
   * when memory was wiped by a reload.
   */
  tryRefresh(force = false): Observable<LoginResponse | null> {
    if (this.refreshInFlight !== null) {
      return this.refreshInFlight;
    }

    if (!force && !this.session.hasRefreshCookie()) {
      return of(null);
    }

    // Refresh token lives only in an httpOnly cookie set by the API — the body
    // stays empty and withCredentials carries the cookie. JS never touches it.
    this.refreshInFlight = this.http
      .post<LoginResponse>(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((response) => {
          this.session.setToken(response.access_token);
        }),
        finalize(() => (this.refreshInFlight = null)),
        // Multicast so every concurrent 401 handler subscribes to the SAME exchange.
        // Without this each subscriber would re-fire its own POST.
        share(),
      );

    return this.refreshInFlight;
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${API_BASE_URL}/auth/login`, { email, password }, { withCredentials: true })
      .pipe(
        tap((response) => {
          this.session.setToken(response.access_token);
          // refresh token stays server-side only (httpOnly cookie) — never in JS
          this.session.setUser(response.user);
        })
      );
  }

  logout(): Observable<unknown> {
    if (this.session.token() === null && !this.session.hasRefreshCookie()) {
      this.clearSession();

      return of(null);
    }

    return this.http
      .post(`${API_BASE_URL}/auth/logout`, {}, { withCredentials: true })
      .pipe(finalize(() => this.clearSession()));
  }

  clearSession(): void {
    this.session.clear();
  }
}
