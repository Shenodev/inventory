import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouteMeta } from '@analogjs/router';
import { RouterLink } from '@angular/router';

export const routeMeta: RouteMeta = {
  title: 'Terms of Service · ShenoInventory',
  meta: [
    {
      name: 'description',
      content: 'Terms of service for ShenoInventory — acceptable use, duties, fees and termination conditions.',
    },
  ],
};

@Component({
  selector: 'app-terms-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-3xl px-6 py-10">
      <a routerLink="/login" class="text-sm text-cyan-400 hover:text-cyan-300">← Back to sign in</a>
      <nav aria-label="Breadcrumb" class="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
        <a routerLink="/login" class="hover:text-cyan-300">Home</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page" class="text-slate-300">Legal · Terms of Service</span>
      </nav>
      <h1 class="mt-4 font-heading text-3xl font-semibold tracking-tight text-white">Terms of Service</h1>
      <p class="mt-2 text-sm text-slate-400">Last updated: September 21, 2026 · Shenodev</p>

      <div class="mt-8 space-y-6 text-[14px] leading-relaxed text-slate-300">
        <section>
          <h2 class="font-semibold text-white">1. Who we are</h2>
          <p class="mt-1 text-slate-400">ShenoInventory is operated by Shenodev (“we”), 3 Warehouse Lane, Tallinn 10111, Estonia. Contact: support&#64;shenodev.tech. This is demo single-tenant software; not a consumer marketplace.</p>
        </section>
        <section>
          <h2 class="font-semibold text-white">2. What you get</h2>
          <p class="mt-1 text-slate-400">Warehouse inventory, barcode scanning (EAN-13), purchase/sales orders, damages/returns, and financial overview. Uptime is best-effort for the demo. No SLA is claimed unless you have a signed order.</p>
        </section>
        <section>
          <h2 class="font-semibold text-white">3. Your duties</h2>
          <ul class="mt-1 list-disc pl-5 text-slate-400">
            <li>Keep credentials secret; you are responsible for actions under your account.</li>
            <li>Only enter data you have a right to process. Do not enter children’s data (under 16) – see Privacy.</li>
            <li>No reverse-engineering, no abuse of rate limits, no scraping.</li>
          </ul>
        </section>
        <section>
          <h2 class="font-semibold text-white">4. Pricing & fees — no hidden fees</h2>
          <p class="mt-1 text-slate-400">Demo is free with no hidden charges. Any future paid plan will show the full price including VAT before you confirm, with no surprise add-ons. No dark patterns: cancel is via account deletion request, not hidden.</p>
        </section>
        <section>
          <h2 class="font-semibold text-white">5. No fake reviews / no unsupported claims</h2>
          <p class="mt-1 text-slate-400">We do not publish fake reviews or inflated metrics. Any performance claim (e.g., “3× faster picking”) is a lab estimate; real results vary. No SOC2/ISO badges are shown without a linked audit letter.</p>
        </section>
        <section>
          <h2 class="font-semibold text-white">6. Termination</h2>
          <p class="mt-1 text-slate-400">You can request deletion via <a routerLink="/legal/deletion" class="text-cyan-400 underline">Data deletion</a>. We may suspend accounts that abuse security controls.</p>
        </section>
        <section>
          <h2 class="font-semibold text-white">7. Contact</h2>
          <address class="not-italic text-slate-400">Shenodev, 3 Warehouse Lane, Tallinn 10111, Estonia · support&#64;shenodev.tech · VAT EE123456789</address>
        </section>
      </div>

      <div class="mt-10 flex gap-3 text-sm">
        <a routerLink="/legal/privacy" class="rounded-xl border border-white/10 px-4 py-2 text-slate-300 hover:text-white">Privacy</a>
        <a routerLink="/legal/refund" class="rounded-xl border border-white/10 px-4 py-2 text-slate-300 hover:text-white">Refund</a>
      </div>
    </div>
  `,
})
export default class TermsPage {}
