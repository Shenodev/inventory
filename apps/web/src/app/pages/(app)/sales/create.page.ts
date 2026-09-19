import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RouteMeta } from '@analogjs/router';

import { formatCurrency } from '../../../core/format';
import { Product, ProductsService } from '../../../core/products/products.service';
import { Customer, CustomersService } from '../../../core/sales/customers.service';
import { SalesOrdersService } from '../../../core/sales/sales-orders.service';
import { ToastService } from '../../../core/ui/toast.service';

export const routeMeta: RouteMeta = {
  title: 'New Sales Order · ShenoInventory',
};

const MAX_RESULTS = 8;

interface CartLine {
  productId: number;
  sku: string;
  name: string;
  available: number;
  quantity: number;
  unitPrice: string;
}

@Component({
  selector: 'app-sales-create-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-heading text-2xl font-semibold text-white">New Sales Order</h1>
        <p class="mt-1 text-sm text-slate-400">
          Pick a customer, add products to the cart, then reserve.
        </p>
      </div>
      <a
        routerLink="/sales"
        class="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-surface hover:text-white"
      >
        ← Back to orders
      </a>
    </header>

    @if (error(); as message) {
      <div
        class="mt-6 flex items-center justify-between gap-4 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4"
      >
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

    <div class="mt-6 grid gap-6 lg:grid-cols-5">
      <section class="lg:col-span-2">
        <article class="rounded-xl bg-surface p-6">
          <h2 class="font-heading text-base font-semibold text-white">Customer</h2>
          <label class="mt-4 block text-sm font-medium text-slate-300" for="pos-customer">
            Who is buying?
          </label>
          <select
            id="pos-customer"
            [value]="customerId() ?? ''"
            (change)="onCustomerChange($event)"
            class="mt-1 w-full rounded-xl border border-white/10 bg-deep-slate px-3 py-3 text-sm text-white outline-none focus:border-electric-cyan"
          >
            <option value="" disabled>Select a customer…</option>
            @for (customer of customers(); track customer.id) {
              <option [value]="customer.id">{{ customer.name }}</option>
            }
          </select>
          @if (customers().length === 0) {
            <p class="mt-3 text-xs text-slate-500">
              No customers yet — add one on the Customers page first.
            </p>
          }
        </article>

        <article class="mt-6 rounded-xl bg-surface p-6">
          <h2 class="font-heading text-base font-semibold text-white">Products</h2>
          <label class="relative mt-4 flex items-center">
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
              placeholder="Search name or SKU…"
              [value]="query()"
              (input)="onQuery($event)"
              class="w-full rounded-xl border border-white/10 bg-deep-slate py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-electric-cyan"
            />
          </label>

          @if (query().trim() === '') {
            <p class="mt-5 text-center text-sm text-slate-500">Type to search your catalog.</p>
          } @else if (searchResults().length === 0) {
            <p class="mt-5 text-center text-sm text-slate-500">No products match your search.</p>
          } @else {
            <ul class="mt-4 divide-y divide-white/5">
              @for (product of searchResults(); track product.id) {
                <li class="flex items-center gap-3 py-3">
                  <div class="min-w-0 flex-1">
                    <p class="truncate font-medium text-white">{{ product.name }}</p>
                    <p class="mt-0.5 text-xs text-slate-500">
                      <span class="font-mono">{{ product.sku }}</span> · {{ formatCurrency(product.price) }}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="text-xs font-medium" [class]="product.available_stock > 0 ? 'text-emerald-300' : 'text-red-300'">
                      {{ product.available_stock }} left
                    </p>
                    <button
                      type="button"
                      (click)="addProduct(product)"
                      [disabled]="product.available_stock <= 0"
                      class="mt-1 rounded-lg border border-electric-cyan/40 px-3 py-1 text-xs font-semibold text-electric-cyan transition-colors hover:bg-electric-cyan/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Add
                    </button>
                  </div>
                </li>
              }
            </ul>
          }
        </article>
      </section>

      <section class="lg:col-span-3">
        <article class="rounded-xl bg-surface p-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="font-heading text-base font-semibold text-white">Cart</h2>
              <p class="mt-0.5 text-xs text-slate-500">
                {{ cart().length }} line{{ cart().length === 1 ? '' : 's' }}
                @if (selectedCustomer(); as customer) {
                  · for {{ customer.name }}
                }
              </p>
            </div>
            <button
              type="button"
              (click)="clearCart()"
              [disabled]="cart().length === 0"
              class="rounded-xl border border-white/10 px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:border-red-400/40 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear cart
            </button>
          </div>

          <div class="mt-5 overflow-hidden rounded-xl border border-white/10">
            <div class="max-h-80 overflow-y-auto">
              <table class="w-full text-left text-sm">
                <thead class="sticky top-0 z-10 border-b border-white/5 bg-deep-slate text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" class="px-4 py-2.5 font-medium">Product</th>
                    <th scope="col" class="px-4 py-2.5 text-center font-medium">Qty</th>
                    <th scope="col" class="px-4 py-2.5 text-right font-medium">Unit price</th>
                    <th scope="col" class="px-4 py-2.5 text-right font-medium">Line total</th>
                    <th scope="col" class="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5">
                  @for (line of cart(); track line.productId) {
                    <tr class="transition-colors hover:bg-deep-slate/40">
                      <td class="px-4 py-3">
                        <p class="font-medium text-white">{{ line.name }}</p>
                        <p class="mt-0.5 text-xs text-slate-500">
                          <span class="font-mono">{{ line.sku }}</span> · {{ line.available }} in stock
                        </p>
                      </td>
                      <td class="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="1"
                          [value]="line.quantity"
                          (change)="onQuantityChange(line.productId, $event)"
                          aria-label="Quantity for {{ line.name }}"
                          class="w-20 rounded-lg border border-white/10 bg-deep-slate px-2 py-1.5 text-center text-sm text-white outline-none focus:border-electric-cyan"
                        />
                      </td>
                      <td class="px-4 py-3 text-right">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          [value]="line.unitPrice"
                          (change)="onUnitPriceChange(line.productId, $event)"
                          aria-label="Unit price for {{ line.name }}"
                          class="w-28 rounded-lg border border-white/10 bg-deep-slate px-2 py-1.5 text-right text-sm text-white outline-none focus:border-electric-cyan"
                        />
                      </td>
                      <td class="px-4 py-3 text-right font-medium text-electric-cyan">
                        {{ formatCurrency(lineTotal(line)) }}
                      </td>
                      <td class="px-4 py-3 text-right">
                        <button
                          type="button"
                          (click)="removeLine(line.productId)"
                          aria-label="Remove {{ line.name }}"
                          class="rounded-lg border border-white/10 p-1.5 text-slate-400 transition-colors hover:border-red-400/40 hover:text-red-300"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4">
                            <path d="M6 6l12 12M18 6 6 18" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5" class="px-4 py-12 text-center text-sm text-slate-500">
                        The cart is empty — search for products to add them.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <div class="mt-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-slate-400">Order total</p>
              <p class="mt-1 font-heading text-3xl font-semibold text-white">{{ formatCurrency(cartTotal()) }}</p>
              <p class="mt-1 text-xs text-slate-500">
                {{ cart().length === 0 ? 'Nothing reserved yet.' : 'Reserved against stock until fulfilled.' }}
              </p>
            </div>
            <button
              type="button"
              (click)="reserve()"
              [disabled]="!canReserve()"
              class="rounded-xl bg-electric-cyan px-6 py-3 text-sm font-semibold text-deep-slate transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {{ saving() ? 'Reserving…' : 'Reserve' }}
            </button>
          </div>

          @if (!canReserve() && cart().length > 0 && customerId() === null && !saving()) {
            <p class="mt-3 text-sm text-amber-300">Select a customer before reserving.</p>
          }
        </article>
      </section>
    </div>
  `,
})
export default class SalesCreatePage {
  private readonly customersService = inject(CustomersService);
  private readonly productsService = inject(ProductsService);
  private readonly salesOrdersService = inject(SalesOrdersService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  protected readonly customers = signal<Customer[]>([]);
  protected readonly products = signal<Product[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly customerId = signal<number | null>(null);
  protected readonly query = signal('');
  protected readonly cart = signal<CartLine[]>([]);
  protected readonly saving = signal(false);

  protected readonly selectedCustomer = computed(() =>
    this.customerId() === null ? null : (this.customers().find((c) => c.id === this.customerId()) ?? null)
  );

  protected readonly searchResults = computed(() => {
    const needle = this.query().trim().toLowerCase();

    if (needle === '') {
      return [];
    }

    return this.products()
      .filter(
        (product) =>
          product.name.toLowerCase().includes(needle) || product.sku.toLowerCase().includes(needle)
      )
      .slice(0, MAX_RESULTS);
  });

  protected readonly cartTotal = computed(() => {
    const total = this.cart().reduce(
      (sum, line) => sum + Number(line.unitPrice || 0) * line.quantity,
      0
    );

    return total.toFixed(2);
  });

  protected readonly canReserve = computed(
    () => this.customerId() !== null && this.cart().length > 0 && !this.saving()
  );

  constructor() {
    afterNextRender(() => this.load());
  }

  protected load(force = false): void {
    this.loading.set(true);
    this.error.set(null);

    this.customersService.list().subscribe({
      next: ({ customers }) => this.customers.set(customers),
    });

    this.productsService.list(force).subscribe({
      next: ({ products }) => {
        this.products.set(products);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(this.messageFor(error, 'Unable to load your catalog right now.'));
      },
    });

    const preset = Number(this.route.snapshot.queryParamMap.get('customer'));

    if (Number.isInteger(preset) && preset > 0) {
      this.customerId.set(preset);
    }
  }

  protected onCustomerChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);

    this.customerId.set(Number.isNaN(value) ? null : value);
  }

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected addProduct(product: Product): void {
    this.cart.update((cart) => {
      const index = cart.findIndex((line) => line.productId === product.id);

      if (index === -1) {
        return [
          ...cart,
          {
            productId: product.id,
            sku: product.sku,
            name: product.name,
            available: product.available_stock,
            quantity: 1,
            unitPrice: product.price,
          },
        ];
      }

      const copy = [...cart];
      copy[index] = { ...copy[index], quantity: copy[index].quantity + 1 };
      return copy;
    });
  }

  protected onQuantityChange(productId: number, event: Event): void {
    const value = Math.max(1, Math.trunc(Number((event.target as HTMLInputElement).value) || 1));

    this.cart.update((cart) =>
      cart.map((line) => (line.productId === productId ? { ...line, quantity: value } : line))
    );
  }

  protected onUnitPriceChange(productId: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;

    this.cart.update((cart) =>
      cart.map((line) =>
        line.productId === productId ? { ...line, unitPrice: value.trim() } : line
      )
    );
  }

  protected removeLine(productId: number): void {
    this.cart.update((cart) => cart.filter((line) => line.productId !== productId));
  }

  protected clearCart(): void {
    this.cart.set([]);
  }

  protected lineTotal(line: CartLine): string {
    return (Number(line.unitPrice || 0) * line.quantity).toFixed(2);
  }

  protected reserve(): void {
    const customerId = this.customerId();

    if (this.saving() || customerId === null || this.cart().length === 0) {
      return;
    }

    this.saving.set(true);

    this.salesOrdersService
      .store({
        customer_id: customerId,
        items: this.cart().map((line) => ({
          product_id: line.productId,
          quantity: line.quantity,
          unit_price: line.unitPrice.trim() || '0',
        })),
      })
      .subscribe({
        next: ({ sales_order, message }) => {
          this.saving.set(false);
          this.cart.set([]);
          this.query.set('');
          this.toast.show(`Sales order #${sales_order.id} reserved for ${sales_order.customer}.`);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.toast.show(this.messageFor(error, 'Unable to reserve this order right now.'), 'error');
        },
      });
  }

  protected formatCurrency(value: string): string {
    return formatCurrency(value);
  }

  private messageFor(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 409 || error.status === 422) {
        const body = error.error as { message?: string; errors?: Record<string, string[]> } | null;
        const first = body?.errors ? Object.values(body.errors)[0]?.[0] : undefined;
        return first ?? body?.message ?? fallback;
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