import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouteMeta } from '@analogjs/router';
import { Router } from '@angular/router';

import { AuthService } from '../core/auth/auth.service';

export const routeMeta: RouteMeta = {
  title: 'Sign in · ShenoInventory',
};

const DEMO_EMAIL = 'demo@shenodev.tech';
const DEMO_PASSWORD = 'password';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-screen bg-[#080E1E]">
      <!-- Left brand panel -->
      <div class="hidden w-[52%] flex-col justify-between border-r border-white/[0.06] bg-[#0B1224] p-10 lg:flex xl:p-12">
        <div>
          <a class="inline-flex items-center gap-3">
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-[0_8px_24px_rgba(34,211,238,0.35)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5"><path d="M3 7h13v10H3zM16 10h3l2 3v4h-5z" /></svg>
            </span>
            <span>
              <span class="block font-heading text-[16px] font-semibold text-white">ShenoInventory</span>
              <span class="block text-[11px] font-semibold tracking-[0.16em] text-slate-500">WAREHOUSE OS</span>
            </span>
          </a>

          <div class="mt-16 max-w-[560px]">
            <p class="inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold tracking-widest text-cyan-300">
              <span class="h-1.5 w-1.5 rounded-full bg-cyan-400"></span> BARCODE-NATIVE OPS
            </p>
            <h1 class="mt-4 font-heading text-[40px] font-semibold leading-[0.95] tracking-tight text-white xl:text-[44px]">
              Warehouse<br />
              <span class="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">that scans itself.</span>
            </h1>
            <p class="mt-4 max-w-[480px] text-[15px] leading-relaxed text-slate-400">
              Aisle/Bay/Shelf-accurate inventory with handheld wedge scanners, camera fallback, and instant valuation. Built for the floor, not just the desk.
            </p>

            <div class="mt-8 grid grid-cols-3 gap-3">
              <div class="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                <p class="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Location</p>
                <p class="mt-2 font-mono text-sm text-white">Aisle 4, Bay 3</p>
                <p class="font-mono text-sm text-cyan-300">Shelf B</p>
              </div>
              <div class="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                <p class="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Barcode</p>
                <p class="mt-2 font-mono text-xs text-white">5901234123457</p>
                <p class="mt-1 text-xs text-slate-500">EAN-13 wedge</p>
              </div>
              <div class="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                <p class="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Pick speed</p>
                <p class="mt-2 font-heading text-xl font-semibold text-white">3× faster*</p>
                <p class="text-xs text-slate-500">*lab estimate vs dropdown; your results vary</p>
              </div>
            </div>
          </div>
        </div>

        <p class="text-xs text-slate-600">Trusted by ops teams · Sanctum-secured · Live sync</p>
      </div>

      <!-- Right form -->
      <div class="flex flex-1 items-center justify-center bg-[radial-gradient(800px_400px_at_50%_-10%,rgba(34,211,238,0.08),transparent_60%)] px-4 py-10 sm:px-6">
        <div class="w-full max-w-[420px] rounded-2xl border border-white/[0.07] bg-[#111E32] p-7 shadow-[0_16px_48px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-8">
          <div class="flex items-center gap-3 lg:hidden">
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5"><path d="M3 7h13v10H3zM16 10h3l2 3v4h-5z" /></svg>
            </span>
            <span class="font-heading text-[16px] font-semibold text-white">ShenoInventory</span>
            <span class="ml-auto rounded-full bg-cyan-400/10 px-2 py-1 text-[10px] font-semibold tracking-widest text-cyan-300">WAREHOUSE OS</span>
          </div>

          <h2 class="mt-6 font-heading text-[22px] font-semibold tracking-tight text-white">Sign in</h2>
          <p class="mt-1 text-sm text-slate-400">Warehouse & order management · demo credentials pre-filled</p>

          @if (sessionExpired) {
            <p class="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200" role="status">
              Your session expired. Please sign in again.
            </p>
          }

          <form class="mt-6" [formGroup]="form" (ngSubmit)="submit()">
            <label class="block text-xs font-semibold uppercase tracking-widest text-slate-400" for="email">Email</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              autocomplete="username"
              placeholder="you@example.com"
              class="mt-2 w-full rounded-xl border border-white/10 bg-[#080E1E] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40 focus:ring-4 focus:ring-cyan-400/10"
            />

            <label class="mt-4 block text-xs font-semibold uppercase tracking-widest text-slate-400" for="password">Password</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              autocomplete="current-password"
              placeholder="Password"
              class="mt-2 w-full rounded-xl border border-white/10 bg-[#080E1E] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40 focus:ring-4 focus:ring-cyan-400/10"
            />

            @if (error(); as message) {
              <p class="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">{{ message }}</p>
            }

            <button
              type="submit"
              [disabled]="submitting()"
              class="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-3 text-sm font-semibold text-[#07101e] shadow-[0_8px_20px_rgba(34,211,238,0.35)] transition hover:from-cyan-300 hover:to-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ submitting() ? 'Signing in…' : 'Sign in →' }}
            </button>

            <button
              type="button"
              [disabled]="submitting()"
              (click)="loginAsDemo()"
              class="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-60"
            >
              Login as Demo
            </button>
            <p class="mt-4 text-center text-[11px] leading-relaxed text-slate-500">
              By signing in you agree to our <a href="/legal/terms" class="underline decoration-white/20 underline-offset-2 hover:text-slate-300">Terms</a> and <a href="/legal/privacy" class="underline decoration-white/20 underline-offset-2 hover:text-slate-300">Privacy</a>. · <a href="/legal/cookies" class="underline decoration-white/20 underline-offset-2 hover:text-slate-300">Cookies</a> · Shenodev, 3 Warehouse Lane, Tallinn 10111, Estonia
            </p>
          </form>
        </div>
      </div>
    </div>
  `,
})
export default class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly sessionExpired =
    this.router.parseUrl(this.router.url).queryParams['session'] === 'expired';

  protected readonly form = this.formBuilder.group({
    email: [DEMO_EMAIL, [Validators.required, Validators.email]],
    password: [DEMO_PASSWORD, [Validators.required]],
  });

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.authenticate(this.form.getRawValue());
  }

  protected loginAsDemo(): void {
    const credentials = { email: DEMO_EMAIL, password: DEMO_PASSWORD };

    this.form.setValue(credentials);
    this.authenticate(credentials);
  }

  private authenticate(credentials: { email: string; password: string }): void {
    if (this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    this.auth.login(credentials.email, credentials.password).subscribe({
      next: () => void this.router.navigateByUrl('/'),
      error: (error: unknown) => {
        this.submitting.set(false);
        this.error.set(this.messageFor(error));
      },
    });
  }

  private messageFor(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        return 'Incorrect email or password.';
      }
      if (error.status === 429) {
        return 'Too many attempts. Please try again shortly.';
      }
      if (error.status === 0) {
        return 'Cannot reach the server. Please try again.';
      }
    }

    return 'Something went wrong. Please try again.';
  }
}
