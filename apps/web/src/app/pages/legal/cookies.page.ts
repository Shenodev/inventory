import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouteMeta } from '@analogjs/router';
import { RouterLink } from '@angular/router';

export const routeMeta: RouteMeta = {
  title: 'Cookie Policy · ShenoInventory',
};

@Component({
  selector: 'app-cookies-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-3xl px-6 py-10">
      <a routerLink="/login" class="text-sm text-cyan-400 hover:text-cyan-300">← Back to sign in</a>
      <h1 class="mt-4 font-heading text-3xl font-semibold tracking-tight text-white">Cookie Policy</h1>
      <p class="mt-2 text-sm text-slate-400">Last updated: September 21, 2026</p>

      <div class="mt-6 overflow-hidden rounded-xl border border-white/10">
        <table class="w-full text-left text-sm">
          <thead class="bg-white/[0.04] text-xs uppercase tracking-wide text-slate-500">
            <tr><th class="px-4 py-3">Cookie</th><th class="px-4 py-3">Purpose</th><th class="px-4 py-3">Duration</th><th class="px-4 py-3">Type</th></tr>
          </thead>
          <tbody class="divide-y divide-white/5 text-slate-300">
            <tr><td class="px-4 py-3 font-mono text-xs">refresh_token</td><td class="px-4 py-3">Keeps you signed in (auth refresh)</td><td class="px-4 py-3">7 days</td><td class="px-4 py-3"><span class="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">Essential</span></td></tr>
            <tr><td class="px-4 py-3 font-mono text-xs">sheno.consent</td><td class="px-4 py-3">Your cookie choice</td><td class="px-4 py-3">6 months</td><td class="px-4 py-3"><span class="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">Essential</span></td></tr>
            <tr><td class="px-4 py-3 font-mono text-xs">_analytics (none currently)</td><td class="px-4 py-3">Would be non-essential analytics if ever added</td><td class="px-4 py-3">—</td><td class="px-4 py-3"><span class="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-400">Non-essential</span></td></tr>
          </tbody>
        </table>
      </div>

      <div class="mt-6 space-y-4 text-[14px] leading-relaxed text-slate-400">
        <p>We load <strong class="text-slate-200">no tracking or advertising cookies</strong> in the demo. Fonts are self-hosted via <span class="font-mono text-xs">@fontsource</span>; no Google Fonts CDN. If we ever add analytics, it will stay off until you click “Accept” in the banner.</p>
        <p>Change your choice anytime: open the banner again via the footer link and pick “Essential only”.</p>
      </div>

      <div class="mt-8 rounded-2xl border border-cyan-400/15 bg-cyan-400/10 p-5">
        <h2 class="font-semibold text-white">Manage cookies</h2>
        <p class="mt-1 text-sm text-slate-400">Current choice: <span class="font-medium text-white">{{ consentLabel() }}</span></p>
        <div class="mt-3 flex gap-2">
          <button type="button" (click)="setConsent('all')" class="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-medium text-[#07101e]">Accept all</button>
          <button type="button" (click)="setConsent('essential')" class="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200">Essential only</button>
        </div>
      </div>

      <div class="mt-8 flex gap-3 text-sm">
        <a routerLink="/legal/privacy" class="rounded-xl border border-white/10 px-4 py-2 text-slate-300 hover:text-white">Privacy</a>
        <a routerLink="/legal/licenses" class="rounded-xl border border-white/10 px-4 py-2 text-slate-300 hover:text-white">Licenses</a>
      </div>
    </div>
  `,
})
export default class CookiesPage {
  private key = 'sheno.consent';
  consent = signal<string | null>(typeof localStorage !== 'undefined' ? localStorage.getItem(this.key) : null);
  consentLabel() {
    const v = this.consent();
    return v === 'all' ? 'All (no extra trackers yet)' : v === 'essential' ? 'Essential only' : 'Not chosen';
  }
  setConsent(v: string) {
    localStorage.setItem(this.key, v);
    this.consent.set(v);
  }
}
