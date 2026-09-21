import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { Observable, finalize, of, tap } from 'rxjs';

import { API_BASE_URL } from '../api.base-url';
import { AuthenticatedUser, AuthSessionStore } from './auth-session.store';

export type { AuthenticatedUser } from './auth-session.store';

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: AuthenticatedUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(AuthSessionStore);

  readonly currentUser = this.session.user;
  readonly isAuthenticated = computed(() => this.session.token() !== null);

  // Silent refresh uses httpOnly cookie; withCredentials ensures cookie is sent
  tryRefresh(): Observable<LoginResponse | null> {
    if (!this.session.hasRefreshCookie()) return of(null);
    return this.http
      .post<LoginResponse>(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((response) => {
          this.session.setToken(response.access_token);
          if (response.refresh_token) this.session.setRefreshToken(response.refresh_token);
        }),
      );
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${API_BASE_URL}/auth/login`, { email, password }, { withCredentials: true })
      .pipe(
        tap((response) => {
          this.session.setToken(response.access_token);
          // refresh_token is also set as httpOnly cookie server-side; keep in memory as fallback
          this.session.setRefreshToken(response.refresh_token);
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
