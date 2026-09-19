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

import { formatCurrency, formatDate, formatNumber } from '../../core/format';
import { OrderLine, OrdersService } from '../../core/orders/orders.service';

export const routeMeta: RouteMeta = {
  title: 'Sales & Reservations · ShenoInventory',
};

type Tab = 'reserved' | 'sold';

@Component({
  selector: 'app-sales-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-heading text-2xl font-semibold text-white">Sales &amp; Reservations</h1>
        <p class="mt-1 text-sm text-slate-400">
          Exactly who reserved or bought what, and how much.
        </p>
      </div>
      <button
        type="button"
        (click)="reload(true)"
        [disabled]="activeLoading()"
        class="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-surface hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {{ activeLoading() ? 'Refreshing…' : 'Refresh' }}
      </button>
    </header>

    @if (activeError(); as message) {
      <div
        class="mt-6 flex items-center justify-between gap-4 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4"
      >
        <p class="text-sm text-red-200">{{ message }}</p>
        <button
          type="button"
          (click)="reload(true)"
          class="shrink-0 rounded-xl bg-red-500/90 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
        >
          Retry
        </button>
      </div>
    }

    <div class="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Order views">
      <button
        type="button"
        role="tab"
        [attr.aria-selected]="tab() === 'reserved'"
        (click)="selectTab('reserved')"
        [class]="tabClass('reserved')"
      >
        Reserved
        @if (reservedCount() !== null) {
          <span class="ml-1 text-xs opacity-70">({{ reservedCount() }})</span>
        }
      </button>
      <button
        type="button"
        role="tab"
        [attr.aria-selected]="tab() === 'sold'"
        (click)="selectTab('sold')"
        [class]="tabClass('sold')"
      >
        Sold
        @if (soldCount() !== null) {
          <span class="ml-1 text-xs opacity-70">({{ soldCount() }})</span>
        }
      </button>
    </div>

    <section class="mt-6 grid gap-6 sm:grid-cols-3">
      @if (tab() === 'reserved') {
        <article class="rounded-xl bg-surface p-6">
          <p class="text-sm font-medium text-slate-400">Reserved lines</p>
          <p class="mt-2 font-heading text-2xl font-semibold text-white">
            {{ formatNumber(reservedCount() ?? 0) }}
          </p>
          <p class="mt-1 text-xs text-slate-500">Items awaiting pickup</p>
        </article>
        <article class="rounded-xl bg-surface p-6">
          <p class="text-sm font-medium text-slate-400">Units reserved</p>
          <p class="mt-2 font-heading text-2xl font-semibold text-amber-300">
            {{ formatNumber(reservedUnits()) }}
          </p>
          <p class="mt-1 text-xs text-slate-500">Across all reservations</p>
        </article>
        <article class="rounded-xl bg-surface p-6">
          <p class="text-sm font-medium text-slate-400">Customers</p>
          <p class="mt-2 font-heading text-2xl font-semibold text-white">
            {{ formatNumber(reservedCustomers()) }}
          </p>
          <p class="mt-1 text-xs text-slate-500">Who reserved something</p>
        </article>
      } @else {
        <article class="rounded-xl bg-surface p-6">
          <p class="text-sm font-medium text-slate-400">Sold lines</p>
          <p class="mt-2 font-heading text-2xl font-semibold text-white">
            {{ formatNumber(soldCount() ?? 0) }}
          </p>
          <p class="mt-1 text-xs text-slate-500">Completed sales</p>
        </article>
        <article class="rounded-xl bg-surface p-6">
          <p class="text-sm font-medium text-slate-400">Units sold</p>
          <p class="mt-2 font-heading text-2xl font-semibold text-white">
            {{ formatNumber(soldUnits()) }}
          </p>
          <p class="mt-1 text-xs text-slate-500">Across all orders</p>
        </article>
        <article class="rounded-xl bg-surface p-6">
          <p class="text-sm font-medium text-slate-400">Sale revenue</p>
          <p class="mt-2 font-heading text-2xl font-semibold text-electric-cyan">
            {{ soldRevenue() }}
          </p>
          <p class="mt-1 text-xs text-slate-500">Sum of line totals</p>
        </article>
      }
    </section>

    <div class="mt-6 flex flex-wrap items-center gap-3">
      <label class="relative flex min-w-0 flex-1 items-center">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          class="pointer-events-none absolute left-3 h-4 w-4 text-slate-500"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.4-3.4" />
        </svg>
        <input
          type="search"
          placeholder="Search by product, customer or order #…"
          [value]="query()"
          (input)="onQuery($event)"
          class="w-full rounded-xl border border-white/10 bg-surface py-2.5 pl-10 pr-10 text-sm text-white outline-none placeholder:text-slate-500 focus:border-electric-cyan"
        />
        @if (query() !== '') {
          <button
            type="button"
            (click)="clearQuery()"
            aria-label="Clear search"
            class="absolute right-2 rounded-lg p-1 text-slate-400 transition-colors hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        }
      </label>
      <span class="text-sm text-slate-500">{{ resultLabel() }}</span>
    </div>

    @if (tab() === 'reserved') {
      <section class="mt-4 overflow-hidden rounded-xl bg-surface" role="tabpanel">
        <div class="max-h-[70vh] overflow-y-auto">
          <table class="w-full text-left text-sm">
            <thead
              class="sticky top-0 z-10 border-b border-white/5 bg-surface text-xs uppercase tracking-wide text-slate-500"
            >
              <tr>
                <th scope="col" class="px-6 py-3 font-medium">Product</th>
                <th scope="col" class="px-6 py-3 font-medium">Customer</th>
                <th scope="col" class="px-6 py-3 text-center font-medium">Reserved Qty</th>
                <th scope="col" class="px-6 py-3 text-right font-medium">Reserved On</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              @for (line of filteredLines(); track line.order_id + '-' + line.product_id) {
                <tr class="transition-colors hover:bg-deep-slate/60">
                  <td class="px-6 py-4">
                    <p class="font-medium text-white">{{ line.product_name ?? 'Unknown product' }}</p>
                    <p class="mt-0.5 text-xs text-slate-500">Order #{{ line.order_id }}</p>
                  </td>
                  <td class="px-6 py-4 text-slate-300">
                    {{ line.customer_name ?? 'Unknown customer' }}
                  </td>
                  <td class="px-6 py-4 text-center font-medium text-amber-300">
                    {{ line.quantity }}
                  </td>
                  <td class="px-6 py-4 text-right text-slate-400">
                    {{ date(line.ordered_at) }}
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="px-6 py-10 text-center text-slate-500">
                    {{ emptyLabel() }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    } @else {
      <section class="mt-4 overflow-hidden rounded-xl bg-surface" role="tabpanel">
        <div class="max-h-[70vh] overflow-y-auto">
          <table class="w-full text-left text-sm">
            <thead
              class="sticky top-0 z-10 border-b border-white/5 bg-surface text-xs uppercase tracking-wide text-slate-500"
            >
              <tr>
                <th scope="col" class="px-6 py-3 font-medium">Product</th>
                <th scope="col" class="px-6 py-3 font-medium">Customer</th>
                <th scope="col" class="px-6 py-3 text-center font-medium">Qty Sold</th>
                <th scope="col" class="px-6 py-3 text-right font-medium">Sale Price</th>
                <th scope="col" class="px-6 py-3 text-right font-medium">Total</th>
                <th scope="col" class="px-6 py-3 text-right font-medium">Sold On</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              @for (line of filteredLines(); track line.order_id + '-' + line.product_id) {
                <tr class="transition-colors hover:bg-deep-slate/60">
                  <td class="px-6 py-4">
                    <p class="font-medium text-white">{{ line.product_name ?? 'Unknown product' }}</p>
                    <p class="mt-0.5 text-xs text-slate-500">Order #{{ line.order_id }}</p>
                  </td>
                  <td class="px-6 py-4 text-slate-300">
                    {{ line.customer_name ?? 'Unknown customer' }}
                  </td>
                  <td class="px-6 py-4 text-center font-medium text-white">{{ line.quantity }}</td>
                  <td class="px-6 py-4 text-right text-slate-300">{{ money(line.price) }}</td>
                  <td class="px-6 py-4 text-right font-medium text-electric-cyan">
                    {{ money(line.line_total) }}
                  </td>
                  <td class="px-6 py-4 text-right text-slate-400">{{ date(line.ordered_at) }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="px-6 py-10 text-center text-slate-500">
                    {{ emptyLabel() }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    }
  `,
})
export default class SalesPage {
  private readonly orders = inject(OrdersService);

  protected readonly tab = signal<Tab>('reserved');

  protected readonly reservedLines = signal<OrderLine[] | null>(null);
  protected readonly soldLines = signal<OrderLine[] | null>(null);

  protected readonly loadingReserved = signal(false);
  protected readonly loadingSold = signal(false);

  protected readonly errorReserved = signal<string | null>(null);
  protected readonly errorSold = signal<string | null>(null);

  protected readonly query = signal('');

  protected readonly reservedCount = computed(() => this.reservedLines()?.length ?? null);
  protected readonly soldCount = computed(() => this.soldLines()?.length ?? null);

  protected readonly activeLoading = computed(() =>
    this.tab() === 'reserved' ? this.loadingReserved() : this.loadingSold()
  );

  protected readonly activeError = computed(() =>
    this.tab() === 'reserved' ? this.errorReserved() : this.errorSold()
  );

  protected readonly activeLines = computed<OrderLine[]>(() =>
    this.tab() === 'reserved' ? this.reservedLines() ?? [] : this.soldLines() ?? []
  );

  protected readonly filteredLines = computed(() => {
    const needle = this.query().trim().toLowerCase();

    if (needle === '') {
      return this.activeLines();
    }

    return this.activeLines().filter(
      (line) =>
        (line.product_name ?? '').toLowerCase().includes(needle) ||
        (line.customer_name ?? '').toLowerCase().includes(needle) ||
        String(line.order_id).includes(needle)
    );
  });

  protected readonly reservedUnits = computed(() =>
    (this.reservedLines() ?? []).reduce((sum, line) => sum + line.quantity, 0)
  );

  protected readonly reservedCustomers = computed(() => {
    const names = new Set(
      (this.reservedLines() ?? []).map((line) => line.customer_name ?? 'Unknown')
    );

    return names.size;
  });

  protected readonly soldUnits = computed(() =>
    (this.soldLines() ?? []).reduce((sum, line) => sum + line.quantity, 0)
  );

  protected readonly soldRevenue = computed(() => {
    const total = (this.soldLines() ?? []).reduce((sum, line) => sum + Number(line.line_total), 0);

    return formatCurrency(total.toFixed(2));
  });

  constructor() {
    afterNextRender(() => {
      this.loadReserved();
      this.loadSold();
    });
  }

  protected selectTab(tab: Tab): void {
    this.tab.set(tab);

    if (tab === 'reserved') {
      this.loadReserved();
    } else {
      this.loadSold();
    }
  }

  protected reload(force = false): void {
    if (this.tab() === 'reserved') {
      this.loadReserved(force);
    } else {
      this.loadSold(force);
    }
  }

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected clearQuery(): void {
    this.query.set('');
  }

  protected resultLabel(): string {
    const needle = this.query().trim();

    if (needle === '') {
      const count = this.activeLines().length;

      return `${count} ${this.tab() === 'reserved' ? 'reservation' : 'sale'}${count === 1 ? '' : 's'}`;
    }

    const count = this.filteredLines().length;

    return `${count} match${count === 1 ? '' : 'es'} for "${needle}"`;
  }

  protected emptyLabel(): string {
    if (this.activeLines().length === 0 && this.activeLoading()) {
      return this.tab() === 'reserved'
        ? 'Loading reservations…'
        : 'Loading sales…';
    }

    if (this.query().trim() !== '') {
      return 'No entries match your search.';
    }

    return this.tab() === 'reserved'
      ? 'No active reservations.'
      : 'No sales recorded yet.';
  }

  protected tabClass(tab: Tab): string {
    return this.tab() === tab
      ? 'rounded-xl bg-electric-cyan px-4 py-2 text-sm font-medium text-deep-slate transition-colors'
      : 'rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-surface hover:text-white';
  }

  protected money(value: string): string {
    return formatCurrency(value);
  }

  protected formatNumber(value: number): string {
    return formatNumber(value);
  }

  protected date(value: string | null): string {
    return formatDate(value);
  }

  protected loadReserved(force = false): void {
    if (this.loadingReserved() || (!force && this.reservedLines() !== null)) {
      return;
    }

    this.loadingReserved.set(true);
    this.errorReserved.set(null);

    this.orders.reserved(force).subscribe({
      next: ({ reserved }) => {
        this.reservedLines.set(reserved);
        this.loadingReserved.set(false);
      },
      error: (error: unknown) => {
        this.loadingReserved.set(false);
        this.errorReserved.set(this.messageFor(error, 'Unable to load reservations right now.'));
      },
    });
  }

  protected loadSold(force = false): void {
    if (this.loadingSold() || (!force && this.soldLines() !== null)) {
      return;
    }

    this.loadingSold.set(true);
    this.errorSold.set(null);

    this.orders.sold(force).subscribe({
      next: ({ sold }) => {
        this.soldLines.set(sold);
        this.loadingSold.set(false);
      },
      error: (error: unknown) => {
        this.loadingSold.set(false);
        this.errorSold.set(this.messageFor(error, 'Unable to load sales right now.'));
      },
    });
  }

  private messageFor(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        return 'Your session expired. Please sign in again.';
      }

      if (error.status === 0) {
        return 'Cannot reach the server. Please try again.';
      }
    }

    return fallback;
  }
}