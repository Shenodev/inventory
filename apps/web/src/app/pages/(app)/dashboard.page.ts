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

import { DashboardOverview, DashboardService } from '../../core/dashboard/dashboard.service';
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
          Live inventory, revenue and reservation overview.
        </p>
      </div>
      <button
        type="button"
        (click)="load()"
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
          (click)="load()"
          class="shrink-0 rounded-xl bg-red-500/90 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
        >
          Retry
        </button>
      </div>
    }

    <section class="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      <article class="rounded-xl bg-surface p-6">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-slate-400">Total Inventory</p>
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-deep-slate text-electric-cyan">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5">
              <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
              <path d="M4 7l8 4 8-4" />
              <path d="M12 21V11" />
            </svg>
          </span>
        </div>
        <p class="mt-4 font-heading text-3xl font-semibold text-white">{{ totalInventory() }}</p>
        <p class="mt-1 text-xs text-slate-500">Units currently in stock</p>
      </article>

      <article class="rounded-xl bg-surface p-6">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-slate-400">Sold Revenue</p>
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-deep-slate text-electric-cyan">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v10" />
              <path d="M14.5 9.5c0-1.1-1.1-2-2.5-2s-2.5.9-2.5 2 1.1 1.8 2.5 2 2.5.9 2.5 2-1.1 2-2.5 2-2.5-.9-2.5-2" />
            </svg>
          </span>
        </div>
        <p class="mt-4 font-heading text-3xl font-semibold text-white">{{ soldRevenue() }}</p>
        <p class="mt-1 text-xs text-slate-500">From completed sales</p>
      </article>

      <article class="rounded-xl bg-surface p-6">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-slate-400">Active Reservations</p>
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-deep-slate text-electric-cyan">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </span>
        </div>
        <p class="mt-4 font-heading text-3xl font-semibold text-white">{{ activeReservations() }}</p>
        <p class="mt-1 text-xs text-slate-500">Orders reserved and awaiting pickup</p>
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

  protected readonly overview = signal<DashboardOverview | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly totalInventory = computed(() => {
    const overview = this.overview();
    return overview ? formatNumber(overview.total_products_in_stock) : '—';
  });

  protected readonly soldRevenue = computed(() => {
    const overview = this.overview();
    return overview ? formatCurrency(overview.total_revenue) : '—';
  });

  protected readonly activeReservations = computed(() => {
    const overview = this.overview();
    return overview ? formatNumber(overview.reserved_orders) : '—';
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

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.dashboard.getOverview().subscribe({
      next: (overview) => {
        this.overview.set(overview);
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
