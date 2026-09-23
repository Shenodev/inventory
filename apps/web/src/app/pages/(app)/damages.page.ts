import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouteMeta } from '@analogjs/router';

import { apiErrorMessage } from '../../core/api-error';
import { formatCurrency, formatDate, formatNumber } from '../../core/format';
import { DamageEntry, ProductsService } from '../../core/products/products.service';

export const routeMeta: RouteMeta = {
  title: 'Damages · ShenoInventory',
};

@Component({
  selector: 'app-damages-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-heading text-2xl font-semibold text-white">Damages</h1>
        <p class="mt-1 text-sm text-slate-400">
          Write-offs of broken or unusable stock.
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
        <p class="text-sm font-medium text-slate-400">Damages recorded</p>
        <p class="mt-2 font-heading text-2xl font-semibold text-white">{{ formatNumber(filteredDamages().length) }}</p>
        <p class="mt-1 text-xs text-slate-500">Individual write-offs ({{ formatNumber(damages().length) }} total)</p>
      </article>
      <article class="rounded-xl bg-surface p-6">
        <p class="text-sm font-medium text-slate-400">Units written off</p>
        <p class="mt-2 font-heading text-2xl font-semibold text-red-300">{{ totalUnitsLost() }}</p>
        <p class="mt-1 text-xs text-slate-500">Filtered total</p>
      </article>
      <article class="rounded-xl bg-surface p-6">
        <p class="text-sm font-medium text-slate-400">Total loss</p>
        <p class="mt-2 font-heading text-2xl font-semibold text-red-300">{{ totalLoss() }}</p>
        <p class="mt-1 text-xs text-slate-500">Valued at product cost</p>
      </article>
    </section>

    <div class="mt-6 flex flex-wrap items-center gap-3">
      <label class="relative flex min-w-0 flex-1 items-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="pointer-events-none absolute left-3 h-4 w-4 text-slate-500">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.4-3.4" />
        </svg>
        <input
          type="search"
          placeholder="Search by product, SKU or reason…"
          [value]="query()"
          (input)="onQuery($event)"
          class="w-full rounded-xl border border-white/10 bg-surface py-2.5 pl-10 pr-10 text-sm text-white outline-none placeholder:text-slate-500 focus:border-electric-cyan"
        />
        @if (query() !== '') {
          <button type="button" (click)="query.set('')" aria-label="Clear search" class="absolute right-2 rounded-lg p-1 text-slate-400 transition-colors hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        }
      </label>
      <span class="text-sm text-slate-500">{{ filteredDamages().length }} of {{ damages().length }}</span>
    </div>

    <div class="mt-3 flex flex-wrap items-center gap-3">
      <div class="flex gap-2">
        <label class="text-xs text-slate-500">From</label>
        <input type="date" [value]="dateFrom()" (change)="onDateFrom($event)" class="rounded-xl border border-white/10 bg-surface px-3 py-1.5 text-xs text-white outline-none focus:border-electric-cyan" />
        <label class="text-xs text-slate-500">To</label>
        <input type="date" [value]="dateTo()" (change)="onDateTo($event)" class="rounded-xl border border-white/10 bg-surface px-3 py-1.5 text-xs text-white outline-none focus:border-electric-cyan" />
        @if (dateFrom() || dateTo()) {
          <button type="button" (click)="clearDates()" class="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:text-white">Clear dates</button>
        }
      </div>
    </div>

    <section class="mt-6 overflow-hidden rounded-xl bg-surface">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-y border-white/5 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" class="px-6 py-3 font-medium">Product</th>
              <th scope="col" class="px-6 py-3 text-right font-medium">Units</th>
              <th scope="col" class="px-6 py-3 font-medium">Reason</th>
              <th scope="col" class="px-6 py-3 text-right font-medium">Loss</th>
              <th scope="col" class="px-6 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            @for (entry of filteredDamages(); track entry.id ?? entry.product_id) {
              <tr class="transition-colors hover:bg-deep-slate/60">
                <td class="px-6 py-4">
                  <p class="font-medium text-white">{{ entry.name }}</p>
                  <p class="mt-0.5 text-xs text-slate-500">{{ entry.sku }}</p>
                </td>
                <td class="px-6 py-4 text-right text-slate-200">{{ formatNumber(entry.quantity) }}</td>
                <td class="px-6 py-4 text-slate-300">{{ entry.reason ?? 'Not specified' }}</td>
                <td class="px-6 py-4 text-right font-medium text-red-300">{{ formatCurrency(entry.loss) }}</td>
                <td class="px-6 py-4 text-slate-300">{{ formatDate(entry.created_at ?? null) }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="px-6 py-10 text-center text-slate-500">
                  {{ loading() ? 'Loading damages…' : (query() || dateFrom() || dateTo() ? 'No damages match your filters.' : 'No damages written off yet.') }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export default class DamagesPage {
  private readonly productsService = inject(ProductsService);

  protected readonly damages = signal<DamageEntry[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly query = signal('');
  protected readonly dateFrom = signal('');
  protected readonly dateTo = signal('');

  protected readonly filteredDamages = computed(() => {
    const needle = this.query().trim().toLowerCase();
    const from = this.dateFrom() ? new Date(this.dateFrom()) : null;
    const to = this.dateTo() ? new Date(this.dateTo()) : null;
    if (to) to.setHours(23, 59, 59, 999);
    return this.damages().filter((entry) => {
      if (needle) {
        const hay = `${entry.name ?? ''} ${entry.sku ?? ''} ${entry.reason ?? ''}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (from || to) {
        if (!entry.created_at) return false;
        const d = new Date(entry.created_at);
        if (from && d < from) return false;
        if (to && d > to) return false;
      }
      return true;
    });
  });

  protected readonly totalUnitsLost = computed(() =>
    formatNumber(this.filteredDamages().reduce((sum, entry) => sum + entry.quantity, 0))
  );

  protected readonly totalLoss = computed(() => {
    const entries = this.filteredDamages();
    if (entries.length === 0) {
      return '—';
    }
    return formatCurrency(entries.reduce((sum, entry) => sum + Number(entry.loss), 0));
  });

  constructor() {
    afterNextRender(() => this.load());
  }

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }
  protected onDateFrom(event: Event): void {
    this.dateFrom.set((event.target as HTMLInputElement).value);
  }
  protected onDateTo(event: Event): void {
    this.dateTo.set((event.target as HTMLInputElement).value);
  }
  protected clearDates(): void {
    this.dateFrom.set('');
    this.dateTo.set('');
  }

  protected load(force = false): void {
    this.loading.set(true);
    this.error.set(null);

    this.productsService.listDamages(force).subscribe({
      next: ({ damages }) => {
        this.damages.set(damages);
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

  protected formatCurrency(value: string | number): string {
    return formatCurrency(value);
  }

  protected formatDate(value: string | null): string {
    return formatDate(value);
  }

  private messageFor(error: unknown): string {
    return apiErrorMessage(error, 'Unable to load damages right now.');
  }
}
