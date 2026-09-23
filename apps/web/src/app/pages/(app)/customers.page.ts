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

import { formatDate, formatNumber } from '../../core/format';
import { apiErrorMessage } from '../../core/api-error';
import { Customer, CustomersService } from '../../core/sales/customers.service';

export const routeMeta: RouteMeta = {
  title: 'Customers · ShenoInventory',
  meta: [
    {
      name: 'description',
      content: 'Customer directory — sales orders placed per buyer and contact details.',
    },
  ],
};

const PAGE_SIZE = 50;

@Component({
  selector: 'app-customers-page',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-heading text-2xl font-semibold text-white">Customers</h1>
        <p class="mt-1 text-sm text-slate-400">
          {{ customers().length }} customers in your book.
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
          New customer
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
        <p class="text-sm font-medium text-slate-400">Customers on file</p>
        <p class="mt-2 font-heading text-2xl font-semibold text-white">
          {{ formatNumber(customers().length) }}
        </p>
        <p class="mt-1 text-xs text-slate-500">In your directory</p>
      </article>
      <article class="rounded-xl bg-surface p-6">
        <p class="text-sm font-medium text-slate-400">Sales orders placed</p>
        <p class="mt-2 font-heading text-2xl font-semibold text-electric-cyan">
          {{ formatNumber(totalOrders()) }}
        </p>
        <p class="mt-1 text-xs text-slate-500">Across all customers</p>
      </article>
      <article class="rounded-xl bg-surface p-6">
        <p class="text-sm font-medium text-slate-400">Have ordered</p>
        <p class="mt-2 font-heading text-2xl font-semibold">
          {{ formatNumber(activeCustomers()) }}
        </p>
        <p class="mt-1 text-xs text-slate-500">Customers with an order</p>
      </article>
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
          placeholder="Search by name, email or phone…"
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
              <th scope="col" class="px-6 py-3 font-medium">Customer</th>
              <th scope="col" class="px-6 py-3 font-medium">Contact</th>
              <th scope="col" class="px-6 py-3 text-center font-medium">Orders</th>
              <th scope="col" class="px-6 py-3 font-medium">Added</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            @for (customer of visibleCustomers(); track customer.id) {
              <tr class="transition-colors hover:bg-deep-slate/60">
                <td class="px-6 py-4">
                  <p class="font-medium text-white">{{ customer.name }}</p>
                  <p class="mt-0.5 text-xs text-slate-500">#{{ customer.id }}</p>
                </td>
                <td class="px-6 py-4">
                  <p class="text-slate-300">{{ customer.email || '—' }}</p>
                  <p class="mt-0.5 text-xs text-slate-500">{{ customer.phone || 'No phone on file' }}</p>
                </td>
                <td class="px-6 py-4 text-center">
                  <span
                    class="inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium"
                    [class]="
                      customer.sales_order_count > 0
                        ? 'border-electric-cyan/30 bg-electric-cyan/10 text-electric-cyan'
                        : 'border-white/10 bg-deep-slate text-slate-400'
                    "
                  >
                    {{ customer.sales_order_count }}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm text-slate-400">
                  {{ formatDate(customer.created_at) }}
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

    @if (filteredCustomers().length > visibleCustomers().length) {
      <div class="mt-4 flex justify-center">
        <button
          type="button"
          (click)="showMore()"
          class="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-surface hover:text-white"
        >
          Show more ({{ filteredCustomers().length - visibleCustomers().length }} remaining)
        </button>
      </div>
    }

    @if (editor()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-deep-slate/80 px-4 py-8 backdrop-blur-sm"
        (click)="closeEditor()"
      >
        <div
          class="w-full max-w-md rounded-xl border border-white/10 bg-surface p-6 text-left"
          role="dialog"
          aria-modal="true"
          aria-labelledby="customer-editor-title"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 id="customer-editor-title" class="font-heading text-lg font-semibold text-white">
                New customer
              </h2>
              <p class="mt-1 text-sm text-slate-400">Add a buyer to your customer directory.</p>
            </div>
            <button
              type="button"
              (click)="closeEditor()"
              aria-label="Close dialog"
              class="rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-deep-slate hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <form class="mt-5" [formGroup]="form" (ngSubmit)="submitEditor()">
            <label class="block text-sm font-medium text-slate-300" for="customer-name">
              Name
            </label>
            <input
              id="customer-name"
              type="text"
              formControlName="name"
              placeholder="e.g. Jane Cooper"
              class="mt-1 w-full rounded-xl border border-white/10 bg-deep-slate px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-electric-cyan"
            />

            <label class="mt-4 block text-sm font-medium text-slate-300" for="customer-email">
              Email <span class="text-slate-500">(optional)</span>
            </label>
            <input
              id="customer-email"
              type="email"
              formControlName="email"
              placeholder="jane@company.com"
              class="mt-1 w-full rounded-xl border border-white/10 bg-deep-slate px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-electric-cyan"
            />

            <label class="mt-4 block text-sm font-medium text-slate-300" for="customer-phone">
              Phone <span class="text-slate-500">(optional)</span>
            </label>
            <input
              id="customer-phone"
              type="text"
              formControlName="phone"
              placeholder="+1 (555) 010-2030"
              class="mt-1 w-full rounded-xl border border-white/10 bg-deep-slate px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-electric-cyan"
            />

            <label class="mt-4 flex items-start gap-2 text-xs leading-relaxed text-slate-400">
              <input type="checkbox" formControlName="consent" class="mt-0.5 h-4 w-4 rounded border-white/20 bg-deep-slate text-cyan-500 focus:ring-cyan-400/30" />
              <span>I have consent to store this contact and they are 16+ (see <a href="/legal/privacy" target="_blank" class="underline decoration-white/20 underline-offset-2 hover:text-white">Privacy</a>). Only name is required; email/phone are optional.</span>
            </label>
            @if (form.controls.consent.touched && form.controls.consent.invalid) {
              <p class="mt-1 text-xs text-red-300">You must confirm consent.</p>
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
                (click)="closeEditor()"
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
                {{ saving() ? 'Saving…' : 'Create customer' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export default class CustomersPage {
  private readonly customersService = inject(CustomersService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly customers = signal<Customer[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);

  protected readonly query = signal('');
  protected readonly limit = signal(PAGE_SIZE);

  protected readonly editor = signal(false);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.formBuilder.group({
    name: this.formBuilder.control('', [Validators.required, Validators.maxLength(120)]),
    email: this.formBuilder.control('', [Validators.email, Validators.maxLength(120)]),
    phone: this.formBuilder.control('', [Validators.maxLength(30)]),
    consent: this.formBuilder.control(false, [Validators.requiredTrue]),
  });

  protected readonly filteredCustomers = computed(() => {
    const needle = this.query().trim().toLowerCase();

    if (needle === '') {
      return this.customers();
    }

    return this.customers().filter((customer) => {
      const searchable = `${customer.name} ${customer.email} ${customer.phone}`.toLowerCase();
      return searchable.includes(needle);
    });
  });

  protected readonly visibleCustomers = computed(() => this.filteredCustomers().slice(0, this.limit()));

  protected readonly totalOrders = computed(() =>
    this.customers().reduce((sum, customer) => sum + customer.sales_order_count, 0)
  );

  protected readonly activeCustomers = computed(
    () => this.customers().filter((customer) => customer.sales_order_count > 0).length
  );

  constructor() {
    afterNextRender(() => this.load());
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeEditor();
  }

  protected load(force = false): void {
    this.loading.set(true);
    this.error.set(null);

    this.customersService.list(force).subscribe({
      next: ({ customers }) => {
        this.customers.set(customers);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(this.messageFor(error, 'Unable to load customers right now.'));
      },
    });
  }

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.limit.set(PAGE_SIZE);
  }

  protected clearQuery(): void {
    this.query.set('');
    this.limit.set(PAGE_SIZE);
  }

  protected showMore(): void {
    this.limit.update((current) => current + PAGE_SIZE);
  }

  protected resultLabel(): string {
    const needle = this.query().trim();

    if (needle === '') {
      return `${this.customers().length} customer${this.customers().length === 1 ? '' : 's'}`;
    }

    const count = this.filteredCustomers().length;

    return `${count} match${count === 1 ? '' : 'es'} for "${needle}"`;
  }

  protected emptyLabel(): string {
    if (this.loading()) {
      return 'Loading customers…';
    }

    if (this.query().trim() !== '') {
      return 'No customers match your search.';
    }

    return 'No customers found yet.';
  }

  protected openCreate(): void {
    this.form.reset({ name: '', email: '', phone: '', consent: false });
    this.formError.set(null);
    this.editor.set(true);
  }

  protected closeEditor(): void {
    if (this.saving()) {
      return;
    }

    this.editor.set(false);
  }

  protected submitEditor(): void {
    if (this.saving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, email, phone } = this.form.getRawValue();
    this.saving.set(true);
    this.formError.set(null);

    this.customersService
      .store({ name: name.trim(), email: email.trim() || null, phone: phone.trim() || null })
      .subscribe({
        next: ({ customer }) => {
          this.saving.set(false);
          this.editor.set(false);
          this.upsert(customer);
          this.notice.set(`Customer "${customer.name}" added.`);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.formError.set(this.messageFor(error, 'Unable to create the customer right now.'));
        },
      });
  }

  protected formatNumber(value: number): string {
    return formatNumber(value);
  }

  protected formatDate(value: string | null): string {
    return formatDate(value);
  }

  private upsert(customer: Customer): void {
    this.customers.update((list) => {
      const index = list.findIndex((item) => item.id === customer.id);

      if (index === -1) {
        return [...list, customer].sort((a, b) => a.name.localeCompare(b.name));
      }

      const copy = [...list];
      copy[index] = customer;
      return copy;
    });
  }

  private messageFor(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse && (error.status === 409 || error.status === 422)) {
      const body = error.error as { message?: string; errors?: Record<string, string[]> } | null;
      const first = body?.errors ? Object.values(body.errors)[0]?.[0] : undefined;
      return first ?? body?.message ?? fallback;
    }

    return apiErrorMessage(error, fallback);
  }
}