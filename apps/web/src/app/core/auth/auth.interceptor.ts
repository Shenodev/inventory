import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { API_BASE_URL } from '../api.base-url';
import { AuthTokenStore } from './auth-token.store';

const isApiRequest = (url: string): boolean =>
  url.startsWith(API_BASE_URL) || url.startsWith('/');

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(AuthTokenStore).token();

  // Only attach the bearer token to our own API; never leak it to third parties.
  if (token === null || !isApiRequest(request.url)) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    })
  );
};
