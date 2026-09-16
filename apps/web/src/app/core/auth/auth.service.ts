import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { Observable, finalize, tap } from 'rxjs';

import { API_BASE_URL } from '../api.base-url';
import { AuthTokenStore } from './auth-token.store';

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
}

export interface LoginResponse {
  token: string;
  token_type: string;
  user: AuthenticatedUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(AuthTokenStore);

  readonly isAuthenticated = computed(() => this.tokens.token() !== null);

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${API_BASE_URL}/auth/login`, { email, password })
      .pipe(tap((response) => this.tokens.set(response.token)));
  }

  logout(): Observable<unknown> {
    return this.http
      .post(`${API_BASE_URL}/auth/logout`, {})
      .pipe(finalize(() => this.tokens.clear()));
  }
}
