import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { RouteMeta } from '@analogjs/router';

import { authGuard } from '../core/auth/auth.guard';
import { AuthService } from '../core/auth/auth.service';

export const routeMeta: RouteMeta = {
  canActivate: [authGuard],
};

const NAV_SOON = ['Products', 'Reservations', 'Sales'];

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-screen bg-deep-slate font-sans text-slate-300">
      <aside class="flex w-64 shrink-0 flex-col border-r border-white/5 bg-surface px-4 py-6">
        <a routerLink="/dashboard" class="flex items-center gap-3 px-2">
          <img
            src="/favicon-96x96.png"
            alt="ShenoInventory"
            class="h-9 w-9 rounded-xl"
          />
          <span class="font-heading text-lg font-semibold text-white">ShenoInventory</span>
        </a>

        <nav class="mt-8 flex flex-col gap-1">
          <a
            routerLink="/dashboard"
            routerLinkActive="bg-deep-slate text-white"
            [routerLinkActiveOptions]="{ exact: true }"
            class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-deep-slate hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              class="h-5 w-5"
            >
              <rect x="3" y="3" width="7" height="9" rx="1.5" />
              <rect x="14" y="3" width="7" height="5" rx="1.5" />
              <rect x="14" y="12" width="7" height="9" rx="1.5" />
              <rect x="3" y="16" width="7" height="5" rx="1.5" />
            </svg>
            Dashboard
          </a>
        </nav>

        <p class="mt-8 px-3 text-xs font-medium uppercase tracking-wide text-slate-500">
          Coming soon
        </p>
        <div class="mt-2 flex flex-col gap-1">
          @for (item of navSoon; track item) {
            <span class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-500">
              <span class="h-1.5 w-1.5 rounded-full bg-slate-600"></span>
              {{ item }}
            </span>
          }
        </div>

        <div class="mt-auto border-t border-white/5 pt-4">
          <div class="px-2">
            <p class="truncate text-sm font-medium text-white">
              {{ user()?.name ?? 'Demo User' }}
            </p>
            <p class="truncate text-xs text-slate-400">
              {{ user()?.email ?? 'demo@shenodev.tech' }}
            </p>
          </div>
          <button
            type="button"
            (click)="signOut()"
            class="mt-3 w-full rounded-xl border border-white/10 px-3 py-2 text-sm font-medium transition-colors hover:bg-deep-slate hover:text-white"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main class="min-w-0 flex-1 px-8 py-8">
        <router-outlet />
      </main>
    </div>
  `,
})
export default class AppShell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.currentUser;
  protected readonly navSoon = NAV_SOON;

  protected signOut(): void {
    this.auth.logout().subscribe({
      next: () => void this.router.navigateByUrl('/login'),
      error: () => void this.router.navigateByUrl('/login'),
    });
  }
}
