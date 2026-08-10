# Phase 2 — Development toolchain rebuild

## Result

- All lint/test/type tooling is declared in `package.json` `devDependencies`.
- Pins mirrored in `quality-toolchain-lock.json`.
- `npm ci` alone installs **820** packages including ESLint, Vitest, Testing Library, Stylelint, Playwright, TypeScript, Lighthouse, CycloneDX.
- `npm run quality:install` now **verifies** pins (no `--no-save` side install).
- Vendor `yocto-queue` ships dual ESM/CJS so `p-limit`/`eslint` no longer crash with `Queue is not a constructor`.
- TypeScript pinned to **5.9.3** (compatible with `typescript-eslint@8.66.0` peer range `<6.1.0`). Previous `7.0.2` forced `NPM_CONFIG_FORCE` installs.
- Clean ESLint Flat Config in `eslint.config.mjs` enforces React, Hooks, jsx-a11y, import, promise, security, unused vars, dangerous patterns.
- Stylelint added via `stylelint.config.mjs` + `npm run lint:css` (wired into `npm run lint`).

## Gate evidence

| Check | Result |
| --- | --- |
| Fresh `npm ci` | exit 0 |
| `npm run quality:install` | verified 26 packages |
| `eslint --version` | v9.39.1 (no Queue crash) |
| `npm run lint:eslint` | **executes**; 88 rule findings (debt for later phases) |
| `npm run lint:css` | **executes**; 430 findings (Phase 4 cleanup) |
| `npm run typecheck` | **executes**; remaining TS2322/TS6133 debt (Phase 3) |
| `npm run test:node` | **322 pass / 0 fail** |
| `npm run test:ui` | **63 pass / 0 fail** |

Tool-missing failures: **none**.
