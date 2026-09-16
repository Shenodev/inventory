import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
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

const USER_KEY = 'sheno.inventory.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(AuthTokenStore);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly user = signal<AuthenticatedUser | null>(this.readUser());

  readonly currentUser = this.user.asReadonly();
  readonly isAuthenticated = computed(() => this.tokens.token() !== null);

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${API_BASE_URL}/auth/login`, { email, password })
      .pipe(
        tap((response) => {
          this.tokens.set(response.token);
          this.setUser(response.user);
        })
      );
  }

  logout(): Observable<unknown> {
    return this.http
      .post(`${API_BASE_URL}/auth/logout`, {})
      .pipe(finalize(() => this.clearSession()));
  }

  clearSession(): void {
    this.tokens.clear();
    this.setUser(null);
  }

  private setUser(user: AuthenticatedUser | null): void {
    this.user.set(user);

    if (!this.isBrowser) {
      return;
    }

    if (user === null) {
      localStorage.removeItem(USER_KEY);
    } else {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  }

  private readUser(): AuthenticatedUser | null {
    if (!this.isBrowser) {
      return null;
    }

    const raw = localStorage.getItem(USER_KEY);

    if (raw === null) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthenticatedUser;
    } catch {
      return null;
    }
  }
}
