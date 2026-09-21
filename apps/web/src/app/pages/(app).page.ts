import { ChangeDetectionStrategy, Component, afterNextRender, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { RouteMeta } from '@analogjs/router';

import { authGuard } from '../core/auth/auth.guard';
import { AuthService } from '../core/auth/auth.service';
import { ToastService } from '../core/ui/toast.service';

export const routeMeta: RouteMeta = {
  canActivate: [authGuard],
};

interface NavLink {
  route: string;
  label: string;
  icon: string;
  exact?: boolean;
}

interface NavSection {
  label: string;
  links: NavLink[];
}

const ICONS = {
  dashboard:
    'M3 3h7v9H3V3Zm11 0h7v5h-7V3Zm0 7h7v11h-7V10ZM3 16h7v5H3v-5Z',
  products:
    'M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9ZM7.5 6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z',
  damages: 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0ZM12 9v4M12 17h.01',
  customers:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  returns: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
  suppliers:
    'M3 7h13v10H3ZM16 10h3l2 3v4h-5ZM7.5 17.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM17.5 17.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z',
  purchaseOrders: 'M6 3h8l4 4v14H6V3ZM14 3v4h4M9 12h6M9 16h6',
  transactions: 'M2 8l9-5 9 5-9 5-9-5ZM2 12l9 5 9-5M2 16l9 5 9-5',
} as const;

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Dashboard',
    links: [{ route: '/', label: 'Dashboard', icon: ICONS.dashboard, exact: true }],
  },
  {
    label: 'Inventory',
    links: [
      { route: '/products', label: 'Products', icon: ICONS.products },
      { route: '/damages', label: 'Damages', icon: ICONS.damages },
    ],
  },
  {
    label: 'Customers',
    links: [
      { route: '/customers', label: 'Customers', icon: ICONS.customers },
      { route: '/returns', label: 'Returns', icon: ICONS.returns },
    ],
  },
  {
    label: 'Purchases',
    links: [
      { route: '/suppliers', label: 'Suppliers', icon: ICONS.suppliers },
      { route: '/purchase-orders', label: 'Purchase Orders', icon: ICONS.purchaseOrders },
    ],
  },
  {
    label: 'Financials',
    links: [{ route: '/transactions', label: 'Transactions', icon: ICONS.transactions }],
  },
];

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

        <nav class="mt-6 flex min-h-0 flex-1 flex-col overflow-y-auto">
          @for (section of navSections; track section.label; let index = $index) {
            <p
              class="mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500"
              [class]="index === 0 ? 'mt-0' : 'mt-6'"
            >
              {{ section.label }}
            </p>
            @for (link of section.links; track link.route) {
              <a
                [routerLink]="link.route"
                routerLinkActive="bg-deep-slate text-white"
                [routerLinkActiveOptions]="{ exact: link.exact === true }"
                class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-deep-slate hover:text-white"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  class="h-5 w-5"
                >
                  <path [attr.d]="link.icon" />
                </svg>
                {{ link.label }}
              </a>
            }
          }
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

  protected readonly navSections = NAV_SECTIONS;
  protected readonly user = this.auth.currentUser;
  protected readonly toasts = this.toaster.toasts;

  constructor() {
    afterNextRender(() => this.enforceSession());
  }

  private enforceSession(): void {
    if (!this.auth.isAuthenticated()) {
      void this.router.navigateByUrl('/login');
    }
  }

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