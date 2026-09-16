import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  // The token lives in localStorage, which the server cannot read. Allow the
  // server render through and enforce the guard in the browser, so deep links
  // work instead of being bounced to /login before hydration.
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return true;
  }

  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isAuthenticated() ? true : router.createUrlTree(['/login']);
};
