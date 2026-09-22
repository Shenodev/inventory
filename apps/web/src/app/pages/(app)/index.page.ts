import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouteMeta } from '@analogjs/router';
import { catchError, forkJoin, of, throwError } from 'rxjs';

import { AuthSessionStore } from '../../core/auth/auth-session.store';
import { canViewFinancials } from '../../core/auth/roles';
import { DashboardOverview, DashboardService } from '../../core/dashboard/dashboard.service';
import {
  FinancialOverview,
  FinancialsService,
} from '../../core/financials/financials.service';
import { formatCurrency, formatNumber } from '../../core/format';

export const routeMeta: RouteMeta = {
  title: 'Dashboard · ShenoInventory',
};

interface RecentSale {
  id: string;
  product: string;
  customer: string;
  quantity: number;
  price: string;
}

@Component({
  selector: 'app-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Header with ops context -->
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <p class="inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-semibold tracking-widest text-cyan-300">
          <span class="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
          LIVE WAREHOUSE OS
        </p>
        <h1 class="mt-3 font-heading text-[28px] font-semibold tracking-tight text-white sm:text-[30px]">Dashboard</h1>
        <p class="mt-1 max-w-xl text-[13.5px] leading-relaxed text-slate-400">
          Profitability, cash flow and aisle-accurate inventory valuation — barcode-native operations at a glance.
        </p>
      </div>
      <div class="flex items-center gap-2 sm:gap-3">
        <span class="hidden rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-400 sm:inline-flex">Aisle · Bay · Shelf precision</span>
        <button
          type="button"
          (click)="load(true)"
          [disabled]="loading()"
          class="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="h-4 w-4"><path d="M21 12a9 9 0 11-2.64-6.36M21 3v6h-6" /></svg>
          {{ loading() ? 'Refreshing…' : 'Refresh' }}
        </button>
      </div>
    </header>

    @if (error(); as message) {
      <div class="mt-6 flex items-center justify-between gap-4 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 backdrop-blur">
        <p class="text-sm text-red-200">{{ message }}</p>
        <button
          type="button"
          (click)="load(true)"
          class="shrink-0 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-400"
        >
          Retry
        </button>
      </div>
    }

    <!-- Primary KPI bento -->
    @if (canViewFinancials()) {
      <section class="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article class="card-premium group relative overflow-hidden rounded-2xl p-5 transition-all hover:shadow-card-hover">
          <div class="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.07] via-transparent to-transparent opacity-60"></div>
          <div class="relative flex items-start justify-between">
            <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Net Profit</p>
            <span class="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/10 text-cyan-300">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="h-[18px] w-[18px]"><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></svg>
            </span>
          </div>
          <p class="relative mt-4 font-heading text-[28px] font-semibold tracking-tight" [class]="netProfitClass()">{{ netProfit() }}</p>
          <p class="relative mt-1 text-xs text-slate-500">Income after expenses · margin {{ grossMargin() }}</p>
          <div class="relative mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
            <span class="block h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" [style.width]="profitBar()"></span>
          </div>
        </article>

      <article class="card-premium group relative overflow-hidden rounded-2xl p-5 transition-all hover:shadow-card-hover">
        <div class="absolute inset-0 bg-gradient-to-br from-blue-500/[0.06] via-transparent to-transparent opacity-60"></div>
        <div class="relative flex items-start justify-between">
          <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Total Revenue</p>
          <span class="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="h-[18px] w-[18px]"><circle cx="12" cy="12" r="9" /><path d="M12 7v10" /><path d="M14.5 9.5c0-1.1-1.1-2-2.5-2s-2.5.9-2.5 2 1.1 1.8 2.5 2 2.5.9 2.5 2-1.1 2-2.5 2-2.5-.9-2.5-2" /></svg>
          </span>
        </div>
        <p class="relative mt-4 font-heading text-[28px] font-semibold tracking-tight text-white">{{ totalRevenue() }}</p>
        <p class="relative mt-1 text-xs text-slate-500">All recorded income · {{ totalIncomeNote() }}</p>
        <div class="relative mt-3 flex items-center gap-1.5 text-[11px] font-medium text-emerald-300">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> Barcode-verified receipts
        </div>
      </article>

      <article class="card-premium group relative overflow-hidden rounded-2xl p-5 transition-all hover:shadow-card-hover">
        <div class="absolute inset-0 bg-gradient-to-br from-red-500/[0.07] via-transparent to-transparent opacity-60"></div>
        <div class="relative flex items-start justify-between">
          <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Total Expenses</p>
          <span class="flex h-9 w-9 items-center justify-center rounded-xl border border-red-400/15 bg-red-400/10 text-red-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="h-[18px] w-[18px]"><path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" /><path d="M4 7l8 4 8-4" /><path d="M12 21V11" /></svg>
          </span>
        </div>
        <p class="relative mt-4 font-heading text-[28px] font-semibold tracking-tight" [class]="totalExpensesClass()">{{ totalExpenses() }}</p>
        <p class="relative mt-1 text-xs text-slate-500">Outflows and write-offs</p>
        <div class="relative mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
          <span class="block h-full rounded-full bg-gradient-to-r from-red-400 to-orange-400" [style.width]="expenseBar()"></span>
        </div>
      </article>

      <article class="card-premium group relative overflow-hidden rounded-2xl p-5 transition-all hover:shadow-card-hover">
        <div class="absolute inset-0 bg-gradient-to-br from-violet-500/[0.06] via-transparent to-transparent opacity-60"></div>
        <div class="relative flex items-start justify-between">
          <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Inventory Valuation</p>
          <span class="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-400/10 text-violet-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="h-[18px] w-[18px]"><path d="M3 7h13v10H3zM16 10h3l2 3v4h-5z" /><circle cx="7.5" cy="17.5" r="1.5" /><circle cx="17.5" cy="17.5" r="1.5" /></svg>
          </span>
        </div>
        <p class="relative mt-4 font-heading text-[28px] font-semibold tracking-tight text-white">{{ inventoryValuation() }}</p>
        <p class="relative mt-1 text-xs text-slate-500">Stock at cost · {{ totalInventory() }} units</p>
          <div class="relative mt-3 flex items-center gap-2 text-[11px] text-slate-500">
            <span class="h-px flex-1 bg-white/10"></span>
            Aisle-accurate
          </div>
        </article>
      </section>
    }

    <!-- Secondary metrics -->
    <section class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <article class="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur">
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/15">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="h-5 w-5"><path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6" /></svg>
        </span>
        <span class="min-w-0">
          <span class="block text-[11px] font-semibold uppercase tracking-widest text-slate-500">Reservations</span>
          <span class="block font-heading text-xl font-semibold text-white">{{ activeReservations() }}</span>
          <span class="block text-xs text-slate-500">Awaiting fulfillment</span>
        </span>
        <span class="ml-auto hidden h-8 w-16 rounded-lg bg-gradient-to-b from-cyan-400/10 to-transparent sm:block"></span>
      </article>

      <article class="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur">
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/15">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="h-5 w-5"><path d="M3 12V5a2 2 0 012-2h7l9 9-9 9-9-9Z" /></svg>
        </span>
        <span class="min-w-0">
          <span class="block text-[11px] font-semibold uppercase tracking-widest text-slate-500">Units in stock</span>
          <span class="block font-heading text-xl font-semibold text-white">{{ totalInventory() }}</span>
          <span class="block text-xs text-slate-500">Across catalog</span>
        </span>
      </article>

      @if (canViewFinancials()) {
        <article class="flex items-center gap-4 rounded-2xl border border-amber-400/15 bg-amber-400/10 p-4 backdrop-blur">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="h-5 w-5"><path d="M3 12a9 9 0 103-6.7L3 8M3 3v5h5" /></svg>
          </span>
          <span class="min-w-0">
            <span class="block text-[11px] font-semibold uppercase tracking-widest text-amber-300/80">Units returned</span>
            <span class="block font-heading text-xl font-semibold text-amber-300">{{ unitsReturned() }}</span>
            <span class="block text-xs text-amber-200/60">Restored to stock</span>
          </span>
        </article>

        <article class="flex items-center gap-4 rounded-2xl border border-red-400/15 bg-red-400/10 p-4 backdrop-blur">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-400/15 text-red-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="h-5 w-5"><path d="M10.3 3.9 1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0ZM12 9v4M12 17h.01" /></svg>
          </span>
          <span class="min-w-0">
            <span class="block text-[11px] font-semibold uppercase tracking-widest text-red-300/80">Damaged</span>
            <span class="block font-heading text-xl font-semibold text-red-300">{{ damagedUnits() }}</span>
            <span class="block text-xs text-red-200/60">Write-offs</span>
          </span>
        </article>
      }
    </section>

    <!-- Recent sales + Ops hint -->
    <section class="mt-6 grid gap-4 lg:grid-cols-[1.35fr_0.75fr]">
      <div class="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111E32] shadow-card">
        <header class="flex items-start justify-between border-b border-white/[0.06] px-6 py-5">
          <div>
            <h2 class="font-heading text-[15px] font-semibold text-white">Recent sales</h2>
            <p class="mt-1 text-xs text-slate-500">Latest fulfilled orders — who bought what, barcode-verified.</p>
          </div>
          <span class="hidden rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium tracking-wide text-slate-400 sm:inline-flex">{{ recentSales().length }} shown</span>
        </header>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-white/[0.06] bg-white/[0.015] text-[11px] uppercase tracking-widest text-slate-500">
              <tr>
                <th scope="col" class="px-6 py-3 font-semibold">Product</th>
                <th scope="col" class="px-6 py-3 font-semibold">Customer</th>
                <th scope="col" class="px-6 py-3 text-right font-semibold">Price</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/[0.04]">
              @for (sale of recentSales(); track sale.id) {
                <tr class="group transition-colors hover:bg-white/[0.03]">
                  <td class="px-6 py-4">
                    <p class="font-medium text-white group-hover:text-cyan-100">{{ sale.product }}</p>
                    <p class="mt-0.5 text-xs text-slate-500">Qty {{ sale.quantity }}</p>
                  </td>
                  <td class="px-6 py-4 text-slate-300">{{ sale.customer }}</td>
                  <td class="px-6 py-4 text-right font-medium font-mono text-cyan-300">{{ sale.price }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="3" class="px-6 py-10 text-center text-slate-500">
                    {{ loading() ? 'Loading recent sales…' : 'No sales recorded yet.' }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <div class="rounded-2xl border border-cyan-400/15 bg-gradient-to-br from-[#111E32] via-[#0F1F36] to-[#0B1224] p-6 shadow-card">
        <p class="text-[11px] font-semibold uppercase tracking-widest text-cyan-300">Warehouse tip</p>
        <h3 class="mt-2 font-heading text-[16px] font-semibold leading-snug text-white">Scan, don’t select — 3× faster picking.</h3>
        <p class="mt-2 text-[13px] leading-relaxed text-slate-400">Every product now has <span class="font-medium text-slate-200">Aisle/Bay/Shelf</span> location and a scannable <span class="font-mono text-cyan-300">barcode</span>. Use the scanner on Products, Damages and Purchase Orders instead of dropdowns — handheld scanners act as keyboard wedge.</p>
        <div class="mt-4 grid grid-cols-2 gap-2 text-xs">
          <span class="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-slate-300">Aisle 4, Bay 3, Shelf B</span>
          <span class="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 font-mono text-cyan-200">5901234123457</span>
        </div>
        <p class="mt-3 text-[11px] text-slate-500">Tip: Camera scan works in Chrome/Edge via BarcodeDetector — fallback to input always works.</p>
      </div>
    </section>
  `,
})
export default class DashboardPage {
  private readonly session = inject(AuthSessionStore);
  private readonly dashboard = inject(DashboardService);
  private readonly financials = inject(FinancialsService);

  protected readonly overview = signal<DashboardOverview | null>(null);
  protected readonly financialOverview = signal<FinancialOverview | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly canViewFinancials = computed(() => canViewFinancials(this.session.user()?.role));

  protected readonly netProfit = computed(() => {
    const overview = this.financialOverview();
    return overview ? formatCurrency(overview.net_profit) : '—';
  });

  protected readonly netProfitClass = computed(() =>
    (this.financialOverview()?.net_profit ?? 0) >= 0 ? 'text-cyan-300' : 'text-red-300'
  );

  protected readonly totalRevenue = computed(() => {
    const overview = this.financialOverview();
    return overview ? formatCurrency(overview.total_income) : '—';
  });

  protected readonly totalExpenses = computed(() => {
    const overview = this.financialOverview();
    return overview ? formatCurrency(overview.total_expenses) : '—';
  });

  protected readonly totalExpensesClass = computed(() =>
    (this.financialOverview()?.total_expenses ?? 0) > 0 ? 'text-red-300' : 'text-cyan-300'
  );

  protected readonly inventoryValuation = computed(() => {
    const overview = this.financialOverview();
    return overview ? formatCurrency(overview.inventory_valuation) : '—';
  });

  protected readonly totalInventory = computed(() => {
    const overview = this.overview();
    return overview ? formatNumber(overview.total_products_in_stock) : '—';
  });

  protected readonly activeReservations = computed(() => {
    const overview = this.overview();
    return overview ? formatNumber(overview.reserved_orders) : '—';
  });

  protected readonly unitsReturned = computed(() => {
    const overview = this.financialOverview();
    return overview ? formatNumber(overview.returns_quantity) : '—';
  });

  protected readonly damagedUnits = computed(() => {
    const overview = this.financialOverview();
    return overview ? formatNumber(overview.damaged_quantity) : '—';
  });

  protected grossMargin(): string {
    const fin = this.financialOverview();
    if (!fin || fin.total_income === 0) return '—';
    const margin = ((fin.net_profit / fin.total_income) * 100).toFixed(1);
    return `${margin}%`;
  }
  protected profitBar(): string {
    const fin = this.financialOverview();
    if (!fin || fin.total_income === 0) return '18%';
    const ratio = Math.max(0, Math.min(100, (fin.net_profit / fin.total_income) * 100));
    return `${Math.round(18 + ratio * 0.6)}%`;
  }
  protected expenseBar(): string {
    const fin = this.financialOverview();
    if (!fin || fin.total_income === 0) return '22%';
    const ratio = Math.max(0, Math.min(100, (fin.total_expenses / fin.total_income) * 100));
    return `${Math.round(ratio)}%`;
  }
  protected totalIncomeNote(): string {
    const fin = this.financialOverview();
    if (!fin) return '—';
    return `${formatNumber(fin.returns_quantity)} returns`;
  }

  protected readonly recentSales = computed<RecentSale[]>(() =>
    (this.overview()?.recently_sold ?? []).flatMap((order) =>
      order.items.map((item) => ({
        id: `${order.id}-${item.product_id}`,
        product: item.product_name,
        customer: order.customer?.name ?? 'Unknown',
        quantity: item.quantity,
        price: formatCurrency(Number(item.unit_price) * item.quantity),
      }))
    )
  );

  constructor() {
    afterNextRender(() => this.load());
  }

  protected load(force = false): void {
    this.loading.set(true);
    this.error.set(null);

    // Financial overview is manager/admin-only (backend FinancialPolicy); skip
    // it entirely for other roles so a 403 can't take the whole dashboard down.
    // A 403 (e.g. role drift between local session and server) degrades to an
    // empty financial section instead of killing the operational dashboard.
    const financials = this.canViewFinancials()
      ? this.financials.getOverview(force).pipe(
          catchError((error: unknown) =>
            error instanceof HttpErrorResponse && error.status === 403 ? of(null) : throwError(() => error)
          ),
        )
      : of(null);

    forkJoin({
      overview: this.dashboard.getOverview(force),
      financials,
    }).subscribe({
      next: ({ overview, financials: fin }) => {
        this.overview.set(overview);
        this.financialOverview.set(fin);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(this.messageFor(error));
      },
    });
  }

  private messageFor(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        return 'Your session expired. Please sign in again.';
      }

      if (error.status === 0) {
        return 'Cannot reach the server. Please try again.';
      }
    }

    return 'Unable to load the dashboard right now.';
  }
}
