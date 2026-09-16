import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UrlTree, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { authGuard } from './auth.guard';
import { authInterceptor } from './auth.interceptor';
import { AuthTokenStore } from './auth-token.store';

const browserPlatform = { provide: PLATFORM_ID, useValue: 'browser' };

beforeEach(() => localStorage.clear());

describe('authInterceptor', () => {
  it('attaches the bearer token to API requests and nothing else', () => {
    TestBed.configureTestingModule({
      providers: [
        browserPlatform,
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthTokenStore).set('token-123');

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
    TestBed.configureTestingModule({
      providers: [
        browserPlatform,
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);

    http.get('/api/products').subscribe();
    const request = controller.expectOne('/api/products');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});

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
