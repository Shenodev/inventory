import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

const STORAGE_KEY = 'sheno.inventory.token';

@Injectable({ providedIn: 'root' })
export class AuthTokenStore {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly tokenState = signal<string | null>(
    this.isBrowser ? localStorage.getItem(STORAGE_KEY) : null
  );

  readonly token = this.tokenState.asReadonly();

  set(token: string | null): void {
    this.tokenState.set(token);

    if (!this.isBrowser) {
      return;
    }

    if (token === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, token);
    }
  }

  clear(): void {
    this.set(null);
  }
}
