import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouteMeta } from '@analogjs/router';
import { RouterLink } from '@angular/router';

export const routeMeta: RouteMeta = {
  title: 'Privacy Policy · ShenoInventory',
  meta: [
    {
      name: 'description',
      content: 'Privacy policy for ShenoInventory — what data we collect, why, and how you can delete it.',
    },
  ],
};

@Component({
  selector: 'app-privacy-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-3xl px-6 py-10">
      <a routerLink="/login" class="text-sm text-cyan-400 hover:text-cyan-300">← Back to sign in</a>
      <nav aria-label="Breadcrumb" class="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
        <a routerLink="/login" class="hover:text-cyan-300">Home</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page" class="text-slate-300">Legal · Privacy Policy</span>
      </nav>
      <h1 class="mt-4 font-heading text-3xl font-semibold tracking-tight text-white">Privacy Policy</h1>
      <p class="mt-2 text-sm text-slate-400">Last updated: September 21, 2026 · ShenoInventory (Shenodev) · Contact: privacy&#64;shenodev.tech</p>

      <div class="mt-8 space-y-7 text-[14px] leading-relaxed text-slate-300">
        <section class="rounded-2xl border border-white/10 bg-[#111E32] p-6">
          <h2 class="font-heading text-lg font-semibold text-white">Snapshot</h2>
          <p class="mt-2 text-slate-400">ShenoInventory is a single-tenant warehouse OS for operators. We collect only what is needed to run inventory: account credentials, customer/supplier contact details you enter, and operational logs. No tracking, no ads, no sale of data. Data lives in Aiven MySQL (EU) and is accessed only by your tenant.</p>
        </section>

        <section>
          <h2 class="font-semibold text-white">1. What we collect (and why)</h2>
          <ul class="mt-2 list-disc space-y-1 pl-5 text-slate-400">
            <li><span class="text-slate-200">Account</span>: name, email, password hash (bcrypt 12), role, last login IP/time — to authenticate and audit.</li>
            <li><span class="text-slate-200">Customers / suppliers you create</span>: name, email, phone — to fulfill sales/purchase orders. Email & phone are optional.</li>
            <li><span class="text-slate-200">Operational</span>: products, stock movements, damages/returns — your inventory ledger.</li>
            <li><span class="text-slate-200">Technical</span>: minimal cookies (auth refresh httpOnly), rate-limit counters, error logs with redacted secrets.</li>
          </ul>
          <p class="mt-2 text-amber-200/90 text-xs">No unnecessary data: we do not collect birthdays, government IDs, or biometric data. Do not enter such data in free-form notes.</p>
        </section>

        <section>
          <h2 class="font-semibold text-white">2. Legal basis (EEA) & age</h2>
          <p class="mt-1 text-slate-400">Contract (providing the inventory service), legitimate interest (security, rate limiting), and consent where you check a box. Service is not directed to children under 16. If you are under 16, do not create an account; if we learn a child’s data was entered, we delete it. Guardians contact privacy&#64;shenodev.tech.</p>
        </section>

        <section>
          <h2 class="font-semibold text-white">3. Third-party SDKs</h2>
          <p class="mt-1 text-slate-400">Audit 2026-09-21: Front-end — Angular 22, AnalogJS, Tailwind, @fontsource (Sora/Inter), RxJS, marked/prism (docs). Back-end — Laravel 11, Sanctum (auth), Aiven MySQL with TLS. No analytics, ads, maps, or payment SDKs are loaded. See <a routerLink="/legal/licenses" class="text-cyan-400 underline">Licenses</a> for attributions.</p>
        </section>

        <section>
          <h2 class="font-semibold text-white">4. Cookies</h2>
          <p class="mt-1 text-slate-400">Essential only: <span class="font-mono text-xs">refresh_token</span> (httpOnly, Secure, SameSite=Lax, 7d) and <span class="font-mono text-xs">XSRF/session</span> if enabled. No advertising/tracking cookies. You can block non-essential cookies in the <a routerLink="/legal/cookies" class="text-cyan-400 underline">Cookie Policy</a>. Use the banner to withdraw analytics consent (currently none are loaded).</p>
        </section>

        <section>
          <h2 class="font-semibold text-white">5. Your rights & deletion</h2>
          <p class="mt-1 text-slate-400">Access, correction, deletion, portability, and objection. Use <a routerLink="/legal/deletion" class="text-cyan-400 underline">Data deletion request</a> or email privacy&#64;shenodev.tech. We delete from app DB, caches and logs (retention 14 days) and confirm by email. Backups expire in 30 days.</p>
        </section>

        <section>
          <h2 class="font-semibold text-white">6. Contact & business details</h2>
          <address class="mt-1 not-italic text-slate-400">
            Shenodev — ShenoInventory Warehouse OS<br />
            Email: support&#64;shenodev.tech · Privacy: privacy&#64;shenodev.tech<br />
            Address (demo): 3 Warehouse Lane, Tallinn 10111, Estonia · VAT EE123456789<br />
            Data protection: privacy&#64;shenodev.tech (response within 30 days)
          </address>
        </section>

        <p class="text-xs text-slate-500">This policy does not create unsupported claims about certification. No SOC2/ISO claim is made unless you see a badge linked to a report.</p>
      </div>

      <div class="mt-10 flex gap-3 text-sm">
        <a routerLink="/legal/terms" class="rounded-xl border border-white/10 px-4 py-2 text-slate-300 hover:text-white">Terms</a>
        <a routerLink="/legal/cookies" class="rounded-xl border border-white/10 px-4 py-2 text-slate-300 hover:text-white">Cookies</a>
        <a routerLink="/legal/refund" class="rounded-xl border border-white/10 px-4 py-2 text-slate-300 hover:text-white">Refund</a>
      </div>
    </div>
  `,
})
export default class PrivacyPage {}
