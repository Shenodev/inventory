import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
}

const TOKEN_KEY = 'sheno.inventory.token';
const REFRESH_TOKEN_KEY = 'sheno.inventory.refresh_token';
const USER_KEY = 'sheno.inventory.user';

/**
 * Single source of truth for the signed-in session.
 *
 * The access token, refresh token and user are all persisted in localStorage
 * so a page refresh restores the session, and all are cleared together when
 * the API rejects the tokens. Keeping them in one store lets the auth
 * interceptor drop a rejected session or refresh an expired access token
 * without depending on HttpClient (which would be a circular dependency inside
 * an interceptor).
 */
@Injectable({ providedIn: 'root' })
export class AuthSessionStore {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly tokenState = signal<string | null>(this.readToken());
  private readonly refreshTokenState = signal<string | null>(this.readRefreshToken());
  private readonly userState = signal<AuthenticatedUser | null>(this.readUser());

  readonly token = this.tokenState.asReadonly();
  readonly refreshToken = this.refreshTokenState.asReadonly();
  readonly user = this.userState.asReadonly();

  setToken(token: string | null): void {
    this.tokenState.set(token);
    this.persist(TOKEN_KEY, token);
  }

  setRefreshToken(token: string | null): void {
    this.refreshTokenState.set(token);
    this.persist(REFRESH_TOKEN_KEY, token);
  }

  setUser(user: AuthenticatedUser | null): void {
    this.userState.set(user);
    this.persist(USER_KEY, user === null ? null : JSON.stringify(user));
  }

  clear(): void {
    this.setToken(null);
    this.setRefreshToken(null);
    this.setUser(null);
  }

  private persist(key: string, value: string | null): void {
    if (!this.isBrowser) {
      return;
    }

    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  }

  private readToken(): string | null {
    return this.isBrowser ? localStorage.getItem(TOKEN_KEY) : null;
  }

  private readRefreshToken(): string | null {
    return this.isBrowser ? localStorage.getItem(REFRESH_TOKEN_KEY) : null;
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
