import { CanActivateFn } from '@angular/router';

/**
 * The guard alone cannot decide before the first render: the session lives in
 * localStorage, which the server cannot read, so an inline redirect on the
 * server would paint the login page over every refresh before hydration.
 *
 * Instead the app shell enforces auth right after the first client paint (see
 * AppShell.enforceSession). That keeps an authenticated refresh on its page
 * with no login flash, and still sends genuinely signed-out visitors to
 * /login. Returns true here so the SSR shell and the hydrated shell always
 * agree on the initial render.
 */
export const authGuard: CanActivateFn = () => true;