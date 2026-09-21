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
        <p class="mt-2 font-heading text-2xl font-semibold text-white">{{ formatNumber(damages().length) }}</p>
        <p class="mt-1 text-xs text-slate-500">Individual write-offs</p>
      </article>
      <article class="rounded-xl bg-surface p-6">
        <p class="text-sm font-medium text-slate-400">Units written off</p>
        <p class="mt-2 font-heading text-2xl font-semibold text-red-300">{{ totalUnitsLost() }}</p>
        <p class="mt-1 text-xs text-slate-500">Damaged units removed</p>
      </article>
      <article class="rounded-xl bg-surface p-6">
        <p class="text-sm font-medium text-slate-400">Total loss</p>
        <p class="mt-2 font-heading text-2xl font-semibold text-red-300">{{ totalLoss() }}</p>
        <p class="mt-1 text-xs text-slate-500">Valued at product cost</p>
      </article>
    </section>

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
            @for (entry of damages(); track entry.id ?? entry.product_id) {
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
                  {{ loading() ? 'Loading damages…' : 'No damages written off yet.' }}
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

  protected readonly totalUnitsLost = computed(() =>
    formatNumber(this.damages().reduce((sum, entry) => sum + entry.quantity, 0))
  );

  protected readonly totalLoss = computed(() => {
    const entries = this.damages();
    if (entries.length === 0) {
      return '—';
    }
    return formatCurrency(entries.reduce((sum, entry) => sum + Number(entry.loss), 0));
  });

  constructor() {
    afterNextRender(() => this.load());
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
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        return 'Your session expired. Please sign in again.';
      }

      if (error.status === 0) {
        return 'Cannot reach the server. Please try again.';
      }
    }

    return 'Unable to load damages right now.';
  }
}