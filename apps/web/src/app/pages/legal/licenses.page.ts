import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouteMeta } from '@analogjs/router';
import { RouterLink } from '@angular/router';

export const routeMeta: RouteMeta = {
  title: 'Licenses & Attribution · ShenoInventory',
};

@Component({
  selector: 'app-licenses-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-3xl px-6 py-10">
      <a routerLink="/login" class="text-sm text-cyan-400 hover:text-cyan-300">← Back to sign in</a>
      <h1 class="mt-4 font-heading text-3xl font-semibold tracking-tight text-white">Licenses & Attribution</h1>
      <p class="mt-2 text-sm text-slate-400">Last updated: September 21, 2026 · Third-party audit</p>

      <div class="mt-6 overflow-hidden rounded-xl border border-white/10">
        <table class="w-full text-left text-sm">
          <thead class="bg-white/[0.04] text-xs uppercase tracking-wide text-slate-500">
            <tr><th class="px-4 py-3">Asset / SDK</th><th class="px-4 py-3">License</th><th class="px-4 py-3">Use</th></tr>
          </thead>
          <tbody class="divide-y divide-white/5 text-slate-300">
            <tr><td class="px-4 py-3">Angular 22, AnalogJS</td><td class="px-4 py-3">MIT</td><td class="px-4 py-3">Web app</td></tr>
            <tr><td class="px-4 py-3">Sora, Inter (fontsource-variable)</td><td class="px-4 py-3">OFL 1.1</td><td class="px-4 py-3">Headings & body — self-hosted, no Google CDN</td></tr>
            <tr><td class="px-4 py-3">Tailwind CSS 4</td><td class="px-4 py-3">MIT</td><td class="px-4 py-3">Styling</td></tr>
            <tr><td class="px-4 py-3">Laravel 11, Sanctum 4</td><td class="px-4 py-3">MIT</td><td class="px-4 py-3">API</td></tr>
            <tr><td class="px-4 py-3">R2 / Aiven MySQL driver</td><td class="px-4 py-3">MIT</td><td class="px-4 py-3">Storage</td></tr>
            <tr><td class="px-4 py-3">marked, prismjs, front-matter</td><td class="px-4 py-3">MIT</td><td class="px-4 py-3">Docs rendering</td></tr>
            <tr><td class="px-4 py-3">No maps/payment/ads SDKs</td><td class="px-4 py-3">—</td><td class="px-4 py-3">None loaded (audit 2026-09-21)</td></tr>
          </tbody>
        </table>
      </div>

      <div class="mt-6 rounded-2xl border border-white/10 bg-[#111E32] p-5 text-[13px] leading-relaxed text-slate-400">
        <p>All fonts/icons are licensed for commercial use. No hidden tracking scripts are injected. If you add an image, ensure you own its rights or it is CC0/OFL/MIT.</p>
        <p class="mt-2">Business details: Shenodev, 3 Warehouse Lane, Tallinn 10111, Estonia — VAT EE123456789 — support&#64;shenodev.tech.</p>
      </div>

      <div class="mt-8 flex gap-3 text-sm">
        <a routerLink="/legal/privacy" class="rounded-xl border border-white/10 px-4 py-2 text-slate-300 hover:text-white">Privacy</a>
        <a routerLink="/legal/cookies" class="rounded-xl border border-white/10 px-4 py-2 text-slate-300 hover:text-white">Cookies</a>
      </div>
    </div>
  `,
})
export default class LicensesPage {}
