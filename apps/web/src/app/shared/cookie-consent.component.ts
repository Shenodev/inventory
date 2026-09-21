import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

const KEY = 'sheno.consent';

type Consent = 'essential' | 'all' | null;

@Component({
  selector: 'app-cookie-consent',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div class="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[1500px] px-4 pb-4 sm:px-6 lg:px-8" role="dialog" aria-label="Cookie consent">
        <div class="rounded-2xl border border-white/10 bg-[#111E32]/95 px-5 py-4 shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0">
              <p class="text-sm font-medium text-white">We use minimal cookies</p>
              <p class="mt-1 text-xs leading-relaxed text-slate-400">Essential only to keep you signed in (<span class="font-mono">refresh_token</span> httpOnly). No tracking. See <a routerLink="/legal/cookies" class="underline decoration-white/20 underline-offset-2 hover:text-white">Cookie Policy</a> and <a routerLink="/legal/privacy" class="underline decoration-white/20 underline-offset-2 hover:text-white">Privacy</a>.</p>
            </div>
            <div class="flex shrink-0 gap-2">
              <button type="button" (click)="choose('essential')" class="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10">Essential only</button>
              <button type="button" (click)="choose('all')" class="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-[#07101e]">Accept all</button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class CookieConsentComponent {
  private stored = signal<Consent>(this.read());
  visible = computed(() => this.stored() === null);
  private read(): Consent {
    try {
      const v = localStorage.getItem(KEY);
      return v === 'all' || v === 'essential' ? v : null;
    } catch {
      return null;
    }
  }
  choose(v: 'essential' | 'all') {
    try {
      localStorage.setItem(KEY, v);
    } catch {}
    this.stored.set(v);
  }
}
