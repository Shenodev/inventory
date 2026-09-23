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
import { Supplier, SuppliersService } from '../../core/procurement/suppliers.service';

export const routeMeta: RouteMeta = {
  title: 'Suppliers · ShenoInventory',
  meta: [
    {
      name: 'description',
      content: 'Suppliers — the purchasing network with purchase-order history per vendor.',
    },
  ],
};

const PAGE_SIZE = 50;

type EditorState = { supplier: Supplier | null };

@Component({
  selector: 'app-suppliers-page',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-heading text-2xl font-semibold text-white">Suppliers</h1>
        <p class="mt-1 text-sm text-slate-400">
          {{ suppliers().length }} suppliers across the purchasing network.
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
          New supplier
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
        <p class="text-sm font-medium text-slate-400">Suppliers on file</p>
        <p class="mt-2 font-heading text-2xl font-semibold text-white">
          {{ formatNumber(suppliers().length) }}
        </p>
        <p class="mt-1 text-xs text-slate-500">Active vendors</p>
      </article>
      <article class="rounded-xl bg-surface p-6">
        <p class="text-sm font-medium text-slate-400">Purchase orders placed</p>
        <p class="mt-2 font-heading text-2xl font-semibold text-electric-cyan">
          {{ formatNumber(totalPurchaseOrders()) }}
        </p>
        <p class="mt-1 text-xs text-slate-500">Across all suppliers</p>
      </article>
      <article class="rounded-xl bg-surface p-6">
        <p class="text-sm font-medium text-slate-400">No orders yet</p>
        <p class="mt-2 font-heading text-2xl font-semibold">
          {{ formatNumber(unusedSuppliers()) }}
        </p>
        <p class="mt-1 text-xs text-slate-500">Suppliers without a PO</p>
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
              <th scope="col" class="px-6 py-3 font-medium">Supplier</th>
              <th scope="col" class="px-6 py-3 font-medium">Contact</th>
              <th scope="col" class="px-6 py-3 text-center font-medium">Purchase orders</th>
              <th scope="col" class="px-6 py-3 font-medium">Added</th>
              <th scope="col" class="px-6 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            @for (supplier of visibleSuppliers(); track supplier.id) {
              <tr class="transition-colors hover:bg-deep-slate/60">
                <td class="px-6 py-4">
                  <p class="font-medium text-white">{{ supplier.name }}</p>
                  <p class="mt-0.5 text-xs text-slate-500">#{{ supplier.id }}</p>
                </td>
                <td class="px-6 py-4">
                  <p class="text-slate-300">{{ supplier.email || '—' }}</p>
                  <p class="mt-0.5 text-xs text-slate-500">{{ supplier.phone || 'No phone on file' }}</p>
                </td>
                <td class="px-6 py-4 text-center">
                  <span
                    class="inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium"
                    [class]="
                      supplier.purchase_order_count > 0
                        ? 'border-electric-cyan/30 bg-electric-cyan/10 text-electric-cyan'
                        : 'border-white/10 bg-deep-slate text-slate-400'
                    "
                  >
                    {{ supplier.purchase_order_count }}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm text-slate-400">
                  {{ formatDate(supplier.created_at) }}
                </td>
                <td class="px-6 py-4">
                  <div class="flex justify-end gap-2">
                    <button
                      type="button"
                      (click)="openEdit(supplier)"
                      class="rounded-xl border border-white/10 px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:border-electric-cyan/40 hover:text-electric-cyan"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      (click)="requestDelete(supplier)"
                      class="rounded-xl border border-white/10 px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:border-red-400/40 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="px-6 py-10 text-center text-slate-500">
                  {{ emptyLabel() }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>

    @if (filteredSuppliers().length > visibleSuppliers().length) {
      <div class="mt-4 flex justify-center">
        <button
          type="button"
          (click)="showMore()"
          class="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-surface hover:text-white"
        >
          Show more ({{ filteredSuppliers().length - visibleSuppliers().length }} remaining)
        </button>
      </div>
    }

    @if (editor(); as state) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-deep-slate/80 px-4 py-8 backdrop-blur-sm"
        (click)="closeEditor()"
      >
        <div
          class="w-full max-w-md rounded-xl border border-white/10 bg-surface p-6 text-left"
          role="dialog"
          aria-modal="true"
          aria-labelledby="supplier-editor-title"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 id="supplier-editor-title" class="font-heading text-lg font-semibold text-white">
                {{ state.supplier === null ? 'New supplier' : 'Edit supplier' }}
              </h2>
              <p class="mt-1 text-sm text-slate-400">
                {{ state.supplier === null ? 'Add a vendor to the purchasing network.' : state.supplier.name }}
              </p>
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
            <label class="block text-sm font-medium text-slate-300" for="supplier-name">
              Company name
            </label>
            <input
              id="supplier-name"
              type="text"
              formControlName="name"
              placeholder="e.g. Northwind Manufacturing"
              class="mt-1 w-full rounded-xl border border-white/10 bg-deep-slate px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-electric-cyan"
            />

            <label class="mt-4 block text-sm font-medium text-slate-300" for="supplier-email">
              Email
            </label>
            <input
              id="supplier-email"
              type="email"
              formControlName="email"
              placeholder="orders@supplier.com"
              class="mt-1 w-full rounded-xl border border-white/10 bg-deep-slate px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-electric-cyan"
            />

            <label class="mt-4 block text-sm font-medium text-slate-300" for="supplier-phone">
              Phone <span class="text-slate-500">(optional)</span>
            </label>
            <input
              id="supplier-phone"
              type="text"
              formControlName="phone"
              placeholder="+1 (555) 010-2030"
              class="mt-1 w-full rounded-xl border border-white/10 bg-deep-slate px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-electric-cyan"
            />

            <label class="mt-4 flex items-start gap-2 text-xs leading-relaxed text-slate-400">
              <input type="checkbox" formControlName="consent" class="mt-0.5 h-4 w-4 rounded border-white/20 bg-deep-slate text-cyan-500 focus:ring-cyan-400/30" />
              <span>I have consent to store this supplier and they are 16+ (see <a href="/legal/privacy" target="_blank" class="underline decoration-white/20 underline-offset-2 hover:text-white">Privacy</a>). Only name/email are required.</span>
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
                {{ saving() ? 'Saving…' : state.supplier === null ? 'Create supplier' : 'Save changes' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    @if (deleteTarget(); as supplier) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-deep-slate/80 px-4 py-8 backdrop-blur-sm"
        (click)="cancelDelete()"
      >
        <div
          class="w-full max-w-md rounded-xl border border-white/10 bg-surface p-6 text-left"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-supplier-title"
          (click)="$event.stopPropagation()"
        >
          <h2 id="delete-supplier-title" class="font-heading text-lg font-semibold text-white">
            Delete {{ supplier.name }}?
          </h2>
          <p class="mt-2 text-sm text-slate-400">
            This permanently removes the supplier{{ supplier.purchase_order_count > 0 ? '' : ' and any audit trail tied to it' }}.
          </p>
          @if (supplier.purchase_order_count > 0) {
            <p
              class="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-300"
              role="alert"
            >
              This supplier has {{ supplier.purchase_order_count }} purchase order{{
                supplier.purchase_order_count === 1 ? '' : 's'
              }}
              attached and cannot be deleted.
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
              (click)="cancelDelete()"
              [disabled]="saving()"
              class="flex-1 rounded-xl border border-white/10 px-4 py-3 font-medium text-slate-300 transition-colors hover:bg-deep-slate hover:text-white disabled:opacity-60"
            >
              Keep supplier
            </button>
            <button
              type="button"
              (click)="confirmDelete()"
              [disabled]="saving() || supplier.purchase_order_count > 0"
              class="flex-1 rounded-xl bg-red-500/90 px-4 py-3 font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ saving() ? 'Deleting…' : 'Delete supplier' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export default class SuppliersPage {
  private readonly suppliersService = inject(SuppliersService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly suppliers = signal<Supplier[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);

  protected readonly query = signal('');
  protected readonly limit = signal(PAGE_SIZE);

  protected readonly editor = signal<EditorState | null>(null);
  protected readonly deleteTarget = signal<Supplier | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.formBuilder.group({
    name: this.formBuilder.control('', [Validators.required, Validators.maxLength(120)]),
    email: this.formBuilder.control('', [Validators.required, Validators.email, Validators.maxLength(120)]),
    phone: this.formBuilder.control('', [Validators.maxLength(30)]),
    consent: this.formBuilder.control(false, [Validators.requiredTrue]),
  });

  protected readonly filteredSuppliers = computed(() => {
    const needle = this.query().trim().toLowerCase();

    if (needle === '') {
      return this.suppliers();
    }

    return this.suppliers().filter((supplier) => {
      const searchable = `${supplier.name} ${supplier.email} ${supplier.phone}`.toLowerCase();
      return searchable.includes(needle);
    });
  });

  protected readonly visibleSuppliers = computed(() =>
    this.filteredSuppliers().slice(0, this.limit())
  );

  protected readonly totalPurchaseOrders = computed(() =>
    this.suppliers().reduce((sum, supplier) => sum + supplier.purchase_order_count, 0)
  );

  protected readonly unusedSuppliers = computed(
    () => this.suppliers().filter((supplier) => supplier.purchase_order_count === 0).length
  );

  constructor() {
    afterNextRender(() => this.load());
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.cancelDelete();
    this.closeEditor();
  }

  protected load(force = false): void {
    this.loading.set(true);
    this.error.set(null);

    this.suppliersService.list(force).subscribe({
      next: ({ suppliers }) => {
        this.suppliers.set(suppliers);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(this.messageFor(error, 'Unable to load suppliers right now.'));
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
      return `${this.suppliers().length} supplier${this.suppliers().length === 1 ? '' : 's'}`;
    }

    const count = this.filteredSuppliers().length;

    return `${count} match${count === 1 ? '' : 'es'} for "${needle}"`;
  }

  protected emptyLabel(): string {
    if (this.loading()) {
      return 'Loading suppliers…';
    }

    if (this.query().trim() !== '') {
      return 'No suppliers match your search.';
    }

    return 'No suppliers found yet.';
  }

  protected openCreate(): void {
    this.form.reset({ name: '', email: '', phone: '', consent: false });
    this.formError.set(null);
    this.editor.set({ supplier: null });
  }

  protected openEdit(supplier: Supplier): void {
    this.form.reset({ name: supplier.name, email: supplier.email, phone: supplier.phone, consent: true });
    this.formError.set(null);
    this.editor.set({ supplier });
  }

  protected closeEditor(): void {
    if (this.saving()) {
      return;
    }

    this.editor.set(null);
  }

  protected submitEditor(): void {
    const state = this.editor();

    if (state === null || this.saving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, email, phone } = this.form.getRawValue();
    const payload = { name: name.trim(), email: email.trim(), phone: phone.trim() || null };
    this.saving.set(true);
    this.formError.set(null);

    const request =
      state.supplier === null
        ? this.suppliersService.create(payload)
        : this.suppliersService.update(state.supplier.id, payload);

    request.subscribe({
      next: ({ supplier }) => {
        this.saving.set(false);
        this.editor.set(null);
        this.upsert(supplier);
        this.notice.set(
          state.supplier === null
            ? `Supplier "${supplier.name}" added.`
            : `Supplier "${supplier.name}" updated.`
        );
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.formError.set(this.messageFor(error, 'Unable to save the supplier right now.'));
      },
    });
  }

  protected requestDelete(supplier: Supplier): void {
    this.formError.set(null);
    this.deleteTarget.set(supplier);
  }

  protected cancelDelete(): void {
    if (this.saving()) {
      return;
    }

    this.deleteTarget.set(null);
  }

  protected confirmDelete(): void {
    const supplier = this.deleteTarget();

    if (supplier === null || this.saving() || supplier.purchase_order_count > 0) {
      return;
    }

    this.saving.set(true);
    this.formError.set(null);

    this.suppliersService.destroy(supplier.id).subscribe({
      next: ({ message }) => {
        this.saving.set(false);
        this.deleteTarget.set(null);
        this.suppliers.update((list) => list.filter((item) => item.id !== supplier.id));
        this.notice.set(message);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.formError.set(this.messageFor(error, 'Unable to delete the supplier right now.'));
      },
    });
  }

  protected formatNumber(value: number): string {
    return formatNumber(value);
  }

  protected formatDate(value: string | null): string {
    return formatDate(value);
  }

  private upsert(supplier: Supplier): void {
    this.suppliers.update((list) => {
      const index = list.findIndex((item) => item.id === supplier.id);

      if (index === -1) {
        return [...list, supplier].sort((a, b) => a.name.localeCompare(b.name));
      }

      const copy = [...list];
      copy[index] = supplier;
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