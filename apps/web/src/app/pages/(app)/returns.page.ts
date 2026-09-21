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
        <p class="mt-2 font-heading text-2xl font-semibold text-white">{{ formatNumber(returns().length) }}</p>
        <p class="mt-1 text-xs text-slate-500">Return line items</p>
      </article>
      <article class="rounded-xl bg-surface p-6">
        <p class="text-sm font-medium text-slate-400">Units returned</p>
        <p class="mt-2 font-heading text-2xl font-semibold text-amber-300">{{ totalUnitsReturned() }}</p>
        <p class="mt-1 text-xs text-slate-500">Restored to stock</p>
      </article>
      <article class="rounded-xl bg-surface p-6">
        <p class="text-sm font-medium text-slate-400">Orders affected</p>
        <p class="mt-2 font-heading text-2xl font-semibold text-white">{{ ordersAffected() }}</p>
        <p class="mt-1 text-xs text-slate-500">Distinct sales orders</p>
      </article>
    </section>

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
            @for (entry of returns(); track entry.id) {
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
                  {{ loading() ? 'Loading returns…' : 'No returns recorded yet.' }}
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

  protected readonly totalUnitsReturned = computed(() =>
    formatNumber(this.returns().reduce((sum, entry) => sum + entry.quantity, 0))
  );

  protected readonly ordersAffected = computed(() =>
    formatNumber(new Set(this.returns().map((entry) => entry.sales_order_id)).size)
  );

  constructor() {
    afterNextRender(() => this.load());
  }

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
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        return 'Your session expired. Please sign in again.';
      }

      if (error.status === 0) {
        return 'Cannot reach the server. Please try again.';
      }
    }

    return 'Unable to load returns right now.';
  }
}