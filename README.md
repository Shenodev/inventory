# ShenoInventory

Monorepo for the ShenoInventory product (single-tenant, demo-ready).

| Project  | Stack                      | Domain                         | Vercel project root directory |
| -------- | -------------------------- | ------------------------------ | ----------------------------- |
| Web app  | Analog.js (Angular 22)     | `https://inventory.shenodev.tech` | `/` (repo root)               |
| API      | Laravel 11 + vercel-php    | `https://api.inventory.shenodev.tech` | `/backend`           |

## Workspace layout

- `apps/web` — `@sheno/web`: the public inventory dashboard and login (Analog/Vite, SSR).
- `packages/ui` — `@sheno/ui`: shared Tailwind v4 design tokens (`@sheno/ui/styles.css`).
- `backend` — Laravel 11 REST API served on Vercel via the `vercel-php@0.9.0` (Bref) serverless runtime. MySQL lives on Aiven.

## Commands

```sh
npm install  # install workspace deps (npm workspaces)
npm run dev  # dev server for the web app (vite)
npm run build
npm run test
```

## Deployment

Each domain is a separate Vercel project pointing at a different root directory (see table). Domains are attached per project in the Vercel dashboard; `vercel.json` cannot set domains.

- Root/backend `vercel.json` routes all traffic through the PHP runtime: `rewrites` map `/(.*)` to `/api/index.php`, which bootstraps Laravel (`require '../public/index.php'`).
- The Analog app builds with the Nitro `vercel` preset (`BUILD_PRESET=vercel`) so Nitro emits Vercel's Build Output layout (`.vercel/output`) with the SSR function and prerendered assets.
- CORS (`backend/config/cors.php`) is scoped to exactly these origins.