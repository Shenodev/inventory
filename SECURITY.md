# Security Hardening — ShenoInventory

This document maps the 19 requested controls to concrete code changes (following **security-and-hardening** skill + STRIDE threat model).

## Trust boundaries
Untrusted: HTTP requests, form fields, barcodes, file uploads, webhooks, third-party APIs. Assets: credentials, PII (customers), payment/financial data, inventory mutations.

## Implemented controls

| # | Control | Where | Notes |
|---|---------|-------|-------|
| 1 | Protect admin routes | `backend/routes/api.php` `prefix('admin')->middleware('role:admin')`, `app/Http/Middleware/EnsureRole.php`, frontend `role.guard.ts` | Defense in depth: client guard only hides UI; server returns 403 |
| 2 | Server-side permissions | `app/Policies/ProductPolicy.php`, `FinancialPolicy.php`, `AppServiceProvider::registerPolicies()`, `Gate::authorize` in controllers, `EnsureRole` middleware on writes | Least privilege: Operator read, Manager mutate inventory, Admin financials/users |
| 3 | Enable RLS | `config/rls.php` (RLS_ENABLED=true), policies + scopes | MySQL has no native RLS; app-level row policies enforced via Gates/Scopes. Ready to map to Postgres RLS if migrated to Supabase |
| 4 | Verify email | `User implements MustVerifyEmail`, `EmailVerificationController`, `routes /auth/email/verify*` with `signed` + `verified` middleware on dashboard | Link sent via `sendEmailVerificationNotification()`; audit `email_verified_at` |
| 5 | Hash passwords securely | `User casts password=>hashed`, `BCRYPT_ROUNDS=12`, `UserFactory` uses `Hash::make` | Never plaintext; argon2/bcrypt, env tunable |
| 6 | Tokens out of localStorage | `apps/web/src/app/core/auth/auth-session.store.ts` (in-memory only), backend sets `refresh_token` as `httpOnly, Secure, SameSite=Lax` cookie (`AuthController::login`), refresh reads cookie (`withCredentials`) | XSS cannot exfiltrate httpOnly cookie; access token 15m short-lived |
| 7 | Server-side API secrets | `backend/.env.example` secrets only in env, `apps/web/.env.example` only `VITE_API_BASE_URL` (non-secret), `config/cors.php` allowlist from env | No `VITE_*` secrets; `inventory.shenodev.tech` single origin |
| 8 | Hide .env from git | `/.gitignore` + `backend/.gitignore` + `.vercelignore` / `backend/.vercelignore` ignore `.env*`, `git ls-files` verifies no `.env` tracked, prior history clean | Secret that lands remote is rotated first |
| 9 | Sensitive data out of logs | `app/Logging/RedactSensitiveProcessor.php`, `config/logging.php` processors on `single`/`stderr`, `Log::info` in Auth redacts email to `hash`, webhook logs redacted | Keys: password, token, secret, cookie all `[REDACTED]` |
| 10 | Parameterized SQL | Eloquent `where('email', $email)` etc.; only fixed `DB::raw('quantity * cost')` with no interpolation | No string concatenation; grep confirms no `whereRaw` with input |
| 11 | Validate form inputs | All `FormRequest::rules()` strict: `email, max:255, regex`, `not_regex:/<[^>]*>/` for XSS, `exists:products,id` | 422 structured errors; frontend `Validators` mirrors |
| 12 | Block XSS | Backend: `not_regex` + output via `json` auto-escaping; Frontend: Angular auto-escaping, CSP in `vercel.json` (`default-src 'self'`), `SecurityHeaders` middleware (`X-Content-Type-Options nosniff`, `X-Frame-Options SAMEORIGIN`), `XSS:*` input rejected | No `innerHTML` with user data; `Sanitizer` allowlist if needed |
| 13 | Validate file uploads | `UploadFileRequest` allowlist `mimes:jpg,webp,csv`, `max:5120`, `purpose` enum, magic bytes via `File` rule, `authorize` via policy | Extension not trusted; size cap prevents DoS |
| 14 | Verify webhook signatures | `VerifyWebhookSignature` (`sha256=HMAC(payload, WEBHOOK_SECRET)`, `hash_equals`, timestamp ±300s), route `POST /api/webhooks/inventory` behind `webhook.signature` | Replay protection; secret from `WEBHOOK_SECRET` env |
| 15 | Rate limit | `bootstrap/app.php` + `AppServiceProvider` `RateLimiter::for('login')` 15/15min per email+ip, `api` 120/min per user/ip, `throttle:login`/`throttle:api` on routes, 429 JSON | Shared store via DB cache when scaled (not in-memory) |
| 16 | Tighten CORS | `config/cors.php`: `paths api/*`, `allowed_methods` explicit `GET,POST,PUT,PATCH,DELETE,OPTIONS`, `allowed_origins` strict allowlist from `CORS_ALLOWED_ORIGINS`, `allowed_headers` minimal including webhook headers, `supports_credentials=true` (for httpOnly cookie), never `*` | `*` with credentials rejected by design |
| 17 | Disable prod debugging | `config/app.php debug => (bool) env('APP_DEBUG', false)`, `.env.example APP_DEBUG=false`, `bootstrap/app.php` exception handler renders generic `Internal server error` in prod, no stack traces | `APP_ENV=production` + `LOG_LEVEL=error` |
| 18 | Update dependencies | `npm audit` (low esbuild dev-only GHSA-g7r4) + `composer` 11.56.1, documented deferral; no critical/high reachable; lockfiles authoritative, `npm install --frozen` in CI | `BCRYPT_ROUNDS` and `policy ignore-id` documented |
| 19 | Use security skill | `addyosmani/agent-skills@security-and-hardening` installed globally, STRIDE mapped, checklist in `references/hardening-patterns.md` consulted | Threat model first, three-tier boundaries applied |

## STRIDE quick map
Spoofing→Sanctum bearer + email verification + webhook HMAC; Tampering→HMAC + parameterized queries; Repudiation→audit `last_login_*` + `AuditController`; Information disclosure→RBAC + redacted logs + CSP; DoS→rate limit + size caps; Elevation→EnsureRole + Policies + RLS.

## Verification
- `npm test` — 25 tests pass (no auth bypass)
- `npm audit` — no high/critical reachable; low dev esbuild documented
- `curl -i` prod shows `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options` etc.
- Staged diff grep for secrets before push; history clean.

## Remaining hardening TODO (if you add features)
- Add 2FA for admin (TOTP) before deploy to real money movement.
- Move refresh cookie to `__Host-` prefix when domain is fully HTTPS.
- Add Postgres RLS migration when moving to Supabase.
