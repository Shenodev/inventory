import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authGuard } from './auth.guard';
import { authInterceptor } from './auth.interceptor';
import { AuthSessionStore } from './auth-session.store';

const browserPlatform = { provide: PLATFORM_ID, useValue: 'browser' };

const setupInterceptors = () => {
  TestBed.configureTestingModule({
    providers: [
      browserPlatform,
      provideRouter([]),
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
    ],
  });

  return {
    http: TestBed.inject(HttpClient),
    controller: TestBed.inject(HttpTestingController),
    session: TestBed.inject(AuthSessionStore),
  };
};

beforeEach(() => localStorage.clear());

describe('authInterceptor', () => {
  it('attaches the bearer token to API requests and nothing else', () => {
    const { http, controller, session } = setupInterceptors();
    session.setToken('token-123');

    http.get('/api/products').subscribe();
    const apiRequest = controller.expectOne('/api/products');
    expect(apiRequest.request.headers.get('Authorization')).toBe('Bearer token-123');
    apiRequest.flush({});

    http.get('https://example.com/tracker.gif').subscribe();
    const externalRequest = controller.expectOne('https://example.com/tracker.gif');
    expect(externalRequest.request.headers.has('Authorization')).toBe(false);
    externalRequest.flush({});

    controller.verify();
  });

  it('sends no header when there is no token', () => {
    const { http, controller } = setupInterceptors();

    http.get('/api/products').subscribe();
    const request = controller.expectOne('/api/products');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});

    controller.verify();
  });

  it('drops the stored session and returns to /login when the API rejects the token', () => {
    const { http, controller, session } = setupInterceptors();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    session.setToken('stale-token');
    session.setUser({ id: 1, name: 'Demo User', email: 'demo@shenodev.tech' });

    http.get('/api/dashboard').subscribe({ error: () => undefined });
    controller
      .expectOne('/api/dashboard')
      .flush({ message: 'Unauthenticated.' }, { status: 401, statusText: 'Unauthorized' });

    expect(session.token()).toBeNull();
    expect(session.user()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { session: 'expired' },
    });

    controller.verify();
  });

  it('leaves the session alone when a sign-in attempt is rejected', () => {
    const { http, controller, session } = setupInterceptors();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    http.post('/api/auth/login', { email: 'demo@shenodev.tech', password: 'nope' }).subscribe({
      error: () => undefined,
    });
    controller
      .expectOne('/api/auth/login')
      .flush({ message: 'Invalid.' }, { status: 401, statusText: 'Unauthorized' });

    expect(navigate).not.toHaveBeenCalled();

    controller.verify();
  });
});

describe('authGuard', () => {
  it('redirects unauthenticated users to /login', () => {
    TestBed.configureTestingModule({
      providers: [
        browserPlatform,
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(result).toBeInstanceOf(UrlTree);
    expect(String(result)).toBe('/login');
  });
});
