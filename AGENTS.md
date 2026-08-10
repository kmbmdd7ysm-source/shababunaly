# AGENTS

## Cursor Cloud specific instructions

Shababuna is a bilingual (EN/AR, RTL) basketball commerce storefront: **React 18 + Vite** frontend with an optional Supabase backend and Vercel serverless functions in `api/`. See `README.md` for the product overview and the full command list.

### Services

- **Vite dev server (the app)** — `npm run dev` serves the storefront on `http://localhost:3000` (port and `open:true` are set in `vite.config.js`; there is no `/api` proxy). This is the only service you need for local development.
- Without Supabase/payment credentials the storefront runs in a **"staging-safe" mode**: catalog browsing, client-side cart and favorites work, while accounts, trusted inventory and live checkout are intentionally disabled (see `src/services/supabase.js`, which returns `null` when unconfigured). This is expected, not a bug. `.env.local` (copied from `.env.example`) can be left blank for dev.
- Supabase (local stack) and the `api/` Vercel functions are **optional** and only needed for full-commerce/e2e flows; CI spins up a local Supabase stack for those (see `.github/workflows/world-class-quality.yml`).

### Toolchain / non-obvious gotchas

- **Two-step dependency install.** `npm install` only installs the small runtime set. The lint/test/typecheck tooling (eslint, vitest, testing-library, coverage, types, lighthouse) is a separate "quality toolchain" installed via `npm run quality:install` (packages pinned in `quality-toolchain-lock.json`). The startup update script runs both; if tooling like `eslint`/`vitest` is missing, re-run `npm run quality:install`.
- **`quality:install` needs peer overrides.** The repo pins `typescript@7.0.2`, which conflicts with `typescript-eslint@8.48.0`'s peer range (`<6.0.0`), so a plain `npm run quality:install` fails with `ERESOLVE`. Run it as `NPM_CONFIG_FORCE=true npm run quality:install` (the update script does this). Using `--legacy-peer-deps` instead is worse: it skips required peers such as `@testing-library/dom` and breaks `vitest`.
- **Pre-existing red checks (present on `main`, not caused by the environment):**
  - `npm run lint` fails: the checked-in ESM-only shim `vendor/yocto-queue` is loaded via CommonJS `require()` by `p-limit`, yielding a namespace object instead of a constructor (`Queue is not a constructor`) inside ESLint.
  - `npm run typecheck` reports `TS2322`/`TS2339` errors under `typescript@7.0.2`.
  - `npm run test:node` and `npm run test:ui` (vitest) run but have a few failing assertions (e.g. the `Breadcrumbs.jsx` component test).
  - Do not treat these as regressions from setup work; fix them only if a task explicitly targets them.
- **Works reliably:** `npm run dev` and `npm run build` (build also prerenders ~95 static pages and writes build provenance via the `postbuild` script).
