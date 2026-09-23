import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  role?: string;
}

const USER_KEY = 'sheno.inventory.user';

/**
 * Single source of truth for the signed-in session.
 *
 * SECURITY: Tokens are kept **in memory only** and never persisted to
 * localStorage/sessionStorage. This prevents XSS from exfiltrating long-lived
 * bearer tokens. The refresh token is stored as a httpOnly, Secure, SameSite=Lax
 * cookie set by the API (see backend AuthController). On page reload the access
 * token is lost and must be re-issued via POST /auth/refresh which reads the
 * httpOnly cookie automatically (withCredentials). The user object is the only
 * value persisted, and it contains no secrets.
 */
@Injectable({ providedIn: 'root' })
export class AuthSessionStore {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  // Tokens live only in memory — cleared on tab close / reload is intentional.
  private readonly tokenState = signal<string | null>(null);
  private readonly userState = signal<AuthenticatedUser | null>(this.readUser());

  readonly token = this.tokenState.asReadonly();
  readonly user = this.userState.asReadonly();

  setToken(token: string | null): void {
    this.tokenState.set(token);
    // Intentionally NOT persisted to localStorage (see class doc)
  }

  setUser(user: AuthenticatedUser | null): void {
    this.userState.set(user);
    this.persist(USER_KEY, user === null ? null : JSON.stringify(user));
  }

  clear(): void {
    this.setToken(null);
    this.setUser(null);
  }

  // Attempt silent refresh on boot if we have no access token but may have
  // a refresh cookie. Caller (AuthService) will handle the actual HTTP.
  hasRefreshCookie(): boolean {
    // Cannot read httpOnly cookie from JS — assume possibly present if user was persisted
    return this.isBrowser && this.userState() !== null;
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
