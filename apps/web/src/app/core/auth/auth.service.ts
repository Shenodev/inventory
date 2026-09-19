import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { Observable, finalize, of, tap } from 'rxjs';

import { API_BASE_URL } from '../api.base-url';
import { AuthenticatedUser, AuthSessionStore } from './auth-session.store';

export type { AuthenticatedUser } from './auth-session.store';

export interface LoginResponse {
  token: string;
  token_type: string;
  user: AuthenticatedUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(AuthSessionStore);

  readonly currentUser = this.session.user;
  readonly isAuthenticated = computed(() => this.session.token() !== null);

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${API_BASE_URL}/auth/login`, { email, password })
      .pipe(
        tap((response) => {
          this.session.setToken(response.token);
          this.session.setUser(response.user);
        })
      );
  }

  logout(): Observable<unknown> {
    if (this.session.token() === null) {
      this.clearSession();

      return of(null);
    }

    return this.http
      .post(`${API_BASE_URL}/auth/logout`, {})
      .pipe(finalize(() => this.clearSession()));
  }

  clearSession(): void {
    this.session.clear();
  }
}
