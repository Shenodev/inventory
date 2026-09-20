import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { API_BASE_URL } from '../api.base-url';
import { authGuard } from './auth.guard';
import { authInterceptor } from './auth.interceptor';
import { AuthSessionStore } from './auth-session.store';

const browserPlatform = { provide: PLATFORM_ID, useValue: 'browser' };
const REFRESH_URL = `${API_BASE_URL}/auth/refresh`;

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

  it('refreshes the access token and retries the request when the API rejects it', () => {
    const { http, controller, session } = setupInterceptors();
    session.setToken('stale-token');
    session.setRefreshToken('refresh-456');
    session.setUser({ id: 1, name: 'Demo User', email: 'demo@shenodev.tech' });

    let received: unknown;
    http.get('/api/dashboard').subscribe((body) => {
      received = body;
    });

    controller
      .expectOne('/api/dashboard')
      .flush({ message: 'Unauthenticated.' }, { status: 401, statusText: 'Unauthorized' });

    const refreshRequest = controller.expectOne(REFRESH_URL);
    expect(refreshRequest.request.body).toEqual({ refresh_token: 'refresh-456' });
    expect(refreshRequest.request.headers.has('Authorization')).toBe(false);
    refreshRequest.flush({ access_token: 'fresh-token' });

    const retried = controller.expectOne('/api/dashboard');
    expect(retried.request.headers.get('Authorization')).toBe('Bearer fresh-token');
    retried.flush({ ok: true });

    expect(received).toEqual({ ok: true });
    expect(session.token()).toBe('fresh-token');
    expect(session.refreshToken()).toBe('refresh-456');
    expect(session.user()).not.toBeNull();

    controller.verify();
  });

  it('clears the session and returns to /login when a 401 arrives without a refresh token', () => {
    const { http, controller, session } = setupInterceptors();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    session.setToken('stale-token');
    session.setUser({ id: 1, name: 'Demo User', email: 'demo@shenodev.tech' });

    http.get('/api/dashboard').subscribe({ error: () => undefined });
    controller
      .expectOne('/api/dashboard')
      .flush({ message: 'Unauthenticated.' }, { status: 401, statusText: 'Unauthorized' });

    expect(session.token()).toBeNull();
    expect(session.refreshToken()).toBeNull();
    expect(session.user()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { session: 'expired' },
    });

    controller.verify();
  });

  it('dedupes concurrent 401s onto one refresh exchange', () => {
    const { http, controller, session } = setupInterceptors();
    session.setToken('stale-token');
    session.setRefreshToken('refresh-456');

    http.get('/api/dashboard').subscribe();
    http.get('/api/products').subscribe();

    controller
      .expectOne('/api/dashboard')
      .flush({ message: 'Unauthenticated.' }, { status: 401, statusText: 'Unauthorized' });
    controller
      .expectOne('/api/products')
      .flush({ message: 'Unauthenticated.' }, { status: 401, statusText: 'Unauthorized' });

    controller.expectOne(REFRESH_URL).flush({ access_token: 'fresh-token' });

    const dashboardRetry = controller.expectOne('/api/dashboard');
    expect(dashboardRetry.request.headers.get('Authorization')).toBe('Bearer fresh-token');
    dashboardRetry.flush({ ok: true });

    const productsRetry = controller.expectOne('/api/products');
    expect(productsRetry.request.headers.get('Authorization')).toBe('Bearer fresh-token');
    productsRetry.flush({ ok: true });

    expect(session.token()).toBe('fresh-token');

    controller.verify();
  });

  it('clears the session and returns to /login when the refresh is rejected', () => {
    const { http, controller, session } = setupInterceptors();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    session.setToken('stale-token');
    session.setRefreshToken('refresh-456');
    session.setUser({ id: 1, name: 'Demo User', email: 'demo@shenodev.tech' });

    http.get('/api/dashboard').subscribe({ error: () => undefined });
    controller
      .expectOne('/api/dashboard')
      .flush({ message: 'Unauthenticated.' }, { status: 401, statusText: 'Unauthorized' });

    controller
      .expectOne(REFRESH_URL)
      .flush({ message: 'The refresh token is invalid.' }, { status: 401, statusText: 'Unauthorized' });

    expect(session.token()).toBeNull();
    expect(session.refreshToken()).toBeNull();
    expect(session.user()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { session: 'expired' },
    });

    controller.verify();
  });

  it('leaves the session alone when a sign-in attempt is rejected', () => {
    const { http, controller, session } = setupInterceptors();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    http.post(`/api/auth/login`, { email: 'demo@shenodev.tech', password: 'nope' }).subscribe({
      error: () => undefined,
    });
    controller
      .expectOne(`/api/auth/login`)
      .flush({ message: 'Invalid.' }, { status: 401, statusText: 'Unauthorized' });

    expect(navigate).not.toHaveBeenCalled();
    expect(session.token()).toBeNull();

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