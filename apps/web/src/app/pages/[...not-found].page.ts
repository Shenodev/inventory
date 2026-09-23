import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouteMeta } from '@analogjs/router';
import { RouterLink } from '@angular/router';

export const routeMeta: RouteMeta = {
  title: 'Page Not Found · ShenoInventory',
  meta: [
    {
      name: 'description',
      content: 'This page does not exist. Head back to the ShenoInventory sign-in screen.',
    },
  ],
};

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-dvh items-center justify-center bg-[#080E1E] px-6">
      <div class="w-full max-w-md text-center">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 shadow-[0_8px_24px_rgba(34,211,238,0.35)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="#07101e" stroke-width="1.8" class="h-7 w-7">
            <path d="M3 7h13v10H3zM16 10h3l2 3v4h-5z" />
          </svg>
        </div>
        <p class="mt-6 font-mono text-6xl font-semibold tracking-tight text-cyan-300">404</p>
        <h1 class="mt-3 font-heading text-2xl font-semibold tracking-tight text-white">Aisle emptied, label missing</h1>
        <p class="mt-2 text-sm leading-relaxed text-slate-400">
          This page doesn’t exist or has been moved. Double-check the address, or head back to sign in.
        </p>
        <div class="mt-8 flex flex-col gap-3">
          <a
            routerLink="/"
            class="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-3 text-sm font-semibold text-[#07101e] shadow-[0_8px_20px_rgba(34,211,238,0.35)] transition hover:from-cyan-300 hover:to-blue-400"
          >
            Back to sign in
          </a>
          <a routerLink="/legal/terms" class="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/[0.06]">
            Terms of service
          </a>
        </div>
      </div>
    </div>
  `,
})
export default class NotFoundPage {}