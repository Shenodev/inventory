# Third-Party SDK Audit — ShenoInventory

**Date:** 2026-09-21  
**Auditor:** Automated + manual (package.json, composer.json, network panel)

## Summary
No tracking, ads, maps, or payment SDKs are loaded in production. Fonts are self-hosted. All SDKs are MIT/OFL. No unnecessary data sharing.

| SDK / Asset | Version (pinned) | License | Purpose | Data sent | Consent needed |
|---|---|---|---|---|---|
| Angular 22, AnalogJS 2.7, RxJS 7.8, Tailwind 4 | lockfile | MIT | Web app | None (self-hosted) | Essential |
| @fontsource-variable/sora, inter | 5.2.5 | OFL 1.1 | Typography | None (self-hosted, no Google CDN) | Essential |
| marked, prismjs, front-matter | 15/1.29/4 | MIT | Docs | None | Essential |
| Laravel 11.56, Sanctum 4.3 | composer.lock | MIT | API | Auth to own Aiven MySQL TLS | Essential |
| Aiven MySQL | managed | — | DB | Inventory rows (tenant) TLS required | Essential |
| Vercel (host) | — | — | Deploy | Build logs redacted | Essential |

**Removed / Not present:** Google Fonts CDN (replaced by @fontsource), Google Analytics, Stripe, Ad networks, Mapbox, payment JS.

**Process:** Before adding a new SDK, open `docs/THIRD_PARTY_AUDIT.md`, add row with license, data sent, and legal basis. CI fails if `package.json` diff adds a new top-level dep without doc entry (manual review).

**Fonts/images license:** Sora/Inter via @fontsource OFL — see `/legal/licenses`. Product images are placeholders; replace with your own licensed assets before production.

**Unsubscribe:** All emails include `List-Unsubscribe` and `List-Unsubscribe-Post` headers pointing to `/api/unsubscribe`.

