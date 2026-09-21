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

import { formatNumber } from '../../core/format';
import { Product, ProductsService } from '../../core/products/products.service';

export const routeMeta: RouteMeta = {
  title: 'Stock · ShenoInventory',
};

const LOW_STOCK_THRESHOLD = 10;

type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';

@Component({
  selector: 'app-stock-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-heading text-2xl font-semibold text-white">Stock</h1>
        <p class="mt-1 text-sm text-slate-400">
          Live inventory levels {{ products().length > 0 ? 'for ' + products().length + ' products' : 'across the catalog' }}.
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
        <p class="text-sm font-medium text-slate-400">Available units</p>
        <p class="mt-2 font-heading text-2xl font-semibold text-electric-cyan">{{ totalAvailable() }}</p>
        <p class="mt-1 text-xs text-slate-500">Ready to sell</p>
      </article>
      <article class="rounded-xl bg-surface p-6">
        <p class="text-sm font-medium text-slate-400">Total units held</p>
        <p class="mt-2 font-heading text-2xl font-semibold text-white">{{ totalHeld() }}</p>
        <p class="mt-1 text-xs text-slate-500">All stock levels</p>
      </article>
      <article class="rounded-xl bg-surface p-6">
        <p class="text-sm font-medium text-slate-400">Low stock</p>
        <p class="mt-2 font-heading text-2xl font-semibold" [class]="lowStockCount() > 0 ? 'text-amber-300' : 'text-white'">
          {{ formatNumber(lowStockCount()) }}
        </p>
        <p class="mt-1 text-xs text-slate-500">At or below each reorder point</p>
      </article>
      <article class="rounded-xl bg-surface p-6">
        <p class="text-sm font-medium text-slate-400">Out of stock</p>
        <p class="mt-2 font-heading text-2xl font-semibold" [class]="outOfStockCount() > 0 ? 'text-red-300' : 'text-white'">
          {{ formatNumber(outOfStockCount()) }}
        </p>
        <p class="mt-1 text-xs text-slate-500">Nothing left to sell</p>
      </article>
    </section>

    <section class="mt-6 overflow-hidden rounded-xl bg-surface">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-y border-white/5 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" class="px-6 py-3 font-medium">Product</th>
              <th scope="col" class="px-6 py-3 text-right font-medium">Total</th>
              <th scope="col" class="px-6 py-3 text-right font-medium">Reserved</th>
              <th scope="col" class="px-6 py-3 text-right font-medium">Sold</th>
              <th scope="col" class="px-6 py-3 text-right font-medium">Available</th>
              <th scope="col" class="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            @for (product of products(); track product.id) {
              <tr class="transition-colors hover:bg-deep-slate/60">
                <td class="px-6 py-4">
                  <p class="font-medium text-white">{{ product.name }}</p>
                  <p class="mt-0.5 text-xs text-slate-500">{{ product.sku }}</p>
                </td>
                <td class="px-6 py-4 text-right text-slate-200">{{ formatNumber(product.total_stock) }}</td>
                <td class="px-6 py-4 text-right text-slate-400">{{ formatNumber(product.reserved_stock) }}</td>
                <td class="px-6 py-4 text-right text-slate-400">{{ formatNumber(product.sold_stock) }}</td>
                <td class="px-6 py-4 text-right font-medium text-white">{{ formatNumber(product.available_stock) }}</td>
                <td class="px-6 py-4">
                  <span
                    class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                    [class]="statusChipClass(statusOf(product))"
                  >
                    {{ statusLabel(statusOf(product)) }}
                  </span>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="px-6 py-10 text-center text-slate-500">
                  {{ loading() ? 'Loading stock levels…' : 'No products in the catalog yet.' }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export default class StockPage {
  private readonly productsService = inject(ProductsService);

  protected readonly products = signal<Product[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly totalAvailable = computed(() =>
    formatNumber(this.products().reduce((sum, product) => sum + product.available_stock, 0))
  );

  protected readonly totalHeld = computed(() =>
    formatNumber(this.products().reduce((sum, product) => sum + product.total_stock, 0))
  );

  protected readonly lowStockCount = computed(
    () => this.products().filter((product) => this.isLow(product)).length
  );

  protected readonly outOfStockCount = computed(
    () => this.products().filter((product) => product.available_stock === 0).length
  );

  constructor() {
    afterNextRender(() => this.load());
  }

  protected load(force = false): void {
    this.loading.set(true);
    this.error.set(null);

    this.productsService.list(force).subscribe({
      next: ({ products }) => {
        this.products.set(products);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(this.messageFor(error));
      },
    });
  }

  protected statusOf(product: Product): StockStatus {
    if (product.available_stock === 0) {
      return 'out-of-stock';
    }

    if (product.available_stock <= this.reorderPoint(product)) {
      return 'low-stock';
    }

    return 'in-stock';
  }

  protected statusLabel(status: StockStatus): string {
    if (status === 'out-of-stock') {
      return 'Out of stock';
    }

    if (status === 'low-stock') {
      return 'Low stock';
    }

    return 'In stock';
  }

  protected statusChipClass(status: StockStatus): string {
    if (status === 'out-of-stock') {
      return 'bg-red-500/10 text-red-300';
    }

    if (status === 'low-stock') {
      return 'bg-amber-400/10 text-amber-300';
    }

    return 'bg-electric-cyan/10 text-electric-cyan';
  }

  private isLow(product: Product): boolean {
    return product.available_stock > 0 && product.available_stock <= this.reorderPoint(product);
  }

  private reorderPoint(product: Product): number {
    return product.min_stock ?? LOW_STOCK_THRESHOLD;
  }

  protected formatNumber(value: number): string {
    return formatNumber(value);
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

    return 'Unable to load stock levels right now.';
  }
}