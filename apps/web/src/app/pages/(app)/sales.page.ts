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

import { formatCurrency, formatDate } from '../../core/format';
import { OrderLine, OrdersService } from '../../core/orders/orders.service';

export const routeMeta: RouteMeta = {
  title: 'Sales & Reservations · ShenoInventory',
};

type Tab = 'reserved' | 'sold';

@Component({
  selector: 'app-sales-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header>
      <h1 class="font-heading text-2xl font-semibold text-white">Sales &amp; Reservations</h1>
      <p class="mt-1 text-sm text-slate-400">
        Exactly who reserved or bought what, and how much.
      </p>
    </header>

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

    @if (activeError(); as message) {
      <div
        class="mt-6 flex items-center justify-between gap-4 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4"
      >
        <p class="text-sm text-red-200">{{ message }}</p>
        <button
          type="button"
          (click)="reload()"
          class="shrink-0 rounded-xl bg-red-500/90 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
        >
          Retry
        </button>
      </div>
    }

    @if (tab() === 'reserved') {
      <section class="mt-6 overflow-hidden rounded-xl bg-surface" role="tabpanel">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-white/5 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" class="px-6 py-3 font-medium">Product</th>
                <th scope="col" class="px-6 py-3 font-medium">Customer</th>
                <th scope="col" class="px-6 py-3 text-center font-medium">Reserved Qty</th>
                <th scope="col" class="px-6 py-3 text-right font-medium">Reserved On</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              @for (line of reservedLines() ?? []; track line.order_id + '-' + line.product_id) {
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
                    {{ activeLoading() ? 'Loading reservations…' : 'No active reservations.' }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    } @else {
      <section class="mt-6 overflow-hidden rounded-xl bg-surface" role="tabpanel">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-white/5 text-xs uppercase tracking-wide text-slate-500">
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
              @for (line of soldLines() ?? []; track line.order_id + '-' + line.product_id) {
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
                    {{ activeLoading() ? 'Loading sales…' : 'No sales recorded yet.' }}
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

  protected readonly reservedCount = computed(() => this.reservedLines()?.length ?? null);
  protected readonly soldCount = computed(() => this.soldLines()?.length ?? null);

  protected readonly activeLoading = computed(() =>
    this.tab() === 'reserved' ? this.loadingReserved() : this.loadingSold()
  );

  protected readonly activeError = computed(() =>
    this.tab() === 'reserved' ? this.errorReserved() : this.errorSold()
  );

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

  protected reload(): void {
    if (this.tab() === 'reserved') {
      this.loadReserved(true);
    } else {
      this.loadSold(true);
    }
  }

  protected tabClass(tab: Tab): string {
    return this.tab() === tab
      ? 'rounded-xl bg-electric-cyan px-4 py-2 text-sm font-medium text-deep-slate transition-colors'
      : 'rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-surface hover:text-white';
  }

  protected money(value: string): string {
    return formatCurrency(value);
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

    this.orders.reserved().subscribe({
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

    this.orders.sold().subscribe({
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
