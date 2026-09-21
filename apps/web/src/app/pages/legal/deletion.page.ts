import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouteMeta } from '@analogjs/router';
import { RouterLink } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../core/api.base-url';

export const routeMeta: RouteMeta = {
  title: 'Data Deletion Request · ShenoInventory',
};

@Component({
  selector: 'app-deletion-page',
  imports: [RouterLink, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-3xl px-6 py-10">
      <a routerLink="/login" class="text-sm text-cyan-400 hover:text-cyan-300">← Back to sign in</a>
      <h1 class="mt-4 font-heading text-3xl font-semibold tracking-tight text-white">Data deletion request</h1>
      <p class="mt-2 text-sm text-slate-400">Request export or deletion of your tenant’s data. We respond within 30 days.</p>

      @if (done(); as msg) {
        <div class="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{{ msg }}</div>
      }

      <form class="mt-6 rounded-2xl border border-white/10 bg-[#111E32] p-6" [formGroup]="form" (ngSubmit)="submit()">
        <label class="block text-xs font-semibold uppercase tracking-widest text-slate-400" for="email">Your email (for verification)</label>
        <input id="email" formControlName="email" type="email" placeholder="you@company.com" class="mt-2 w-full rounded-xl border border-white/10 bg-[#080E1E] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40" />

        <label class="mt-4 block text-xs font-semibold uppercase tracking-widest text-slate-400" for="type">Request</label>
        <select id="type" formControlName="type" class="mt-2 w-full rounded-xl border border-white/10 bg-[#080E1E] px-4 py-3 text-sm text-white">
          <option value="deletion">Delete my account & all my customers/suppliers I created</option>
          <option value="export">Export my data (JSON)</option>
        </select>

        <label class="mt-4 flex items-start gap-2 text-sm text-slate-300">
          <input type="checkbox" formControlName="confirm" class="mt-1 h-4 w-4 rounded border-white/20 bg-[#080E1E]" />
          <span>I confirm I control this email and understand deletion is irreversible and also clears backups within 30 days. I am 16 or older.</span>
        </label>

        @if (error(); as e) {
          <p class="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{{ e }}</p>
        }

        <button type="submit" [disabled]="form.invalid || saving()" class="mt-6 w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-[#07101e] disabled:opacity-50">
          {{ saving() ? 'Sending…' : 'Submit request' }}
        </button>

        <p class="mt-3 text-xs text-slate-500">Or email directly: privacy&#64;shenodev.tech with subject “Deletion — your email”.</p>
      </form>

      <div class="mt-6 text-[13px] leading-relaxed text-slate-400">
        <h2 class="font-semibold text-white">What happens next</h2>
        <p class="mt-1">We verify by email, delete app rows, clear caches/logs (14-day retention), and confirm. Unsubscribe from any product emails is one-click via the link at the bottom of each message.</p>
      </div>
    </div>
  `,
})
export default class DeletionPage {
  private fb = inject(NonNullableFormBuilder);
  private http = inject(HttpClient);
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    type: ['deletion' as const, [Validators.required]],
    confirm: [false, [Validators.requiredTrue]],
  });
  saving = signal(false);
  done = signal<string | null>(null);
  error = signal<string | null>(null);

  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set(null);
    const { email, type } = this.form.getRawValue();
    this.http.post(`${API_BASE_URL}/account/data-request`, { email, type }).subscribe({
      next: (res: any) => {
        this.saving.set(false);
        this.done.set(res.message ?? 'Request received — check your email to confirm.');
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.message ?? 'Unable to submit. Email privacy@shenodev.tech directly.');
      },
    });
  }
}
