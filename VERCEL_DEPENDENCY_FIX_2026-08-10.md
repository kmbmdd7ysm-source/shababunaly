# Vercel dependency resolution fix — 2026-08-10

Vercel failed during `npm install` with `ERESOLVE` because the root project requested `three@^0.170.0`, while `@google/model-viewer@3.5.0` declares the peer range `three@^0.163.0`.

Minimal compatibility fix applied:

- `three`: `^0.170.0` → exact `0.163.0`
- `package-lock.json` root dependency and `node_modules/three` entry aligned to `0.163.0`
- `@react-three/fiber@8.17.10` left unchanged (its peer range accepts this Three.js version)
- `@google/model-viewer@3.5.0` left unchanged
- `@types/three` left unchanged to avoid introducing source/type regressions; it does not participate in npm peer resolution
- no application source, products, routes, styles, business rules, APIs, data, or assets were changed by this fix

The project's direct Three.js usage is limited to `CanvasTexture`, `DoubleSide`, `Shape`, and `SRGBColorSpace`, all part of the r163-era API used by this project.

A fresh Vercel deployment should now get past the peer-dependency conflict. The next build stage must still be observed for any independent compile/runtime issue.
