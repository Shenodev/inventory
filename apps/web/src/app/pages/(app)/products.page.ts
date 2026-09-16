import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouteMeta } from '@analogjs/router';

import { formatCurrency } from '../../core/format';
import { Product, ProductsService } from '../../core/products/products.service';

export const routeMeta: RouteMeta = {
  title: 'Products · ShenoInventory',
};

@Component({
  selector: 'app-products-page',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-heading text-2xl font-semibold text-white">Products</h1>
        <p class="mt-1 text-sm text-slate-400">
          {{ products().length }} products tracked across the warehouse.
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

    @if (notice(); as message) {
      <div
        class="mt-6 flex items-center justify-between gap-4 rounded-xl border border-electric-cyan/30 bg-electric-cyan/10 px-5 py-4"
        role="status"
      >
        <p class="text-sm text-slate-200">{{ message }}</p>
        <button
          type="button"
          (click)="notice.set(null)"
          class="shrink-0 text-sm font-medium text-electric-cyan transition-colors hover:text-cyan-200"
        >
          Dismiss
        </button>
      </div>
    }

    @if (error(); as message) {
      <div
        class="mt-6 flex items-center justify-between gap-4 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4"
      >
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

    <section class="mt-6 overflow-hidden rounded-xl bg-surface">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-white/5 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" class="px-6 py-3 font-medium">Product</th>
              <th scope="col" class="px-6 py-3 text-center font-medium">Total Stock</th>
              <th scope="col" class="px-6 py-3 text-center font-medium">Reserved</th>
              <th scope="col" class="px-6 py-3 text-center font-medium">Sold</th>
              <th scope="col" class="px-6 py-3 text-center font-medium">Available</th>
              <th scope="col" class="px-6 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            @for (product of products(); track product.id) {
              <tr class="transition-colors hover:bg-deep-slate/60">
                <td class="px-6 py-4">
                  <p class="font-medium text-white">{{ product.name }}</p>
                  <p class="mt-0.5 text-xs text-slate-500">
                    {{ product.sku }} · {{ price(product.price) }}
                  </p>
                </td>
                <td class="px-6 py-4 text-center font-medium text-white">
                  {{ product.total_stock }}
                </td>
                <td class="px-6 py-4 text-center text-amber-300">
                  {{ product.reserved_stock }}
                </td>
                <td class="px-6 py-4 text-center text-slate-300">{{ product.sold_stock }}</td>
                <td class="px-6 py-4 text-center font-medium" [class]="availableClass(product.available_stock)">
                  {{ product.available_stock }}
                </td>
                <td class="px-6 py-4 text-right">
                  <button
                    type="button"
                    (click)="openAdjust(product)"
                    class="rounded-xl border border-white/10 px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:border-electric-cyan/40 hover:text-electric-cyan"
                  >
                    Adjust Stock
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="px-6 py-10 text-center text-slate-500">
                  {{ loading() ? 'Loading products…' : 'No products found.' }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>

    @if (activeProduct(); as product) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-deep-slate/80 px-4 py-8 backdrop-blur-sm"
        (click)="closeAdjust()"
      >
        <div
          class="w-full max-w-md rounded-xl border border-white/10 bg-surface p-6 text-left"
          role="dialog"
          aria-modal="true"
          aria-labelledby="adjust-stock-title"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 id="adjust-stock-title" class="font-heading text-lg font-semibold text-white">
                Adjust stock
              </h2>
              <p class="mt-1 text-sm text-slate-400">{{ product.name }}</p>
            </div>
            <button
              type="button"
              (click)="closeAdjust()"
              aria-label="Close dialog"
              class="rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-deep-slate hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <p class="mt-4 rounded-xl bg-deep-slate px-4 py-3 text-sm text-slate-300">
            Currently <span class="font-medium text-white">{{ product.total_stock }}</span> units in
            stock, <span class="font-medium text-white">{{ product.available_stock }}</span>
            available.
          </p>

          <form class="mt-5" [formGroup]="form" (ngSubmit)="submitAdjust()">
            <span class="block text-sm font-medium text-slate-300">Movement</span>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <label class="cursor-pointer">
                <input type="radio" formControlName="type" value="in" class="peer sr-only" />
                <span
                  class="flex items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition-colors peer-checked:border-electric-cyan peer-checked:bg-electric-cyan peer-checked:text-deep-slate"
                >
                  Add
                </span>
              </label>
              <label class="cursor-pointer">
                <input type="radio" formControlName="type" value="out" class="peer sr-only" />
                <span
                  class="flex items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition-colors peer-checked:border-electric-cyan peer-checked:bg-electric-cyan peer-checked:text-deep-slate"
                >
                  Remove
                </span>
              </label>
            </div>

            <label class="mt-4 block text-sm font-medium text-slate-300" for="quantity">
              Quantity
            </label>
            <input
              id="quantity"
              type="number"
              min="1"
              formControlName="quantity"
              class="mt-1 w-full rounded-xl border border-white/10 bg-deep-slate px-4 py-3 text-white outline-none focus:border-electric-cyan"
            />

            <label class="mt-4 block text-sm font-medium text-slate-300" for="note">
              Note <span class="text-slate-500">(optional)</span>
            </label>
            <input
              id="note"
              type="text"
              formControlName="note"
              placeholder="e.g. Stocktake correction"
              class="mt-1 w-full rounded-xl border border-white/10 bg-deep-slate px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-electric-cyan"
            />

            @if (formError(); as message) {
              <p
                class="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                role="alert"
              >
                {{ message }}
              </p>
            }

            <div class="mt-6 flex gap-3">
              <button
                type="button"
                (click)="closeAdjust()"
                [disabled]="saving()"
                class="flex-1 rounded-xl border border-white/10 px-4 py-3 font-medium text-slate-300 transition-colors hover:bg-deep-slate hover:text-white disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                [disabled]="saving()"
                class="flex-1 rounded-xl bg-electric-cyan px-4 py-3 font-medium text-deep-slate transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {{ saving() ? 'Saving…' : submitLabel() }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export default class ProductsPage {
  private readonly productsService = inject(ProductsService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly products = signal<Product[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);

  protected readonly activeProduct = signal<Product | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.formBuilder.group({
    type: this.formBuilder.control<'in' | 'out'>('in', Validators.required),
    quantity: this.formBuilder.control(1, [Validators.required, Validators.min(1)]),
    note: this.formBuilder.control(''),
  });

  constructor() {
    afterNextRender(() => this.load());
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.activeProduct() !== null) {
      this.closeAdjust();
    }
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.productsService.list().subscribe({
      next: ({ products }) => {
        this.products.set(products);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(this.messageFor(error, 'Unable to load products right now.'));
      },
    });
  }

  protected openAdjust(product: Product): void {
    this.form.reset({ type: 'in', quantity: 1, note: '' });
    this.formError.set(null);
    this.activeProduct.set(product);
  }

  protected closeAdjust(): void {
    if (this.saving()) {
      return;
    }

    this.activeProduct.set(null);
  }

  protected submitAdjust(): void {
    const product = this.activeProduct();

    if (product === null || this.saving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { type, quantity, note } = this.form.getRawValue();
    this.saving.set(true);
    this.formError.set(null);

    this.productsService
      .adjustStock(product.id, { type, quantity, note: note.trim() || null })
      .subscribe({
        next: (response) => {
          this.products.update((list) =>
            list.map((item) => (item.id === response.product.id ? response.product : item))
          );
          this.saving.set(false);
          this.activeProduct.set(null);
          this.notice.set(
            `${response.product.name}: ${type === 'in' ? 'added' : 'removed'} ${quantity} unit(s).`
          );
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.formError.set(this.messageFor(error, 'Unable to update stock right now.'));
        },
      });
  }

  protected submitLabel(): string {
    return this.form.controls.type.value === 'in' ? 'Add stock' : 'Remove stock';
  }

  protected price(value: string): string {
    return formatCurrency(value);
  }

  protected availableClass(available: number): string {
    return available <= 0 ? 'text-red-300' : 'text-electric-cyan';
  }

  private messageFor(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 422) {
        const errors = (error.error as { errors?: Record<string, string[]> } | null)?.errors;
        const first = errors ? Object.values(errors)[0]?.[0] : undefined;
        return first ?? fallback;
      }

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
