import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouteMeta } from '@analogjs/router';
import { RouterLink } from '@angular/router';

export const routeMeta: RouteMeta = {
  title: 'Refund Policy · ShenoInventory',
};

@Component({
  selector: 'app-refund-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-3xl px-6 py-10">
      <a routerLink="/login" class="text-sm text-cyan-400 hover:text-cyan-300">← Back to sign in</a>
      <h1 class="mt-4 font-heading text-3xl font-semibold tracking-tight text-white">Refund & Returns Policy</h1>
      <p class="mt-2 text-sm text-slate-400">Last updated: September 21, 2026 · For B2B inventory operations</p>

      <div class="mt-8 space-y-6 text-[14px] leading-relaxed text-slate-300">
        <section class="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
          <h2 class="font-semibold text-emerald-200">No hidden fees</h2>
          <p class="mt-1 text-emerald-100/80">Demo is free. Any future paid plan will disclose the full price including VAT/fees before you confirm. What you see is what you pay — no surprise add-ons.</p>
        </section>

        <section>
          <h2 class="font-semibold text-white">1. Physical returns (warehouse)</h2>
          <p class="mt-1 text-slate-400">If you received damaged stock, use the <span class="font-medium text-slate-200">Damages</span> flow to write off with a reason; for customer returns use <span class="font-medium text-slate-200">Returns</span> against the shipped sales order. Refunds are negative income transactions logged against the order. You can search/filter damages/returns by reason, order, customer, or date.</p>
        </section>

        <section>
          <h2 class="font-semibold text-white">2. SaaS demo refunds</h2>
          <p class="mt-1 text-slate-400">The demo has no charge, so there is nothing to refund. If a paid plan is introduced, you may cancel before the next billing cycle; refunds for partial periods are not issued unless required by law or the checkout explicitly says so.</p>
        </section>

        <section>
          <h2 class="font-semibold text-white">3. How to request</h2>
          <p class="mt-1 text-slate-400">For operational refunds: create a Return with reason; finance can verify via the Transactions ledger. For billing questions: email support&#64;shenodev.tech with subject “Refund request” and your tenant/period.</p>
        </section>

        <section>
          <h2 class="font-semibold text-white">4. No dark patterns / no fake reviews</h2>
          <p class="mt-1 text-slate-400">We do not auto-opt you into paid plans, hide cancel, or publish fake reviews. Reviews, if shown, are from real tenants with permission.</p>
        </section>

        <section>
          <h2 class="font-semibold text-white">5. Contact</h2>
          <address class="not-italic text-slate-400">Shenodev, 3 Warehouse Lane, Tallinn 10111, Estonia · support&#64;shenodev.tech</address>
        </section>
      </div>

      <div class="mt-10 flex gap-3 text-sm">
        <a routerLink="/legal/terms" class="rounded-xl border border-white/10 px-4 py-2 text-slate-300 hover:text-white">Terms</a>
        <a routerLink="/legal/privacy" class="rounded-xl border border-white/10 px-4 py-2 text-slate-300 hover:text-white">Privacy</a>
      </div>
    </div>
  `,
})
export default class RefundPage {}
