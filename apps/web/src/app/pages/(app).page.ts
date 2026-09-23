import { ChangeDetectionStrategy, Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { RouteMeta } from '@analogjs/router';

import { authGuard } from '../core/auth/auth.guard';
import { AuthService } from '../core/auth/auth.service';
import { canViewFinancials } from '../core/auth/roles';
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
  users:
    'M12 8a3 3 0 1 0-.001-6.001A3 3 0 0 0 12 8ZM12 10a5 5 0 0 0-5 5v1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1a5 5 0 0 0-5-5ZM18 11h1a2 2 0 0 1 2 2v3M21 21v-1a4 4 0 0 0-3-3.87',
} as const;

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    links: [{ route: '/', label: 'Dashboard', icon: ICONS.dashboard, exact: true }],
  },
  {
    label: 'Warehouse',
    links: [
      { route: '/products', label: 'Products', icon: ICONS.products },
      { route: '/damages', label: 'Damages', icon: ICONS.damages },
    ],
  },
  {
    label: 'Sales',
    links: [
      { route: '/customers', label: 'Customers', icon: ICONS.customers },
      { route: '/returns', label: 'Returns', icon: ICONS.returns },
    ],
  },
  {
    label: 'Procurement',
    links: [
      { route: '/suppliers', label: 'Suppliers', icon: ICONS.suppliers },
      { route: '/purchase-orders', label: 'Purchase Orders', icon: ICONS.purchaseOrders },
    ],
  },
  {
    label: 'Ledger',
    links: [{ route: '/transactions', label: 'Transactions', icon: ICONS.transactions }],
  },
  {
    label: 'Administration',
    links: [{ route: '/admin', label: 'Users & Roles', icon: ICONS.users }],
  },
];

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-screen overflow-hidden bg-[#080E1E] font-sans text-slate-300 selection:bg-cyan-500/20">
      <!-- Desktop sidebar -->
      <aside
        class="hidden h-full w-[272px] shrink-0 flex-col border-r border-white/[0.06] bg-[#0C1426] lg:flex"
      >
        <!-- Brand -->
        <div class="shrink-0 px-5 pb-4 pt-6">
          <a routerLink="/" class="flex items-center gap-3">
            <span
              class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-[0_4px_16px_rgba(34,211,238,0.35)]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5">
                <path d="M3 7h13v10H3zM16 10h3l2 3v4h-5z" />
                <circle cx="7.5" cy="17.5" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="17.5" cy="17.5" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <span class="min-w-0">
              <span class="block font-heading text-[15px] font-semibold leading-none tracking-tight text-white">ShenoInventory</span>
              <span class="block text-[11px] font-medium tracking-widest text-slate-500">WAREHOUSE OS</span>
            </span>
            <span class="ml-auto rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold tracking-widest text-cyan-300">LIVE</span>
          </a>
          <div class="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
            <span class="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]"></span>
            <span class="text-xs font-medium text-slate-300">All systems operational</span>
            <span class="ml-auto text-[11px] text-slate-500">v2.1</span>
          </div>
        </div>

        <nav class="mt-2 flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-2">
          @for (section of navSections(); track section.label; let index = $index) {
            <p class="mb-2 mt-5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {{ section.label }}
            </p>
            <div class="space-y-1">
              @for (link of section.links; track link.route) {
                <a
                  [routerLink]="link.route"
                  routerLinkActive="!bg-white/[0.07] !text-white !border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  [routerLinkActiveOptions]="{ exact: link.exact === true }"
                  class="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-[13.5px] font-medium leading-none text-slate-400 transition-all hover:border-white/[0.06] hover:bg-white/[0.04] hover:text-slate-200"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                    class="h-[18px] w-[18px] shrink-0 opacity-80 group-[.bg-white]:opacity-100"
                  >
                    <path [attr.d]="link.icon" />
                  </svg>
                  <span class="truncate">{{ link.label }}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="ml-auto h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-40 group-[.bg-white]:opacity-60">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </a>
              }
            </div>
          }
        </nav>

        <div class="shrink-0 border-t border-white/[0.06] p-4">
          <div class="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 text-sm font-semibold text-white ring-1 ring-white/10">
              {{ initials() }}
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-[13px] font-medium leading-none text-white">{{ user()?.name ?? 'Demo User' }}</span>
              <span class="block truncate text-xs leading-none text-slate-500">{{ user()?.email ?? 'demo@shenodev.tech' }}</span>
            </span>
            <span class="h-2 w-2 shrink-0 rounded-full bg-emerald-400"></span>
          </div>
          <button
            type="button"
            (click)="signOut()"
            class="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="h-4 w-4"><path d="M16 17l5-5-5-5M21 12H9M13 21H6a2 2 0 01-2-2V5a2 2 0 012-2h7" /></svg>
            Sign out
          </button>
          <p class="mt-3 text-center text-[11px] leading-none text-slate-600">Secure session · Sanctum</p>
        </div>
      </aside>

      <!-- Mobile drawer overlay -->
      @if (mobileOpen()) {
        <div class="fixed inset-0 z-40 flex lg:hidden" role="dialog" aria-modal="true">
          <button type="button" (click)="mobileOpen.set(false)" class="absolute inset-0 bg-[#080E1E]/70 backdrop-blur-sm" aria-label="Close navigation"></button>
          <aside class="relative flex w-[300px] flex-col border-r border-white/10 bg-[#0C1426] p-4">
            <a routerLink="/" (click)="mobileOpen.set(false)" class="flex items-center gap-3">
              <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 text-white"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5"><path d="M3 7h13v10H3zM16 10h3l2 3v4h-5z" /></svg></span>
              <span class="font-heading text-[15px] font-semibold text-white">ShenoInventory</span>
            </a>
            <nav class="mt-6 flex flex-1 flex-col gap-1 overflow-y-auto">
              @for (section of navSections(); track section.label) {
                <p class="mt-4 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{{ section.label }}</p>
                @for (link of section.links; track link.route) {
                  <a [routerLink]="link.route" (click)="mobileOpen.set(false)" routerLinkActive="bg-white/[0.07] text-white" class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/[0.04] hover:text-slate-200">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="h-5 w-5"><path [attr.d]="link.icon" /></svg>
                    {{ link.label }}
                  </a>
                }
              }
            </nav>
            <button type="button" (click)="signOut()" class="mt-4 w-full rounded-xl border border-white/10 px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/[0.06] hover:text-white">Sign out</button>
          </aside>
        </div>
      }

      <!-- Main -->
      <div class="flex min-w-0 flex-1 flex-col">
        <!-- Sticky top bar -->
        <header class="sticky top-0 z-20 flex h-[60px] shrink-0 items-center gap-3 border-b border-white/[0.06] bg-[#080E1E]/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <button type="button" (click)="mobileOpen.set(true)" class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06] hover:text-white lg:hidden" aria-label="Open navigation">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" class="h-5 w-5"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>

          <div class="hidden min-w-0 items-center gap-3 lg:flex">
            <span class="hidden h-6 w-px bg-white/10 sm:block"></span>
            <div class="min-w-0">
              <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500"><span class="h-1.5 w-1.5 rounded-full bg-cyan-400"></span> Warehouse OS</p>
              <p class="truncate text-[13px] font-medium text-slate-300 hidden xl:block">Aisle-accurate inventory · barcode-native operations</p>
            </div>
          </div>

          <div class="ml-auto flex items-center gap-2 sm:gap-3">
            <span class="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300 sm:inline-flex">
              <span class="h-2 w-2 rounded-full bg-emerald-400"></span>
              Live sync
            </span>
            <span class="hidden h-6 w-px bg-white/10 sm:block"></span>
            <span class="hidden text-right sm:block">
              <span class="block text-xs font-medium leading-none text-white">{{ user()?.name ?? 'Demo User' }}</span>
              <span class="block text-[11px] leading-none text-slate-500">{{ displayRole() }}</span>
            </span>
            <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-[#111E32] text-sm font-semibold text-white ring-1 ring-white/10">{{ initials() }}</span>
          </div>
        </header>

        <!-- Content -->
        <main class="min-w-0 flex-1 overflow-y-auto bg-[radial-gradient(900px_400px_at_20%_0%,rgba(34,211,238,0.06),transparent_60%),radial-gradient(700px_380px_at_90%_6%,rgba(59,130,246,0.05),transparent_55%)]">
          <div class="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <router-outlet />
          </div>
          <footer class="border-t border-white/[0.04] px-6 py-6 text-[11px] tracking-wide text-slate-500">
            <div class="mx-auto max-w-[1500px] space-y-3">
              <div class="flex flex-wrap justify-center gap-x-4 gap-y-2">
                <a routerLink="/legal/privacy" class="underline decoration-white/20 underline-offset-4 hover:text-slate-300">Privacy</a>
                <a routerLink="/legal/terms" class="underline decoration-white/20 underline-offset-4 hover:text-slate-300">Terms</a>
                <a routerLink="/legal/cookies" class="underline decoration-white/20 underline-offset-4 hover:text-slate-300">Cookies</a>
                <a routerLink="/legal/refund" class="underline decoration-white/20 underline-offset-4 hover:text-slate-300">Refund</a>
                <a routerLink="/legal/licenses" class="underline decoration-white/20 underline-offset-4 hover:text-slate-300">Licenses</a>
                <a routerLink="/legal/deletion" class="underline decoration-white/20 underline-offset-4 hover:text-slate-300">Data deletion</a>
              </div>
              <p>Shenodev — ShenoInventory Warehouse OS · 3 Warehouse Lane, Tallinn 10111, Estonia · VAT EE123456789 · support&#64;shenodev.tech · privacy&#64;shenodev.tech</p>
              <p class="text-slate-600">ShenoInventory · Warehouse OS · Built for barcode-native ops — Aisle/Bay/Shelf precision · Sora & Inter fonts (OFL) · No tracking, no hidden fees — <span class="font-mono">© 2026 Shenodev</span></p>
            </div>
          </footer>
        </main>
      </div>

      <!-- Toasts -->
      <div class="pointer-events-none fixed right-4 top-[68px] z-[100] flex w-full max-w-sm flex-col gap-3 sm:right-5" aria-live="polite">
        @for (toast of toasts(); track toast.id) {
          <div
            class="pointer-events-auto animate-[fade-in_0.25s_ease] rounded-xl border px-4 py-3 text-sm backdrop-blur-xl"
            role="status"
            [class]="toast.type === 'error' ? 'border-red-500/30 bg-[#1A2337]/90 text-red-200 shadow-[0_8px_24px_rgba(0,0,0,0.5)]' : 'border-cyan-400/25 bg-[#111E32]/90 text-slate-100 shadow-[0_8px_24px_rgba(0,0,0,0.45)]'"
          >
            <div class="flex items-start justify-between gap-3">
              <p class="min-w-0 flex-1 leading-snug">{{ toast.message }}</p>
              <button type="button" (click)="dismissToast(toast.id)" aria-label="Dismiss notification" class="shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export default class AppShell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toaster = inject(ToastService);

  protected readonly mobileOpen = signal(false);
  protected readonly navSections = computed(() => {
    const role = this.user()?.role;
    const canViewLedger = canViewFinancials(role);
    const isAdmin = (role ?? '').toLowerCase() === 'admin';

    return NAV_SECTIONS.filter((section) => {
      if (section.label === 'Ledger') {
        return canViewLedger;
      }

      if (section.label === 'Administration') {
        return isAdmin;
      }

      return true;
    });
  });
  protected readonly user = this.auth.currentUser;
  protected readonly toasts = this.toaster.toasts;
  private readonly canViewFinancials = computed(() => canViewFinancials(this.user()?.role));

  protected initials(): string {
    const name = this.user()?.name ?? 'Demo User';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'DU';
  }

  protected displayRole(): string {
    const role = this.user()?.role;

    if (role === undefined || role === '') {
      return 'Operator';
    }

    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  constructor() {
    afterNextRender(() => this.enforceSession());
  }

  private enforceSession(): void {
    if (this.auth.isAuthenticated()) {
      return;
    }

    // An authenticated reload arrives here with its in-memory access token wiped
    // (memory-only by design). Try to restore the session from the httpOnly
    // refresh cookie before sending anyone to the sign-in page.
    this.auth.tryRefresh().subscribe({
      next: () => {
        if (!this.auth.isAuthenticated()) {
          void this.router.navigateByUrl('/login');
        }
      },
      error: () => {
        this.auth.clearSession();

        void this.router.navigateByUrl('/login');
      },
    });
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
