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
import { forkJoin } from 'rxjs';

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
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-heading text-2xl font-semibold text-white">Dashboard</h1>
        <p class="mt-1 text-sm text-slate-400">
          Profitability, cash flow and inventory valuation at a glance.
        </p>
      </div>
      <button
        type="button"
        (click)="load(true)"
        [disabled]="loading()"
        class="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-surface hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {{ loading() ? 'Refreshing…' : 'Refresh' }}
      </button>
    </header>

    @if (error(); as message) {
      <div class="mt-6 flex items-center justify-between gap-4 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4">
        <p class="text-sm text-red-200">{{ message }}</p>
        <button
          type="button"
          (click)="load(true)"
          class="shrink-0 rounded-xl bg-red-500/90 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
        >
          Retry
        </button>
      </div>
    }

    <section class="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      <article class="rounded-xl bg-surface p-6">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-slate-400">Net Profit</p>
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-deep-slate text-electric-cyan">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5">
              <path d="M3 17l6-6 4 4 8-8" />
              <path d="M14 7h7v7" />
            </svg>
          </span>
        </div>
        <p class="mt-4 font-heading text-3xl font-semibold" [class]="netProfitClass()">
          {{ netProfit() }}
        </p>
        <p class="mt-1 text-xs text-slate-500">Income after expenses</p>
      </article>

      <article class="rounded-xl bg-surface p-6">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-slate-400">Total Revenue</p>
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-deep-slate text-electric-cyan">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v10" />
              <path d="M14.5 9.5c0-1.1-1.1-2-2.5-2s-2.5.9-2.5 2 1.1 1.8 2.5 2 2.5.9 2.5 2-1.1 2-2.5 2-2.5-.9-2.5-2" />
            </svg>
          </span>
        </div>
        <p class="mt-4 font-heading text-3xl font-semibold text-electric-cyan">{{ totalRevenue() }}</p>
        <p class="mt-1 text-xs text-slate-500">All recorded income</p>
      </article>

      <article class="rounded-xl bg-surface p-6">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-slate-400">Total Expenses</p>
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-deep-slate text-red-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5">
              <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
              <path d="M4 7l8 4 8-4" />
              <path d="M12 21V11" />
            </svg>
          </span>
        </div>
        <p class="mt-4 font-heading text-3xl font-semibold" [class]="totalExpensesClass()">
          {{ totalExpenses() }}
        </p>
        <p class="mt-1 text-xs text-slate-500">Outflows and write-offs</p>
      </article>

      <article class="rounded-xl bg-surface p-6">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-slate-400">Inventory Valuation</p>
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-deep-slate text-electric-cyan">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5">
              <path d="M3 7h13v10H3zM16 10h3l2 3v4h-5z" />
              <circle cx="7.5" cy="17.5" r="1.5" />
              <circle cx="17.5" cy="17.5" r="1.5" />
            </svg>
          </span>
        </div>
        <p class="mt-4 font-heading text-3xl font-semibold text-electric-cyan">{{ inventoryValuation() }}</p>
        <p class="mt-1 text-xs text-slate-500">Stock at cost price</p>
      </article>
    </section>

    <section class="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      <article class="rounded-xl bg-surface p-5">
        <p class="text-sm font-medium text-slate-400">Active reservations</p>
        <p class="mt-2 font-heading text-2xl font-semibold text-electric-cyan">{{ activeReservations() }}</p>
        <p class="mt-1 text-xs text-slate-500">Awaiting fulfillment</p>
      </article>

      <article class="rounded-xl bg-surface p-5">
        <p class="text-sm font-medium text-slate-400">Units in stock</p>
        <p class="mt-2 font-heading text-2xl font-semibold text-white">{{ totalInventory() }}</p>
        <p class="mt-1 text-xs text-slate-500">Across the catalog</p>
      </article>

      <article class="rounded-xl bg-surface p-5">
        <p class="text-sm font-medium text-slate-400">Units returned</p>
        <p class="mt-2 font-heading text-2xl font-semibold text-amber-300">{{ unitsReturned() }}</p>
        <p class="mt-1 text-xs text-slate-500">Restored to stock</p>
      </article>

      <article class="rounded-xl bg-surface p-5">
        <p class="text-sm font-medium text-slate-400">Damaged write-offs</p>
        <p class="mt-2 font-heading text-2xl font-semibold text-red-300">{{ damagedUnits() }}</p>
        <p class="mt-1 text-xs text-slate-500">Broken or unusable units</p>
      </article>
    </section>

    <section class="mt-6 overflow-hidden rounded-xl bg-surface">
      <header class="px-6 py-5">
        <h2 class="font-heading text-lg font-semibold text-white">Recent sales</h2>
        <p class="mt-1 text-sm text-slate-400">The latest sold orders and who bought them.</p>
      </header>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-y border-white/5 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" class="px-6 py-3 font-medium">Product</th>
              <th scope="col" class="px-6 py-3 font-medium">Customer</th>
              <th scope="col" class="px-6 py-3 text-right font-medium">Price</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            @for (sale of recentSales(); track sale.id) {
              <tr class="transition-colors hover:bg-deep-slate/60">
                <td class="px-6 py-4">
                  <p class="font-medium text-white">{{ sale.product }}</p>
                  <p class="mt-0.5 text-xs text-slate-500">Qty {{ sale.quantity }}</p>
                </td>
                <td class="px-6 py-4 text-slate-300">{{ sale.customer }}</td>
                <td class="px-6 py-4 text-right font-medium text-electric-cyan">{{ sale.price }}</td>
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
    </section>
  `,
})
export default class DashboardPage {
  private readonly dashboard = inject(DashboardService);
  private readonly financials = inject(FinancialsService);

  protected readonly overview = signal<DashboardOverview | null>(null);
  protected readonly financialOverview = signal<FinancialOverview | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly netProfit = computed(() => {
    const overview = this.financialOverview();
    return overview ? formatCurrency(overview.net_profit) : '—';
  });

  protected readonly netProfitClass = computed(() =>
    (this.financialOverview()?.net_profit ?? 0) >= 0 ? 'text-electric-cyan' : 'text-red-300'
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
    (this.financialOverview()?.total_expenses ?? 0) > 0 ? 'text-red-300' : 'text-electric-cyan'
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

    forkJoin({
      overview: this.dashboard.getOverview(force),
      financials: this.financials.getOverview(force),
    }).subscribe({
      next: ({ overview, financials }) => {
        this.overview.set(overview);
        this.financialOverview.set(financials);
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