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
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RouteMeta } from '@analogjs/router';

import { formatCurrency, formatDate, formatNumber } from '../../core/format';
import {
  SalesOrder,
  SalesOrderItem,
  SalesOrderListItem,
  SalesOrdersService,
  SalesOrderStatus,
} from '../../core/sales/sales-orders.service';
import { ToastService } from '../../core/ui/toast.service';

export const routeMeta: RouteMeta = {
  title: 'Sales Orders · ShenoInventory',
};

type Tab = 'all' | SalesOrderStatus;

interface ReturnLineControls {
  included: FormControl<boolean>;
  productId: FormControl<number>;
  quantity: FormControl<number>;
}

const atLeastOneReturn = (form: AbstractControl) => {
  const items = form.get('items') as FormArray | null;
  const included = items?.controls.some((line) => {
    const value = (line as FormGroup).getRawValue();
    return value.included === true && Number(value.quantity) > 0;
  });

  return included === true ? null : { atLeastOneReturn: true };
};

@Component({
  selector: 'app-sales-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-heading text-2xl font-semibold text-white">Active Orders</h1>
        <p class="mt-1 text-sm text-slate-400">
          Reserved and shipped sales orders.
        </p>
      </div>
      <div class="flex gap-3">
        <button
          type="button"
          (click)="reload(true)"
          [disabled]="loading()"
          class="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-surface hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ loading() ? 'Refreshing…' : 'Refresh' }}
        </button>
        <a
          routerLink="/sales/create"
          class="rounded-xl bg-electric-cyan px-4 py-2 text-sm font-medium text-deep-slate transition-colors hover:bg-cyan-400"
        >
          New Sales Order
        </a>
      </div>
    </header>

    @if (error(); as message) {
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

    <section class="mt-6 grid gap-6 sm:grid-cols-3">
      <article class="rounded-xl bg-surface p-6">
        <p class="text-sm font-medium text-slate-400">Active orders</p>
        <p class="mt-2 font-heading text-2xl font-semibold text-white">
          {{ formatNumber(activeOrders().length) }}
        </p>
        <p class="mt-1 text-xs text-slate-500">Reserved or shipped</p>
      </article>
      <article class="rounded-xl bg-surface p-6">
        <p class="text-sm font-medium text-slate-400">Reserved value</p>
        <p class="mt-2 font-heading text-2xl font-semibold text-amber-300">
          {{ formatCurrency(reservedValue()) }}
        </p>
        <p class="mt-1 text-xs text-slate-500">Awaiting fulfillment</p>
      </article>
      <article class="rounded-xl bg-surface p-6">
        <p class="text-sm font-medium text-slate-400">Shipped value</p>
        <p class="mt-2 font-heading text-2xl font-semibold text-emerald-300">
          {{ formatCurrency(shippedValue()) }}
        </p>
        <p class="mt-1 text-xs text-slate-500">Fulfilled and delivered</p>
      </article>
    </section>

    <div class="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Sales order views">
      <button
        type="button"
        role="tab"
        [attr.aria-selected]="tab() === 'all'"
        (click)="selectTab('all')"
        [class]="tabClass('all')"
      >
        All
        @if (orders().length > 0) {
          <span class="ml-1 text-xs opacity-70">({{ orders().length }})</span>
        }
      </button>
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
        [attr.aria-selected]="tab() === 'shipped'"
        (click)="selectTab('shipped')"
        [class]="tabClass('shipped')"
      >
        Shipped
        @if (shippedCount() !== null) {
          <span class="ml-1 text-xs opacity-70">({{ shippedCount() }})</span>
        }
      </button>
    </div>

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
          placeholder="Search by customer or order #…"
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

    <section class="mt-4 overflow-hidden rounded-xl bg-surface">
      <div class="max-h-[70vh] overflow-y-auto">
        <table class="w-full text-left text-sm">
          <thead
            class="sticky top-0 z-10 border-b border-white/5 bg-surface text-xs uppercase tracking-wide text-slate-500"
          >
            <tr>
              <th scope="col" class="px-6 py-3 font-medium">Order</th>
              <th scope="col" class="px-6 py-3 font-medium">Customer</th>
              <th scope="col" class="px-6 py-3 text-center font-medium">Items</th>
              <th scope="col" class="px-6 py-3 text-right font-medium">Total</th>
              <th scope="col" class="px-6 py-3 font-medium">Placed</th>
              <th scope="col" class="px-6 py-3 text-center font-medium">Status</th>
              <th scope="col" class="px-6 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            @for (order of filteredOrders(); track order.id) {
              <tr class="transition-colors hover:bg-deep-slate/60">
                <td class="px-6 py-4">
                  <p class="font-medium text-white">#{{ order.id }}</p>
                  <p class="mt-0.5 text-xs text-slate-500">{{ formatDate(order.created_at) }}</p>
                </td>
                <td class="px-6 py-4 text-slate-300">{{ order.customer ?? '—' }}</td>
                <td class="px-6 py-4 text-center text-slate-300">{{ order.item_count }}</td>
                <td class="px-6 py-4 text-right font-medium text-white">
                  {{ formatCurrency(order.total_price) }}
                </td>
                <td class="px-6 py-4 text-slate-400">{{ formatDate(order.created_at) }}</td>
                <td class="px-6 py-4 text-center">
                  <span
                    class="inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium"
                    [class]="statusBadge(order.status)"
                  >
                    {{ order.status }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="flex justify-end">
                    @if (order.status === 'reserved') {
                      <button
                        type="button"
                        (click)="requestFulfill(order)"
                        [disabled]="fulfilling()"
                        class="rounded-xl bg-electric-cyan px-4 py-1.5 text-sm font-semibold text-deep-slate transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Fulfill &amp; Ship
                      </button>
                    } @else if (order.status === 'shipped') {
                      <button
                        type="button"
                        (click)="requestReturn(order)"
                        [disabled]="returning()"
                        class="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Process Return
                      </button>
                    } @else {
                      <span class="text-sm text-slate-500">—</span>
                    }
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="px-6 py-10 text-center text-slate-500">
                  {{ emptyLabel() }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>

    @if (fulfillTarget(); as order) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-deep-slate/80 px-4 py-8 backdrop-blur-sm"
        (click)="cancelFulfill()"
      >
        <div
          class="w-full max-w-md rounded-xl border border-white/10 bg-surface p-6 text-left"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="fulfill-so-title"
          (click)="$event.stopPropagation()"
        >
          <h2 id="fulfill-so-title" class="font-heading text-lg font-semibold text-white">
            Fulfill and ship order #{{ order.id }}?
          </h2>
          <p class="mt-2 text-sm text-slate-400">
            This deducts the reserved quantities from stock, logs the outbound stock movements, and
            records an
            <span class="font-medium text-white">income of {{ formatCurrency(order.total_price) }}</span>
            for {{ order.customer ?? 'the customer' }}.
          </p>
          <p class="mt-2 text-sm text-slate-400">
            If there isn't enough stock available, the order stays reserved and nothing changes.
          </p>
          <p class="mt-2 text-sm text-slate-400">This action is permanent and cannot be undone.</p>
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
              (click)="cancelFulfill()"
              [disabled]="fulfilling()"
              class="flex-1 rounded-xl border border-white/10 px-4 py-3 font-medium text-slate-300 transition-colors hover:bg-deep-slate hover:text-white disabled:opacity-60"
            >
              Not yet
            </button>
            <button
              type="button"
              (click)="confirmFulfill()"
              [disabled]="fulfilling()"
              class="flex-1 rounded-xl bg-electric-cyan px-4 py-3 font-medium text-deep-slate transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ fulfilling() ? 'Fulfilling…' : 'Fulfill &amp; Ship' }}
            </button>
          </div>
        </div>
      </div>
    }

    @if (returnTarget(); as order) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-deep-slate/80 px-4 py-8 backdrop-blur-sm"
        (click)="cancelReturn()"
      >
        <div
          class="w-full max-w-lg rounded-xl border border-white/10 bg-surface p-6 text-left"
          role="dialog"
          aria-modal="true"
          aria-labelledby="return-so-title"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 id="return-so-title" class="font-heading text-lg font-semibold text-white">
                Process return · Order #{{ order.id }}
              </h2>
              <p class="mt-1 text-sm text-slate-400">{{ order.customer ?? 'Unknown customer' }}</p>
            </div>
            <button
              type="button"
              (click)="cancelReturn()"
              [disabled]="returning() || returnLoading()"
              aria-label="Close dialog"
              class="rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-deep-slate hover:text-white disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          @if (returnLoading()) {
            <p class="mt-6 rounded-xl bg-deep-slate px-4 py-10 text-center text-sm text-slate-500">
              Loading items…
            </p>
          } @else {
            <form class="mt-5" [formGroup]="returnForm" (ngSubmit)="submitReturn()">
              <div class="flex items-center justify-between">
                <span class="block text-sm font-medium text-slate-300">Items to return</span>
                <span class="text-xs text-slate-500">Restores goods to stock</span>
              </div>

              <div formArrayName="items" class="mt-3 space-y-2">
                @for (line of returnLines.controls; track $index) {
                  <div class="rounded-xl border border-white/10 bg-deep-slate/40 p-3" [formGroup]="line">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                      <label class="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          formControlName="included"
                          class="mt-1 h-4 w-4 accent-electric-cyan"
                        />
                        <span>
                          <span class="block font-medium text-white">
                            {{ returnProductName(line.controls.productId.value) }}
                          </span>
                          <span class="mt-0.5 block text-xs text-slate-500">
                            {{ returnProductSku(line.controls.productId.value) }} ·
                            {{ returnSoldQuantity(line.controls.productId.value) }} sold at
                            {{ formatCurrency(returnUnitPrice(line.controls.productId.value)) }}
                          </span>
                        </span>
                      </label>
                      <label class="w-24 shrink-0">
                        <span class="block text-[11px] uppercase tracking-wide text-slate-500">
                          Return qty
                        </span>
                        <input
                          type="number"
                          min="1"
                          formControlName="quantity"
                          class="mt-1 w-full rounded-xl border border-white/10 bg-deep-slate px-3 py-2 text-sm text-white outline-none focus:border-electric-cyan"
                          [class]="{ 'border-red-400/50': line.touched && line.invalid }"
                        />
                      </label>
                    </div>
                    @if (line.touched && line.invalid) {
                      <p class="mt-2 text-xs text-red-300">{{ returnLineError(line) }}</p>
                    }
                  </div>
                } @empty {
                  <p class="mt-3 rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-500">
                    This order has no items to return.
                  </p>
                }
              </div>

              @if (returnForm.hasError('atLeastOneReturn') && returnForm.touched) {
                <p class="mt-3 text-xs text-red-300">Select at least one item to return.</p>
              }

              <label class="mt-4 block text-sm font-medium text-slate-300" for="return-reason">
                Reason <span class="text-slate-500">(optional)</span>
              </label>
              <textarea
                id="return-reason"
                rows="2"
                maxlength="500"
                formControlName="reason"
                placeholder="e.g. Customer returned damaged goods"
                class="mt-1 w-full rounded-xl border border-white/10 bg-deep-slate px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-electric-cyan"
              ></textarea>

              <div
                class="mt-4 flex items-center justify-between rounded-xl bg-deep-slate px-4 py-3"
              >
                <span class="text-sm text-slate-400">Estimated refund</span>
                <span class="font-heading text-base font-semibold text-white">
                  {{ formatCurrency(estimateRefund()) }}
                </span>
              </div>

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
                  (click)="cancelReturn()"
                  [disabled]="returning()"
                  class="flex-1 rounded-xl border border-white/10 px-4 py-3 font-medium text-slate-300 transition-colors hover:bg-deep-slate hover:text-white disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  [disabled]="returning()"
                  class="flex-1 rounded-xl bg-electric-cyan px-4 py-3 font-medium text-deep-slate transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {{ returning() ? 'Processing…' : 'Process return' }}
                </button>
              </div>
            </form>
          }
        </div>
      </div>
    }
  `,
})
export default class SalesPage {
  private readonly salesOrdersService = inject(SalesOrdersService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly toast = inject(ToastService);

  protected readonly orders = signal<SalesOrderListItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly tab = signal<Tab>('all');
  protected readonly query = signal('');

  protected readonly fulfillTarget = signal<SalesOrderListItem | null>(null);
  protected readonly fulfilling = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly returnTarget = signal<SalesOrderListItem | null>(null);
  protected readonly returnLoading = signal(false);
  protected readonly returnDetail = signal<SalesOrder | null>(null);
  protected readonly returning = signal(false);

  protected readonly returnForm = this.formBuilder.group(
    {
      items: this.formBuilder.array<FormGroup<ReturnLineControls>>([]),
      reason: this.formBuilder.control('', [Validators.maxLength(500)]),
    },
    { validators: [atLeastOneReturn] }
  );

  protected get returnLines(): FormArray<FormGroup<ReturnLineControls>> {
    return this.returnForm.get('items') as FormArray<FormGroup<ReturnLineControls>>;
  }

  protected readonly activeOrders = computed(() =>
    this.orders().filter((order) => order.status === 'reserved' || order.status === 'shipped')
  );

  protected readonly visibleOrders = computed(() => {
    const current = this.tab();

    if (current === 'all') {
      return this.orders();
    }

    return this.orders().filter((order) => order.status === current);
  });

  protected readonly filteredOrders = computed(() => {
    const needle = this.query().trim().toLowerCase();

    if (needle === '') {
      return this.visibleOrders();
    }

    return this.visibleOrders().filter(
      (order) =>
        (order.customer ?? '').toLowerCase().includes(needle) ||
        String(order.id).includes(needle)
    );
  });

  protected readonly reservedCount = computed(() =>
    this.orders().some((order) => order.status === 'reserved')
      ? this.orders().filter((order) => order.status === 'reserved').length
      : null
  );

  protected readonly shippedCount = computed(() =>
    this.orders().some((order) => order.status === 'shipped')
      ? this.orders().filter((order) => order.status === 'shipped').length
      : null
  );

  protected readonly reservedValue = computed(() =>
    this.orders()
      .filter((order) => order.status === 'reserved')
      .reduce((sum, order) => sum + Number(order.total_price), 0)
      .toFixed(2)
  );

  protected readonly shippedValue = computed(() =>
    this.orders()
      .filter((order) => order.status === 'shipped')
      .reduce((sum, order) => sum + Number(order.total_price), 0)
      .toFixed(2)
  );

  constructor() {
    afterNextRender(() => this.load());
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.cancelFulfill();
    this.cancelReturn();
  }

  protected load(force = false): void {
    this.loading.set(true);
    this.error.set(null);

    this.salesOrdersService.list(force).subscribe({
      next: ({ sales_orders }) => {
        this.orders.set(sales_orders);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(this.messageFor(error, 'Unable to load sales orders right now.'));
      },
    });
  }

  protected reload(force = false): void {
    this.load(force);
  }

  protected selectTab(tab: Tab): void {
    this.tab.set(tab);
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
      return `${this.visibleOrders().length} order${this.visibleOrders().length === 1 ? '' : 's'}`;
    }

    const count = this.filteredOrders().length;

    return `${count} match${count === 1 ? '' : 'es'} for "${needle}"`;
  }

  protected emptyLabel(): string {
    if (this.loading()) {
      return 'Loading sales orders…';
    }

    if (this.query().trim() !== '') {
      return 'No orders match your search.';
    }

    if (this.tab() !== 'all') {
      return `No ${this.tab()} sales orders.`;
    }

    return 'No sales orders yet. Create one to get started.';
  }

  protected tabClass(tab: Tab): string {
    const active =
      this.tab() === tab
        ? 'border-electric-cyan/40 bg-electric-cyan/10 text-electric-cyan'
        : 'border-white/10 bg-surface text-slate-400 hover:text-slate-200';

    return `rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${active}`;
  }

  protected statusBadge(status: SalesOrderStatus): string {
    switch (status) {
      case 'reserved':
        return 'border-amber-400/30 bg-amber-400/10 text-amber-300';
      case 'shipped':
        return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300';
      default:
        return 'border-red-400/30 bg-red-400/10 text-red-300';
    }
  }

  protected requestFulfill(order: SalesOrderListItem): void {
    this.formError.set(null);
    this.fulfillTarget.set(order);
  }

  protected cancelFulfill(): void {
    if (this.fulfilling()) {
      return;
    }

    this.fulfillTarget.set(null);
  }

  protected confirmFulfill(): void {
    const order = this.fulfillTarget();

    if (order === null || this.fulfilling()) {
      return;
    }

    this.fulfilling.set(true);
    this.formError.set(null);

    this.salesOrdersService.fulfill(order.id).subscribe({
      next: ({ sales_order }) => {
        this.fulfilling.set(false);
        this.fulfillTarget.set(null);
        this.upsertListItem(sales_order);
        this.toast.show(`Order #${sales_order.id} fulfilled and shipped. Stock and income updated.`);
      },
      error: (error: unknown) => {
        this.fulfilling.set(false);
        this.toast.show(this.messageFor(error, 'Unable to fulfill this order right now.'), 'error');
      },
    });
  }

  protected requestReturn(order: SalesOrderListItem): void {
    this.formError.set(null);
    this.returnTarget.set(order);
    this.returnLoading.set(true);
    this.returnDetail.set(null);
    this.returnLines.clear();

    this.salesOrdersService.show(order.id).subscribe({
      next: ({ sales_order }) => {
        this.returnDetail.set(sales_order);
        this.returnLoading.set(false);

        for (const item of sales_order.items) {
          this.returnLines.push(this.returnLineGroup(item));
        }

        this.returnForm.controls.reason.setValue('');
        this.returnForm.markAsPristine();
        this.returnForm.markAsUntouched();
      },
      error: (error: unknown) => {
        this.returnLoading.set(false);
        this.returnTarget.set(null);
        this.returnDetail.set(null);
        this.toast.show(this.messageFor(error, `Unable to load sales order #${order.id}.`), 'error');
      },
    });
  }

  protected cancelReturn(): void {
    if (this.returning() || this.returnLoading()) {
      return;
    }

    this.returnTarget.set(null);
    this.returnDetail.set(null);
  }

  protected submitReturn(): void {
    const order = this.returnTarget();

    if (order === null || this.returning() || this.returnLoading()) {
      return;
    }

    if (this.returnForm.invalid) {
      this.returnForm.markAllAsTouched();
      return;
    }

    const reason = this.returnForm.controls.reason.value.trim();
    const items = this.returnLines.controls
      .map((line) => line.getRawValue())
      .filter((line) => line.included && line.quantity > 0)
      .map((line) =>
        reason !== ''
          ? { product_id: line.productId, quantity: line.quantity, reason }
          : { product_id: line.productId, quantity: line.quantity }
      );

    if (items.length === 0) {
      return;
    }

    this.returning.set(true);
    this.formError.set(null);

    this.salesOrdersService.processReturn(order.id, { items }).subscribe({
      next: ({ sales_order, message }) => {
        this.returning.set(false);
        this.returnTarget.set(null);
        this.returnDetail.set(null);
        this.returnLines.clear();
        this.upsertListItem(sales_order);
        this.toast.show(message);
      },
      error: (error: unknown) => {
        this.returning.set(false);
        this.formError.set(this.messageFor(error, 'Unable to process the return right now.'));
      },
    });
  }

  protected estimateRefund(): string {
    const detail = this.returnDetail();

    if (detail === null) {
      return '0.00';
    }

    const items = detail.items;
    let total = 0;

    for (let index = 0; index < this.returnLines.length; index += 1) {
      const raw = this.returnLines.at(index)?.getRawValue();

      if (raw !== undefined && raw.included && raw.quantity > 0) {
        total += Number(items[index].unit_price) * raw.quantity;
      }
    }

    return total.toFixed(2);
  }

  protected returnLineError(line: FormGroup<ReturnLineControls>): string {
    const exceeds = line.getError('exceedsSold');

    if (typeof exceeds === 'string') {
      return exceeds;
    }

    if (line.hasError('returnQuantity')) {
      return 'Enter a positive quantity up to the number sold.';
    }

    return 'Invalid return quantity.';
  }

  protected returnProductName(productId: number): string {
    return this.returnDetail()?.items.find((item) => item.product_id === productId)?.product_name ?? `Product #${productId}`;
  }

  protected returnProductSku(productId: number): string {
    return this.returnDetail()?.items.find((item) => item.product_id === productId)?.product_sku ?? '—';
  }

  protected returnSoldQuantity(productId: number): number {
    return this.returnDetail()?.items.find((item) => item.product_id === productId)?.quantity ?? 0;
  }

  protected returnUnitPrice(productId: number): string {
    return this.returnDetail()?.items.find((item) => item.product_id === productId)?.unit_price ?? '0.00';
  }

  private returnLineGroup(item: SalesOrderItem): FormGroup<ReturnLineControls> {
    const group = this.formBuilder.group({
      included: this.formBuilder.control(false),
      productId: this.formBuilder.control(item.product_id),
      quantity: this.formBuilder.control(1),
    });

    group.setValidators([this.returnLineValidator(item)]);
    return group;
  }

  private returnLineValidator(item: SalesOrderItem): ValidatorFn {
    return (control: AbstractControl) => {
      const included = control.get('included')?.value === true;
      const quantity = Number(control.get('quantity')?.value ?? 0);

      if (!included) {
        return null;
      }

      if (!Number.isInteger(quantity) || quantity < 1) {
        return { returnQuantity: true };
      }

      if (quantity > item.quantity) {
        return { exceedsSold: `Cannot return more than ${item.quantity} unit${item.quantity === 1 ? '' : 's'} sold.` };
      }

      return null;
    };
  }

  protected formatCurrency(value: string | number): string {
    return formatCurrency(value);
  }

  protected formatNumber(value: number): string {
    return formatNumber(value);
  }

  protected formatDate(value: string | null): string {
    return formatDate(value);
  }

  private upsertListItem(order: SalesOrderListItem): void {
    this.orders.update((list) => [order, ...list.filter((item) => item.id !== order.id)]);
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