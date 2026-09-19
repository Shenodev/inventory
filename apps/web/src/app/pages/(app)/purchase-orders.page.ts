import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouteMeta } from '@analogjs/router';

import { formatCurrency, formatDate, formatNumber } from '../../core/format';
import { Product, ProductsService } from '../../core/products/products.service';
import {
  PurchaseOrder,
  PurchaseOrderListItem,
  PurchaseOrdersService,
  PurchaseOrderStatus,
} from '../../core/procurement/purchase-orders.service';
import { SuppliersService, Supplier } from '../../core/procurement/suppliers.service';

export const routeMeta: RouteMeta = {
  title: 'Purchase Orders · ShenoInventory',
};

type Tab = 'all' | PurchaseOrderStatus;

const QUANTITY_PATTERN = /^\d+(\.\d{1,2})?$/;

@Component({
  selector: 'app-purchase-orders-page',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-heading text-2xl font-semibold text-white">Purchase Orders</h1>
        <p class="mt-1 text-sm text-slate-400">
          Order stock from suppliers, track costs, and receive shipments.
        </p>
      </div>
      <div class="flex gap-3">
        <button
          type="button"
          (click)="load(true)"
          [disabled]="loading()"
          class="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-surface hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ loading() ? 'Refreshing…' : 'Refresh' }}
        </button>
        <button
          type="button"
          (click)="openCreate()"
          class="rounded-xl bg-electric-cyan px-4 py-2 text-sm font-medium text-deep-slate transition-colors hover:bg-cyan-400"
        >
          New purchase order
        </button>
      </div>
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
          (click)="load(true)"
          class="shrink-0 rounded-xl bg-red-500/90 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
        >
          Retry
        </button>
      </div>
    }

    <section class="mt-6 grid gap-6 sm:grid-cols-3">
      <article class="rounded-xl bg-surface p-6">
        <p class="text-sm font-medium text-slate-400">Purchase orders</p>
        <p class="mt-2 font-heading text-2xl font-semibold text-white">
          {{ formatNumber(purchaseOrders().length) }}
        </p>
        <p class="mt-1 text-xs text-slate-500">All time</p>
      </article>
      <article class="rounded-xl bg-surface p-6">
        <p class="text-sm font-medium text-slate-400">Pending value</p>
        <p class="mt-2 font-heading text-2xl font-semibold text-amber-300">
          {{ formatCurrency(pendingValue()) }}
        </p>
        <p class="mt-1 text-xs text-slate-500">Awaiting shipment</p>
      </article>
      <article class="rounded-xl bg-surface p-6">
        <p class="text-sm font-medium text-slate-400">Received value</p>
        <p class="mt-2 font-heading text-2xl font-semibold text-emerald-300">
          {{ formatCurrency(receivedValue()) }}
        </p>
        <p class="mt-1 text-xs text-slate-500">Received and expensed</p>
      </article>
    </section>

    <div class="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Purchase order views">
      <button
        type="button"
        role="tab"
        [attr.aria-selected]="tab() === 'all'"
        (click)="selectTab('all')"
        [class]="tabClass('all')"
      >
        All
        @if (purchaseOrders().length > 0) {
          <span class="ml-1 text-xs opacity-70">({{ purchaseOrders().length }})</span>
        }
      </button>
      <button
        type="button"
        role="tab"
        [attr.aria-selected]="tab() === 'pending'"
        (click)="selectTab('pending')"
        [class]="tabClass('pending')"
      >
        Pending
        @if (pendingCount() !== null) {
          <span class="ml-1 text-xs opacity-70">({{ pendingCount() }})</span>
        }
      </button>
      <button
        type="button"
        role="tab"
        [attr.aria-selected]="tab() === 'received'"
        (click)="selectTab('received')"
        [class]="tabClass('received')"
      >
        Received
        @if (receivedCount() !== null) {
          <span class="ml-1 text-xs opacity-70">({{ receivedCount() }})</span>
        }
      </button>
    </div>

    <div class="mt-4 grid gap-6 lg:grid-cols-2">
      <section class="overflow-hidden rounded-xl bg-surface">
        <div class="border-b border-white/5 px-5 py-4">
          <h2 class="font-heading text-base font-semibold text-white">Purchase orders</h2>
          <p class="mt-0.5 text-xs text-slate-500">Select an order to inspect it.</p>
        </div>
        <div class="max-h-[70vh] overflow-y-auto">
          @if (visibleOrders().length === 0) {
            <p class="px-6 py-10 text-center text-sm text-slate-500">
              {{ emptyLabel() }}
            </p>
          } @else {
            <table class="w-full text-left text-sm">
              <thead
                class="sticky top-0 z-10 border-b border-white/5 bg-surface text-xs uppercase tracking-wide text-slate-500"
              >
                <tr>
                  <th scope="col" class="px-5 py-3 font-medium">Order</th>
                  <th scope="col" class="px-5 py-3 font-medium">Supplier</th>
                  <th scope="col" class="px-5 py-3 text-right font-medium">Total</th>
                  <th scope="col" class="px-5 py-3 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">
                @for (order of visibleOrders(); track order.id) {
                  <tr
                    class="cursor-pointer transition-colors"
                    [class]="selectedId() === order.id ? 'bg-deep-slate' : 'hover:bg-deep-slate/40'"
                    (click)="selectPurchaseOrder(order.id)"
                  >
                    <td class="px-5 py-4">
                      <p class="font-medium text-white">#{{ order.id }}</p>
                      <p class="mt-0.5 text-xs text-slate-500">
                        {{ order.item_count }} item{{ order.item_count === 1 ? '' : 's' }} · {{ formatDate(order.created_at) }}
                      </p>
                    </td>
                    <td class="px-5 py-4 text-slate-300">{{ order.supplier ?? '—' }}</td>
                    <td class="px-5 py-4 text-right font-medium text-white">
                      {{ formatCurrency(order.total_cost) }}
                    </td>
                    <td class="px-5 py-4 text-center">
                      <span class="inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium" [class]="statusBadge(order.status)">
                        {{ order.status }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      </section>

      <section class="rounded-xl bg-surface p-6">
        @if (selectedId() === null) {
          <div class="flex h-full min-h-56 flex-col items-center justify-center text-center">
            <p class="font-heading text-lg font-semibold text-white">No order selected</p>
            <p class="mt-2 max-w-xs text-sm text-slate-400">
              Pick a purchase order on the left to review its lines, add items, or receive the
              shipment.
            </p>
            <button
              type="button"
              (click)="openCreate()"
              class="mt-5 rounded-xl bg-electric-cyan px-4 py-2 text-sm font-medium text-deep-slate transition-colors hover:bg-cyan-400"
            >
              New purchase order
            </button>
          </div>
        } @else if (detailLoading()) {
          <div class="flex h-full min-h-56 items-center justify-center text-sm text-slate-500">
            Loading order…
          </div>
        } @else if (detail(); as order) {
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 class="font-heading text-xl font-semibold text-white">Purchase order #{{ order.id }}</h2>
              <p class="mt-1 text-sm text-slate-400">{{ order.supplier ?? 'Unknown supplier' }}</p>
            </div>
            <span class="inline-block rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide" [class]="statusBadge(order.status)">
              {{ order.status }}
            </span>
          </div>

          @if (detailError(); as message) {
            <div
              class="mt-4 flex items-center justify-between gap-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3"
            >
              <p class="text-sm text-red-200">{{ message }}</p>
              <button
                type="button"
                (click)="selectPurchaseOrder(order.id)"
                class="shrink-0 rounded-xl bg-red-500/90 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-500"
              >
                Retry
              </button>
            </div>
          }

          <div class="mt-5 overflow-hidden rounded-xl border border-white/10">
            <div class="max-h-64 overflow-y-auto">
              <table class="w-full text-left text-sm">
                <thead class="sticky top-0 z-10 border-b border-white/5 bg-deep-slate text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" class="px-4 py-2.5 font-medium">Product</th>
                    <th scope="col" class="px-4 py-2.5 text-center font-medium">Qty</th>
                    <th scope="col" class="px-4 py-2.5 text-right font-medium">Unit cost</th>
                    <th scope="col" class="px-4 py-2.5 text-right font-medium">Line total</th>
                    @if (order.status === 'pending') {
                      <th scope="col" class="px-4 py-2.5"></th>
                    }
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5">
                  @for (item of order.items; track item.id) {
                    <tr class="transition-colors hover:bg-deep-slate/40">
                      <td class="px-4 py-3">
                        <p class="font-medium text-white">{{ item.product_name ?? 'Product #' + item.product_id }}</p>
                        <p class="mt-0.5 text-xs text-slate-500">
                          <span class="font-mono">{{ item.product_sku }}</span>
                        </p>
                      </td>
                      <td class="px-4 py-3 text-center text-white">{{ item.quantity }}</td>
                      <td class="px-4 py-3 text-right text-slate-300">{{ formatCurrency(item.unit_cost) }}</td>
                      <td class="px-4 py-3 text-right font-medium text-white">{{ formatCurrency(item.line_total) }}</td>
                      @if (order.status === 'pending') {
                        <td class="px-4 py-3 text-right">
                          <button
                            type="button"
                            (click)="removeItem(item.id, item.product_name)"
                            [disabled]="savingLine()"
                            aria-label="Remove {{ item.product_name }}" 
                            class="rounded-lg border border-white/10 p-1.5 text-slate-400 transition-colors hover:border-red-400/40 hover:text-red-300 disabled:opacity-50"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4">
                              <path d="M6 6l12 12M18 6 6 18" />
                            </svg>
                          </button>
                        </td>
                      }
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5" class="px-4 py-8 text-center text-sm text-slate-500">
                        No items on this order yet.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <div class="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-slate-400">Total cost</p>
              <p class="mt-1 font-heading text-3xl font-semibold text-white">
                {{ formatCurrency(order.total_cost) }}
              </p>
              <p class="mt-1 text-xs text-slate-500">Final {{ order.status === 'pending' ? 'estimate' : 'cost logged' }}.</p>
            </div>

            @if (order.status === 'pending') {
              <button
                type="button"
                (click)="requestReceive(order)"
                [disabled]="order.items.length === 0"
                class="rounded-xl bg-electric-cyan px-5 py-3 text-sm font-semibold text-deep-slate transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Receive Shipment
              </button>
            } @else if (order.transactions.length > 0) {
              <p class="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
                Expensed {{ formatCurrency(order.transactions[0].amount) }} on {{ formatDate(order.updated_at) }}
              </p>
            }
          </div>

          @if (order.status === 'pending') {
            <form
              class="mt-6 border-t border-white/5 pt-5"
              [formGroup]="itemForm"
              (ngSubmit)="addItem()"
            >
              <div class="flex flex-wrap items-end gap-3">
                <label class="min-w-0 flex-1">
                  <span class="block text-sm font-medium text-slate-300">Product</span>
                  <select
                    formControlName="productId"
                    (change)="onProductSelected($event)"
                    class="mt-1 w-full rounded-xl border border-white/10 bg-deep-slate px-3 py-2.5 text-sm text-white outline-none focus:border-electric-cyan"
                    [class]="{ 'border-red-400/50': itemForm.controls.productId.touched && itemForm.controls.productId.invalid }"
                  >
                    <option [ngValue]="null" disabled>Select a product…</option>
                    @for (product of products(); track product.id) {
                      <option [ngValue]="product.id">{{ product.name }} ({{ product.sku }})</option>
                    }
                  </select>
                </label>
                <label class="w-24">
                  <span class="block text-sm font-medium text-slate-300">Qty</span>
                  <input
                    type="number"
                    min="1"
                    formControlName="quantity"
                    class="mt-1 w-full rounded-xl border border-white/10 bg-deep-slate px-3 py-2.5 text-sm text-white outline-none focus:border-electric-cyan"
                  />
                </label>
                <label class="w-32">
                  <span class="block text-sm font-medium text-slate-300">Unit cost</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    formControlName="unitCost"
                    placeholder="0.00"
                    class="mt-1 w-full rounded-xl border border-white/10 bg-deep-slate px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-electric-cyan"
                  />
                </label>
                <button
                  type="submit"
                  [disabled]="savingLine()"
                  class="rounded-xl bg-electric-cyan px-4 py-2.5 text-sm font-medium text-deep-slate transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {{ savingLine() ? 'Adding…' : 'Add item' }}
                </button>
              </div>

              @if (formError(); as message) {
                <p
                  class="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                  role="alert"
                >
                  {{ message }}
                </p>
              }
            </form>
          }
        }
      </section>
    </div>

    @if (createOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-deep-slate/80 px-4 py-8 backdrop-blur-sm"
        (click)="closeCreate()"
      >
        <div
          class="w-full max-w-md rounded-xl border border-white/10 bg-surface p-6 text-left"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-po-title"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 id="create-po-title" class="font-heading text-lg font-semibold text-white">
                New purchase order
              </h2>
              <p class="mt-1 text-sm text-slate-400">
                Create an empty order, then add items to it.
              </p>
            </div>
            <button
              type="button"
              (click)="closeCreate()"
              aria-label="Close dialog"
              class="rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-deep-slate hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <form class="mt-5" [formGroup]="createForm" (ngSubmit)="submitCreate()">
            <label class="block text-sm font-medium text-slate-300" for="po-supplier">
              Supplier
            </label>
            <select
              id="po-supplier"
              formControlName="supplierId"
              class="mt-1 w-full rounded-xl border border-white/10 bg-deep-slate px-3 py-3 text-sm text-white outline-none focus:border-electric-cyan"
            >
              <option [ngValue]="null" disabled>Select a supplier…</option>
              @for (supplier of suppliers(); track supplier.id) {
                <option [ngValue]="supplier.id">{{ supplier.name }}</option>
              }
            </select>

            @if (suppliers().length === 0) {
              <p class="mt-3 text-xs text-slate-500">
                No suppliers yet — add one on the Suppliers page first.
              </p>
            }

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
                (click)="closeCreate()"
                [disabled]="creating()"
                class="flex-1 rounded-xl border border-white/10 px-4 py-3 font-medium text-slate-300 transition-colors hover:bg-deep-slate hover:text-white disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                [disabled]="creating()"
                class="flex-1 rounded-xl bg-electric-cyan px-4 py-3 font-medium text-deep-slate transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {{ creating() ? 'Creating…' : 'Create order' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    @if (receiveTarget(); as order) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-deep-slate/80 px-4 py-8 backdrop-blur-sm"
        (click)="cancelReceive()"
      >
        <div
          class="w-full max-w-md rounded-xl border border-white/10 bg-surface p-6 text-left"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="receive-po-title"
          (click)="$event.stopPropagation()"
        >
          <h2 id="receive-po-title" class="font-heading text-lg font-semibold text-white">
            Receive shipment #{{ order.id }}?
          </h2>
          <p class="mt-2 text-sm text-slate-400">
            This marks the order as received, adds the goods to stock, logs the inbound
            stock movements, and records an
            <span class="font-medium text-white">expense of {{ formatCurrency(order.total_cost) }}</span>.
          </p>
          <p class="mt-2 text-sm text-slate-400">
            This action is permanent and cannot be undone.
          </p>
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
              (click)="cancelReceive()"
              [disabled]="receiving()"
              class="flex-1 rounded-xl border border-white/10 px-4 py-3 font-medium text-slate-300 transition-colors hover:bg-deep-slate hover:text-white disabled:opacity-60"
            >
              Not yet
            </button>
            <button
              type="button"
              (click)="confirmReceive()"
              [disabled]="receiving()"
              class="flex-1 rounded-xl bg-electric-cyan px-4 py-3 font-medium text-deep-slate transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ receiving() ? 'Receiving…' : 'Receive shipment' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export default class PurchaseOrdersPage {
  private readonly purchaseOrdersService = inject(PurchaseOrdersService);
  private readonly suppliersService = inject(SuppliersService);
  private readonly productsService = inject(ProductsService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly purchaseOrders = signal<PurchaseOrderListItem[]>([]);
  protected readonly suppliers = signal<Supplier[]>([]);
  protected readonly products = signal<Product[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);

  protected readonly tab = signal<Tab>('all');

  protected readonly selectedId = signal<number | null>(null);
  protected readonly detail = signal<PurchaseOrder | null>(null);
  protected readonly detailLoading = signal(false);
  protected readonly detailError = signal<string | null>(null);

  protected readonly createOpen = signal(false);
  protected readonly creating = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly savingLine = signal(false);
  protected readonly receiving = signal(false);
  protected readonly receiveTarget = signal<PurchaseOrder | null>(null);

  protected readonly itemForm = this.formBuilder.group({
    productId: this.formBuilder.control<number | null>(null, Validators.required),
    quantity: this.formBuilder.control(1, [Validators.required, Validators.min(1), Validators.max(1000000)]),
    unitCost: this.formBuilder.control('', [
      Validators.required,
      Validators.pattern(QUANTITY_PATTERN),
    ]),
  });

  protected readonly createForm = this.formBuilder.group({
    supplierId: this.formBuilder.control<number | null>(null, Validators.required),
  });

  protected readonly visibleOrders = computed(() => {
    const current = this.tab();

    if (current === 'all') {
      return this.purchaseOrders();
    }

    return this.purchaseOrders().filter((order) => order.status === current);
  });

  protected readonly pendingCount = computed(() =>
    this.purchaseOrders().some((order) => order.status === 'pending')
      ? this.purchaseOrders().filter((order) => order.status === 'pending').length
      : null
  );

  protected readonly receivedCount = computed(() =>
    this.purchaseOrders().some((order) => order.status === 'received')
      ? this.purchaseOrders().filter((order) => order.status === 'received').length
      : null
  );

  protected readonly pendingValue = computed(() =>
    this.purchaseOrders()
      .filter((order) => order.status === 'pending')
      .reduce((sum, order) => sum + Number(order.total_cost), 0)
  );

  protected readonly receivedValue = computed(() =>
    this.purchaseOrders()
      .filter((order) => order.status === 'received')
      .reduce((sum, order) => sum + Number(order.total_cost), 0)
  );

  constructor() {
    afterNextRender(() => this.load());
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.cancelReceive();
    this.closeCreate();
  }

  protected load(force = false): void {
    this.loading.set(true);
    this.error.set(null);

    this.purchaseOrdersService.list(force).subscribe({
      next: ({ purchase_orders }) => {
        this.purchaseOrders.set(purchase_orders);
        if (this.selectedId() !== null) {
          this.selectPurchaseOrder(this.selectedId()!);
        }
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(this.messageFor(error, 'Unable to load purchase orders right now.'));
      },
    });

    this.suppliersService.list().subscribe({
      next: ({ suppliers }) => this.suppliers.set(suppliers),
    });

    this.productsService.list().subscribe({
      next: ({ products }) => this.products.set(products),
    });
  }

  protected selectTab(next: Tab): void {
    this.tab.set(next);
  }

  protected selectPurchaseOrder(id: number): void {
    this.selectedId.set(id);
    this.detailLoading.set(true);
    this.detailError.set(null);
    this.formError.set(null);

    this.purchaseOrdersService.show(id).subscribe({
      next: ({ purchase_order }) => {
        this.detail.set(purchase_order);
        this.detailLoading.set(false);
      },
      error: (error: unknown) => {
        this.detailLoading.set(false);
        this.detail.set(null);
        this.detailError.set(this.messageFor(error, `Unable to load purchase order #${id}.`));
      },
    });
  }

  protected openCreate(): void {
    this.createForm.reset({ supplierId: null });
    this.formError.set(null);
    this.createOpen.set(true);
  }

  protected closeCreate(): void {
    if (this.creating()) {
      return;
    }

    this.createOpen.set(false);
  }

  protected submitCreate(): void {
    if (this.creating() || this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const supplierId = this.createForm.controls.supplierId.value;

    if (supplierId === null) {
      return;
    }

    this.creating.set(true);
    this.formError.set(null);

    this.purchaseOrdersService.store({ supplier_id: supplierId }).subscribe({
      next: ({ purchase_order }) => {
        this.creating.set(false);
        this.createOpen.set(false);
        this.upsertListItem(purchase_order);
        this.selectPurchaseOrder(purchase_order.id);
        this.notice.set(`Purchase order #${purchase_order.id} created for ${purchase_order.supplier}.`);
      },
      error: (error: unknown) => {
        this.creating.set(false);
        this.formError.set(this.messageFor(error, 'Unable to create the purchase order right now.'));
      },
    });
  }

  protected onProductSelected(event: Event): void {
    const productId = Number((event.target as HTMLSelectElement).value);

    const product = this.products().find((item) => item.id === productId);

    if (product !== undefined) {
      this.itemForm.controls.unitCost.setValue(product.price);
    }
  }

  protected addItem(): void {
    const order = this.detail();

    if (order === null || order.status !== 'pending' || this.savingLine()) {
      return;
    }

    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      return;
    }

    const { productId, quantity, unitCost } = this.itemForm.getRawValue();

    if (productId === null) {
      return;
    }

    this.savingLine.set(true);
    this.formError.set(null);

    this.purchaseOrdersService
      .addItem(order.id, {
        product_id: productId,
        quantity,
        unit_cost: unitCost.trim(),
      })
      .subscribe({
        next: ({ purchase_order }) => {
          this.savingLine.set(false);
          this.applyDetail(purchase_order);
          this.notice.set(
            `Added to purchase order #${purchase_order.id}: ${quantity} × ${this.productName(productId)}.`
          );
          this.itemForm.patchValue({ quantity: 1 });
        },
        error: (error: unknown) => {
          this.savingLine.set(false);
          this.formError.set(this.messageFor(error, 'Unable to add the item right now.'));
        },
      });
  }

  protected removeItem(itemId: number, productName: string | null): void {
    const order = this.detail();

    if (order === null || order.status !== 'pending' || this.savingLine()) {
      return;
    }

    this.savingLine.set(true);
    this.formError.set(null);

    this.purchaseOrdersService.removeItem(order.id, itemId).subscribe({
      next: ({ purchase_order }) => {
        this.savingLine.set(false);
        this.applyDetail(purchase_order);
        this.notice.set(
          `Removed ${productName ?? `item #${itemId}`} from purchase order #${order.id}.`
        );
      },
      error: (error: unknown) => {
        this.savingLine.set(false);
        this.formError.set(this.messageFor(error, 'Unable to remove the item right now.'));
      },
    });
  }

  protected requestReceive(order: PurchaseOrder): void {
    this.formError.set(null);
    this.receiveTarget.set(order);
  }

  protected cancelReceive(): void {
    if (this.receiving()) {
      return;
    }

    this.receiveTarget.set(null);
  }

  protected confirmReceive(): void {
    const order = this.receiveTarget();

    if (order === null || this.receiving()) {
      return;
    }

    this.receiving.set(true);
    this.formError.set(null);

    this.purchaseOrdersService.receive(order.id).subscribe({
      next: ({ purchase_order }) => {
        this.receiving.set(false);
        this.receiveTarget.set(null);
        this.applyDetail(purchase_order);
        this.notice.set(`Purchase order #${purchase_order.id} received — stock and expenses updated.`);
      },
      error: (error: unknown) => {
        this.receiving.set(false);
        this.formError.set(this.messageFor(error, 'Unable to receive this purchase order.'));
      },
    });
  }

  protected tabClass(tab: Tab): string {
    const active =
      this.tab() === tab
        ? 'border-electric-cyan/40 bg-electric-cyan/10 text-electric-cyan'
        : 'border-white/10 bg-surface text-slate-400 hover:text-slate-200';

    return `rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${active}`;
  }

  protected statusBadge(status: PurchaseOrderStatus): string {
    return status === 'pending'
      ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
      : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300';
  }

  protected emptyLabel(): string {
    if (this.loading()) {
      return 'Loading purchase orders…';
    }

    if (this.tab() !== 'all') {
      return `No ${this.tab()} purchase orders.`;
    }

    return 'No purchase orders yet. Create one to get started.';
  }

  protected productName(productId: number): string {
    return this.products().find((product) => product.id === productId)?.name ?? `product #${productId}`;
  }

  protected formatCurrency(value: string | number): string {
    return formatCurrency(value);
  }

  protected formatNumber(value: string | number): string {
    return formatNumber(value);
  }

  protected formatDate(value: string | null): string {
    return formatDate(value);
  }

  private upsertListItem(order: PurchaseOrder): void {
    const listItem: PurchaseOrderListItem = {
      id: order.id,
      supplier_id: order.supplier_id,
      supplier: order.supplier,
      status: order.status,
      total_cost: order.total_cost,
      item_count: order.item_count,
      created_at: order.created_at,
      updated_at: order.updated_at,
    };

    this.purchaseOrders.update((list) => [listItem, ...list.filter((item) => item.id !== order.id)]);
  }

  private applyDetail(order: PurchaseOrder): void {
    this.detail.set(order);
    this.upsertListItem(order);
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