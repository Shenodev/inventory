import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouteMeta } from '@analogjs/router';

import { apiErrorMessage } from '../../core/api-error';
import { formatDate, formatNumber } from '../../core/format';
import { SaleReturnEntry, SalesOrdersService } from '../../core/sales/sales-orders.service';

export const routeMeta: RouteMeta = {
  title: 'Returns · ShenoInventory',
};

@Component({
  selector: 'app-returns-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-heading text-2xl font-semibold text-white">Returns</h1>
        <p class="mt-1 text-sm text-slate-400">
          Goods returned against shipped sales orders.
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

    <section class="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      <article class="rounded-xl bg-surface p-6">
        <p class="text-sm font-medium text-slate-400">Returns recorded</p>
        <p class="mt-2 font-heading text-2xl font-semibold text-white">{{ formatNumber(filteredReturns().length) }}</p>
        <p class="mt-1 text-xs text-slate-500">Return line items ({{ formatNumber(returns().length) }} total)</p>
      </article>
      <article class="rounded-xl bg-surface p-6">
        <p class="text-sm font-medium text-slate-400">Units returned</p>
        <p class="mt-2 font-heading text-2xl font-semibold text-amber-300">{{ totalUnitsReturned() }}</p>
        <p class="mt-1 text-xs text-slate-500">Filtered total</p>
      </article>
      <article class="rounded-xl bg-surface p-6">
        <p class="text-sm font-medium text-slate-400">Orders affected</p>
        <p class="mt-2 font-heading text-2xl font-semibold text-white">{{ ordersAffected() }}</p>
        <p class="mt-1 text-xs text-slate-500">Distinct sales orders (filtered)</p>
      </article>
    </section>

    <div class="mt-6 flex flex-wrap items-center gap-3">
      <label class="relative flex min-w-0 flex-1 items-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="pointer-events-none absolute left-3 h-4 w-4 text-slate-500">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.4-3.4" />
        </svg>
        <input
          type="search"
          placeholder="Search by order, customer, product or reason…"
          [value]="query()"
          (input)="onQuery($event)"
          class="w-full rounded-xl border border-white/10 bg-surface py-2.5 pl-10 pr-10 text-sm text-white outline-none placeholder:text-slate-500 focus:border-electric-cyan"
        />
        @if (query() !== '') {
          <button type="button" (click)="query.set('')" aria-label="Clear search" class="absolute right-2 rounded-lg p-1 text-slate-400 transition-colors hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        }
      </label>
      <span class="text-sm text-slate-500">{{ filteredReturns().length }} of {{ returns().length }}</span>
    </div>

    <div class="mt-3 flex flex-wrap items-center gap-3">
      <div class="flex gap-2 items-center">
        <label class="text-xs text-slate-500">From</label>
        <input type="date" [value]="dateFrom()" (change)="onDateFrom($event)" class="rounded-xl border border-white/10 bg-surface px-3 py-1.5 text-xs text-white outline-none focus:border-electric-cyan" />
        <label class="text-xs text-slate-500">To</label>
        <input type="date" [value]="dateTo()" (change)="onDateTo($event)" class="rounded-xl border border-white/10 bg-surface px-3 py-1.5 text-xs text-white outline-none focus:border-electric-cyan" />
        @if (dateFrom() || dateTo()) {
          <button type="button" (click)="clearDates()" class="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:text-white">Clear dates</button>
        }
      </div>
    </div>

    <section class="mt-6 overflow-hidden rounded-xl bg-surface">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-y border-white/5 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" class="px-6 py-3 font-medium">Order</th>
              <th scope="col" class="px-6 py-3 font-medium">Customer</th>
              <th scope="col" class="px-6 py-3 font-medium">Product</th>
              <th scope="col" class="px-6 py-3 text-right font-medium">Units</th>
              <th scope="col" class="px-6 py-3 font-medium">Reason</th>
              <th scope="col" class="px-6 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            @for (entry of filteredReturns(); track entry.id) {
              <tr class="transition-colors hover:bg-deep-slate/60">
                <td class="px-6 py-4">
                  <p class="font-medium text-white">#{{ entry.sales_order_id }}</p>
                </td>
                <td class="px-6 py-4 text-slate-300">{{ entry.customer ?? 'Unknown customer' }}</td>
                <td class="px-6 py-4">
                  <p class="font-medium text-white">{{ entry.product_name }}</p>
                  <p class="mt-0.5 text-xs text-slate-500">{{ entry.product_sku }}</p>
                </td>
                <td class="px-6 py-4 text-right text-slate-200">{{ formatNumber(entry.quantity) }}</td>
                <td class="px-6 py-4 text-slate-300">{{ entry.reason ?? 'Not specified' }}</td>
                <td class="px-6 py-4 text-slate-300">{{ formatDate(entry.created_at) }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="px-6 py-10 text-center text-slate-500">
                  {{ loading() ? 'Loading returns…' : (query() || dateFrom() || dateTo() ? 'No returns match your filters.' : 'No returns recorded yet.') }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export default class ReturnsPage {
  private readonly salesOrdersService = inject(SalesOrdersService);

  protected readonly returns = signal<SaleReturnEntry[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly query = signal('');
  protected readonly dateFrom = signal('');
  protected readonly dateTo = signal('');

  protected readonly filteredReturns = computed(() => {
    const needle = this.query().trim().toLowerCase();
    const from = this.dateFrom() ? new Date(this.dateFrom()) : null;
    const to = this.dateTo() ? new Date(this.dateTo()) : null;
    if (to) to.setHours(23, 59, 59, 999);
    return this.returns().filter((entry) => {
      if (needle) {
        const hay = `#${entry.sales_order_id} ${entry.customer ?? ''} ${entry.product_name ?? ''} ${entry.product_sku ?? ''} ${entry.reason ?? ''}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (from || to) {
        if (!entry.created_at) return false;
        const d = new Date(entry.created_at);
        if (from && d < from) return false;
        if (to && d > to) return false;
      }
      return true;
    });
  });

  protected readonly totalUnitsReturned = computed(() =>
    formatNumber(this.filteredReturns().reduce((sum, entry) => sum + entry.quantity, 0))
  );

  protected readonly ordersAffected = computed(() =>
    formatNumber(new Set(this.filteredReturns().map((entry) => entry.sales_order_id)).size)
  );

  constructor() {
    afterNextRender(() => this.load());
  }

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }
  protected onDateFrom(event: Event): void { this.dateFrom.set((event.target as HTMLInputElement).value); }
  protected onDateTo(event: Event): void { this.dateTo.set((event.target as HTMLInputElement).value); }
  protected clearDates(): void { this.dateFrom.set(''); this.dateTo.set(''); }

  protected load(force = false): void {
    this.loading.set(true);
    this.error.set(null);

    this.salesOrdersService.listReturns(force).subscribe({
      next: ({ returns }) => {
        this.returns.set(returns);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(this.messageFor(error));
      },
    });
  }

  protected formatNumber(value: number): string {
    return formatNumber(value);
  }

  protected formatDate(value: string | null): string {
    return formatDate(value);
  }

  private messageFor(error: unknown): string {
    return apiErrorMessage(error, 'Unable to load returns right now.');
  }
}
