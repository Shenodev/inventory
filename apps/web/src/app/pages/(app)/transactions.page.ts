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

import { roleGuard } from '../../core/auth/role.guard';
import {
  FinancialsService,
  FinancialTransaction,
} from '../../core/financials/financials.service';
import { formatCurrency, formatDate } from '../../core/format';

export const routeMeta: RouteMeta = {
  title: 'Transactions · ShenoInventory',
  meta: [
    {
      name: 'description',
      content: 'Financial ledger — income, expenses and net balance behind every dashboard number.',
    },
  ],
  canActivate: [roleGuard],
  data: { roles: ['admin', 'manager'] },
};

const referenceLabels: Record<string, string> = {
  SalesOrder: 'Sales order',
  PurchaseOrder: 'Purchase order',
  Product: 'Product',
};

type TxFilter = 'all' | 'income' | 'expense';

@Component({
  selector: 'app-transactions-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-heading text-2xl font-semibold text-white">Transactions</h1>
        <p class="mt-1 text-sm text-slate-400">
          {{ filteredTransactions().length }} of {{ transactions().length }} financial movements.
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
        <p class="mt-1 text-xs text-slate-500">Filtered income</p>
      </article>
      <article class="rounded-xl bg-surface p-6">
        <p class="text-sm font-medium text-slate-400">Expenses</p>
        <p class="mt-2 font-heading text-2xl font-semibold text-red-300">{{ totalExpenses() }}</p>
        <p class="mt-1 text-xs text-slate-500">Filtered expenses</p>
      </article>
      <article class="rounded-xl bg-surface p-6">
        <p class="text-sm font-medium text-slate-400">Net balance</p>
        <p class="mt-2 font-heading text-2xl font-semibold" [class]="netBalanceClass()">
          {{ netBalance() }}
        </p>
        <p class="mt-1 text-xs text-slate-500">Income minus expenses (filtered)</p>
      </article>
    </section>

    <div class="mt-6 flex flex-wrap items-center gap-3">
      <label class="relative flex min-w-0 flex-1 items-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="pointer-events-none absolute left-3 h-4 w-4 text-slate-500">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.4-3.4" />
        </svg>
        <input
          type="search"
          placeholder="Search by amount, reference or type…"
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
      <span class="text-sm text-slate-500">{{ filteredTransactions().length }} of {{ transactions().length }}</span>
    </div>

    <div class="mt-3 flex flex-wrap items-center gap-2">
      <button type="button" (click)="setType('all')" [class]="typeChip('all')">All</button>
      <button type="button" (click)="setType('income')" [class]="typeChip('income')">Income</button>
      <button type="button" (click)="setType('expense')" [class]="typeChip('expense')">Expense</button>
      <span class="mx-2 h-6 w-px bg-white/10"></span>
      <label class="text-xs text-slate-500">From</label>
      <input type="date" [value]="dateFrom()" (change)="onDateFrom($event)" class="rounded-xl border border-white/10 bg-surface px-3 py-1.5 text-xs text-white outline-none focus:border-electric-cyan" />
      <label class="text-xs text-slate-500">To</label>
      <input type="date" [value]="dateTo()" (change)="onDateTo($event)" class="rounded-xl border border-white/10 bg-surface px-3 py-1.5 text-xs text-white outline-none focus:border-electric-cyan" />
      @if (dateFrom() || dateTo()) {
        <button type="button" (click)="clearDates()" class="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:text-white">Clear dates</button>
      }
    </div>

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
            @for (entry of filteredTransactions(); track entry.id) {
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
                  {{ loading() ? 'Loading transactions…' : (query() || type() !== 'all' || dateFrom() || dateTo() ? 'No transactions match your filters.' : 'No transactions recorded yet.') }}
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

  protected readonly query = signal('');
  protected readonly type = signal<TxFilter>('all');
  protected readonly dateFrom = signal('');
  protected readonly dateTo = signal('');

  protected readonly filteredTransactions = computed(() => {
    const needle = this.query().trim().toLowerCase();
    const t = this.type();
    const from = this.dateFrom() ? new Date(this.dateFrom()) : null;
    const to = this.dateTo() ? new Date(this.dateTo()) : null;
    if (to) to.setHours(23, 59, 59, 999);
    return this.transactions().filter((entry) => {
      if (t !== 'all' && entry.type !== t) return false;
      if (needle) {
        const ref = this.referenceLabel(entry).toLowerCase();
        const hay = `${entry.type} ${entry.amount} ${ref}`.toLowerCase();
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

  protected readonly totalIncome = computed(() => {
    const entries = this.filteredTransactions();
    const total = entries
      .filter((entry) => entry.type === 'income')
      .reduce((sum, entry) => sum + Number(entry.amount), 0);
    return entries.length === 0 ? '—' : formatCurrency(total);
  });

  protected readonly totalExpenses = computed(() => {
    const entries = this.filteredTransactions();
    const total = entries
      .filter((entry) => entry.type === 'expense')
      .reduce((sum, entry) => sum + Number(entry.amount), 0);
    return entries.length === 0 ? '—' : formatCurrency(total);
  });

  protected readonly netBalance = computed(() => {
    const entries = this.filteredTransactions();
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
    const entries = this.filteredTransactions();
    let balance = 0;
    for (const entry of entries) {
      balance += entry.type === 'income' ? Number(entry.amount) : -Number(entry.amount);
    }
    return balance >= 0 ? 'text-electric-cyan' : 'text-red-300';
  });

  constructor() {
    afterNextRender(() => this.load());
  }

  protected onQuery(event: Event): void { this.query.set((event.target as HTMLInputElement).value); }
  protected setType(v: TxFilter): void { this.type.set(v); }
  protected onDateFrom(event: Event): void { this.dateFrom.set((event.target as HTMLInputElement).value); }
  protected onDateTo(event: Event): void { this.dateTo.set((event.target as HTMLInputElement).value); }
  protected clearDates(): void { this.dateFrom.set(''); this.dateTo.set(''); }

  protected typeChip(t: TxFilter): string {
    const active = this.type() === t;
    return active
      ? 'rounded-xl border border-electric-cyan/40 bg-electric-cyan/10 px-4 py-2 text-xs font-medium text-electric-cyan'
      : 'rounded-xl border border-white/10 bg-surface px-4 py-2 text-xs font-medium text-slate-400 hover:text-white';
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

      if (error.status === 403) {
        return 'Your role does not have access to financial transactions.';
      }

      if (error.status === 0) {
        return 'Cannot reach the server. Please try again.';
      }
    }

    return 'Unable to load transactions right now.';
  }
}
