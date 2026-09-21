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

import {
  FinancialsService,
  FinancialTransaction,
} from '../../core/financials/financials.service';
import { formatCurrency, formatDate } from '../../core/format';

export const routeMeta: RouteMeta = {
  title: 'Transactions · ShenoInventory',
};

const referenceLabels: Record<string, string> = {
  SalesOrder: 'Sales order',
  PurchaseOrder: 'Purchase order',
  Product: 'Product',
};

@Component({
  selector: 'app-transactions-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-heading text-2xl font-semibold text-white">Transactions</h1>
        <p class="mt-1 text-sm text-slate-400">
          {{ transactions().length }} financial movements recorded.
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
        <p class="text-sm font-medium text-slate-400">Income</p>
        <p class="mt-2 font-heading text-2xl font-semibold text-electric-cyan">{{ totalIncome() }}</p>
        <p class="mt-1 text-xs text-slate-500">Sum of income entries</p>
      </article>
      <article class="rounded-xl bg-surface p-6">
        <p class="text-sm font-medium text-slate-400">Expenses</p>
        <p class="mt-2 font-heading text-2xl font-semibold text-red-300">{{ totalExpenses() }}</p>
        <p class="mt-1 text-xs text-slate-500">Sum of expense entries</p>
      </article>
      <article class="rounded-xl bg-surface p-6">
        <p class="text-sm font-medium text-slate-400">Net balance</p>
        <p class="mt-2 font-heading text-2xl font-semibold" [class]="netBalanceClass()">
          {{ netBalance() }}
        </p>
        <p class="mt-1 text-xs text-slate-500">Income minus expenses</p>
      </article>
    </section>

    <section class="mt-6 overflow-hidden rounded-xl bg-surface">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-y border-white/5 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" class="px-6 py-3 font-medium">Type</th>
              <th scope="col" class="px-6 py-3 text-right font-medium">Amount</th>
              <th scope="col" class="px-6 py-3 font-medium">Date</th>
              <th scope="col" class="px-6 py-3 font-medium">Reference</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            @for (entry of transactions(); track entry.id) {
              <tr class="transition-colors hover:bg-deep-slate/60">
                <td class="px-6 py-4">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                    [class]="
                      entry.type === 'income'
                        ? 'bg-electric-cyan/10 text-electric-cyan'
                        : 'bg-red-500/10 text-red-300'
                    "
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3 w-3">
                      @if (entry.type === 'income') {
                        <path d="M12 19V5M5 12l7-7 7 7" />
                      } @else {
                        <path d="M12 5v14M5 12l7 7 7-7" />
                      }
                    </svg>
                    {{ entry.type === 'income' ? 'Income' : 'Expense' }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right font-medium" [class]="entry.type === 'income' ? 'text-electric-cyan' : 'text-red-300'">
                  {{ formatCurrency(entry.amount) }}
                </td>
                <td class="px-6 py-4 text-slate-300">{{ formatDate(entry.created_at) }}</td>
                <td class="px-6 py-4 text-slate-300">{{ referenceLabel(entry) }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4" class="px-6 py-10 text-center text-slate-500">
                  {{ loading() ? 'Loading transactions…' : 'No transactions recorded yet.' }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export default class TransactionsPage {
  private readonly financials = inject(FinancialsService);

  protected readonly transactions = signal<FinancialTransaction[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly totalIncome = computed(() => {
    const entries = this.transactions();
    const total = entries
      .filter((entry) => entry.type === 'income')
      .reduce((sum, entry) => sum + Number(entry.amount), 0);
    return entries.length === 0 ? '—' : formatCurrency(total);
  });

  protected readonly totalExpenses = computed(() => {
    const entries = this.transactions();
    const total = entries
      .filter((entry) => entry.type === 'expense')
      .reduce((sum, entry) => sum + Number(entry.amount), 0);
    return entries.length === 0 ? '—' : formatCurrency(total);
  });

  protected readonly netBalance = computed(() => {
    const entries = this.transactions();
    if (entries.length === 0) {
      return '—';
    }
    const income = entries
      .filter((entry) => entry.type === 'income')
      .reduce((sum, entry) => sum + Number(entry.amount), 0);
    const expenses = entries
      .filter((entry) => entry.type === 'expense')
      .reduce((sum, entry) => sum + Number(entry.amount), 0);
    return formatCurrency(income - expenses);
  });

  protected readonly netBalanceClass = computed(() => {
    const entries = this.transactions();
    let balance = 0;
    for (const entry of entries) {
      balance += entry.type === 'income' ? Number(entry.amount) : -Number(entry.amount);
    }
    return balance >= 0 ? 'text-electric-cyan' : 'text-red-300';
  });

  constructor() {
    afterNextRender(() => this.load());
  }

  protected load(force = false): void {
    this.loading.set(true);
    this.error.set(null);

    this.financials.getTransactions(force).subscribe({
      next: ({ transactions }) => {
        this.transactions.set(transactions);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(this.messageFor(error));
      },
    });
  }

  protected referenceLabel(entry: FinancialTransaction): string {
    if (entry.reference_type === null || entry.reference_id === null) {
      return '—';
    }

    const model = entry.reference_type.split('\\').pop() ?? '';
    const label = referenceLabels[model] ?? model;
    return `${label} #${entry.reference_id}`;
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

    return 'Unable to load transactions right now.';
  }
}