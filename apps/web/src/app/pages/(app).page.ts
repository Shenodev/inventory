import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { RouteMeta } from '@analogjs/router';

import { authGuard } from '../core/auth/auth.guard';
import { AuthService } from '../core/auth/auth.service';
import { ToastService } from '../core/ui/toast.service';

export const routeMeta: RouteMeta = {
  canActivate: [authGuard],
};

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-screen overflow-hidden bg-deep-slate font-sans text-slate-300">
      <aside
        class="flex h-full w-64 shrink-0 flex-col border-r border-white/5 bg-surface px-4 py-6"
      >
        <a routerLink="/" class="flex shrink-0 items-center gap-3 px-2">
          <img
            src="/favicon-96x96.png"
            alt="ShenoInventory"
            class="h-9 w-9 rounded-xl"
          />
          <span class="font-heading text-lg font-semibold text-white">ShenoInventory</span>
        </a>

        <nav class="mt-8 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          <a
            routerLink="/"
            routerLinkActive="bg-deep-slate text-white"
            [routerLinkActiveOptions]="{ exact: true }"
            class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-deep-slate hover:text-white"
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

          <a
            routerLink="/products"
            routerLinkActive="bg-deep-slate text-white"
            [routerLinkActiveOptions]="{ exact: true }"
            class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-deep-slate hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              class="h-5 w-5"
            >
              <path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z" />
              <circle cx="7.5" cy="7.5" r="1.5" />
            </svg>
            Products
          </a>

          <a
            routerLink="/customers"
            routerLinkActive="bg-deep-slate text-white"
            [routerLinkActiveOptions]="{ exact: true }"
            class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-deep-slate hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              class="h-5 w-5"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Customers
          </a>

          <a
            routerLink="/sales"
            routerLinkActive="bg-deep-slate text-white"
            [routerLinkActiveOptions]="{ exact: true }"
            class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-deep-slate hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              class="h-5 w-5"
            >
              <path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3Z" />
              <path d="M9 8h6M9 12h6" />
            </svg>
            Sales
          </a>

          <a
            routerLink="/suppliers"
            routerLinkActive="bg-deep-slate text-white"
            [routerLinkActiveOptions]="{ exact: true }"
            class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-deep-slate hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              class="h-5 w-5"
            >
              <path d="M3 7h13v10H3zM16 10h3l2 3v4h-5z" />
              <circle cx="7.5" cy="17.5" r="1.5" />
              <circle cx="17.5" cy="17.5" r="1.5" />
            </svg>
            Suppliers
          </a>

          <a
            routerLink="/purchase-orders"
            routerLinkActive="bg-deep-slate text-white"
            [routerLinkActiveOptions]="{ exact: true }"
            class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-deep-slate hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              class="h-5 w-5"
            >
              <path d="M6 3h8l4 4v14H6V3Z" />
              <path d="M14 3v4h4M9 12h6M9 16h6" />
            </svg>
            Purchase Orders
          </a>
        </nav>

        <div class="mt-auto shrink-0 border-t border-white/5 pt-4">
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

      <main class="min-w-0 flex-1 overflow-y-auto px-8 py-8">
        <router-outlet />
      </main>
    </div>

    <div
      class="pointer-events-none fixed right-5 top-5 z-[100] flex w-full max-w-sm flex-col gap-3"
      aria-live="polite"
    >
      @for (toast of toasts(); track toast.id) {
        <div
          class="pointer-events-auto rounded-xl border px-4 py-3 text-sm"
          role="status"
          [class]="
            toast.type === 'error'
              ? 'border-red-500/40 bg-surface text-red-200'
              : 'border-electric-cyan/40 bg-surface text-slate-200'
          "
        >
          <div class="flex items-start justify-between gap-3">
            <p class="min-w-0 flex-1">{{ toast.message }}</p>
            <button
              type="button"
              (click)="dismissToast(toast.id)"
              aria-label="Dismiss notification"
              class="shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export default class AppShell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toaster = inject(ToastService);

  protected readonly user = this.auth.currentUser;
  protected readonly toasts = this.toaster.toasts;

  protected dismissToast(id: number): void {
    this.toaster.dismiss(id);
  }

  protected signOut(): void {
    this.auth.logout().subscribe({
      next: () => void this.router.navigateByUrl('/login'),
      error: () => void this.router.navigateByUrl('/login'),
    });
  }
}
