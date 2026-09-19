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
    <div class="flex min-h-screen items-center justify-center px-4">
      <div class="w-full max-w-sm rounded-xl bg-surface p-8 text-left">
        <div class="flex flex-col items-center gap-3 text-center">
          <img
            src="/favicon-192x192.png"
            alt="ShenoInventory"
            width="56"
            height="56"
            class="h-14 w-14 rounded-xl"
          />
          <div>
            <h1 class="font-heading text-2xl font-semibold text-white">
              ShenoInventory
            </h1>
            <p class="mt-1 text-sm text-slate-400">
              Warehouse &amp; order management
            </p>
          </div>
        </div>

        @if (sessionExpired) {
          <p
            class="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200"
            role="status"
          >
            Your session expired. Please sign in again.
          </p>
        }

        <form class="mt-8" [formGroup]="form" (ngSubmit)="submit()">
          <label class="block text-sm font-medium text-slate-300" for="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            formControlName="email"
            autocomplete="username"
            placeholder="you@example.com"
            class="mt-1 w-full rounded-xl border border-white/10 bg-deep-slate px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-electric-cyan"
          />

          <label
            class="mt-4 block text-sm font-medium text-slate-300"
            for="password"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            formControlName="password"
            autocomplete="current-password"
            placeholder="Password"
            class="mt-1 w-full rounded-xl border border-white/10 bg-deep-slate px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-electric-cyan"
          />

          @if (error(); as message) {
            <p
              class="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              role="alert"
            >
              {{ message }}
            </p>
          }

          <button
            type="submit"
            [disabled]="submitting()"
            class="mt-6 w-full rounded-xl bg-electric-cyan px-4 py-3 font-medium text-deep-slate transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ submitting() ? 'Signing in…' : 'Sign in' }}
          </button>

          <button
            type="button"
            [disabled]="submitting()"
            (click)="loginAsDemo()"
            class="mt-3 w-full rounded-xl border border-electric-cyan/40 px-4 py-3 font-medium text-electric-cyan transition-colors hover:bg-electric-cyan/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Login as Demo
          </button>
        </form>
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
