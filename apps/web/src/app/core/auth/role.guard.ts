import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthSessionStore } from './auth-session.store';

/**
 * Client-side route guard — defense in depth only.
 * Server enforces the real check via EnsureRole middleware; this just
 * avoids rendering admin UI to the wrong user and reduces confusion.
 */
export const roleGuard: CanActivateFn = (route) => {
  const session = inject(AuthSessionStore);
  const router = inject(Router);
  const required = (route.data?.['roles'] as string[] | undefined) ?? ['admin'];
  const userRole = (session.user()?.role ?? 'viewer').toLowerCase();
  if (required.map((r) => r.toLowerCase()).includes(userRole)) {
    return true;
  }
  // If authenticated but wrong role, go to dashboard; if not authenticated, to login
  return router.createUrlTree([session.user() ? '/' : '/login']);
};
