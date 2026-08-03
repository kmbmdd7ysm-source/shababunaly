# Phase 7 — Cart, authentication, account, checkout, orders, returns

Branch `cursor/shababuna-redesign-master-plan-dc14`. Rollback: revert the Phase 7
commit, or delete the `transact.css` import in `src/main.jsx`.

## Baseline

Tree clean at the Phase 6 commit. A sweep of `/cart`, `/checkout`, `/account`,
`/orders`, `/checkout/success` and `/checkout/cancelled` — 24 checks — was
already **0 axe violations, 0 overflow** thanks to the shell and content layers.
So this phase is about the _expression_, not about repair.

## Scope and the deliberate restraint

`src/styles/transact.css` is the most **restrained** expression in the whole
system, on purpose. Clarity, trust, speed and conversion outrank cinema on these
routes, so there is:

- no parallax, no scroll-driven reveal, no 3D, no decorative delay
- nothing that moves near a total, a payment state or an error
- identity carried by typography, the drawn rule and tabular figures

Concretely: money is `tabular-nums` everywhere so digits cannot jitter between
states; the summary is a specification block with the total set apart by a
**2px rule** rather than by colour; the checkout error summary is a heavy
leading-edge rule in the alert colour with **no animation at all**; and status
badges always carry a word _and_ a shape, never colour alone.

The one motion in the phase is a 1px press on the commit control, using
`--sh-e-release` — the ballistic curve the token file reserves for exactly three
moments: add-to-cart, proof approval, order confirmation. It is disabled under
`prefers-reduced-motion`.

## Files created

- `src/styles/transact.css`
- `PHASE7_EVIDENCE.md`

## Files modified

- `src/main.jsx` — one import
- `src/styles/tokens.css` — added `--sh-target-lg: 52px` for commit controls
- `scripts/validate-design-tokens.mjs` — bridge layer + fallback-aware gate

## Dependencies

**None added. None removed.**

## Security verification — the important part

`git diff main..HEAD --name-only` over **all seven phases** touches **68 files**,
and **not one** is under:

```
supabase/    api/    src/services/    src/context/    .github/
```

No pricing, shipping, currency, payment, order-state, inventory, RLS, webhook,
session or authentication file has been opened in this entire redesign. There is
no possible change to server-side price calculation, payment amount validation,
webhook verification, guest-order tokens, order ownership, refund or return
limits, idempotency or audit logging, because the code that implements them was
never edited.

`/cart`, `/account`, `/compare` and `/order-tracking` emit exactly one
`noindex, nofollow` each — verified after the Phase 6 duplicate-tag fix.
`/checkout` was already `noindex` on both of its branches; the Phase 6 note
suggesting otherwise was wrong and is corrected here.

## Live transaction test

Rather than styling an empty page, products were added **through the real UI** so
the real cart logic ran: navigate to a product, choose a size, add to cart,
repeat, then open `/cart` and `/checkout`.

| Locale / viewport | Cart lines | Total                           | Overflow | Checkout robots     |
| ----------------- | ---------: | ------------------------------- | -------: | ------------------- |
| en 1440           |          1 | `Estimated total $95.00`        |        0 | `noindex, nofollow` |
| ar 1440           |          1 | `الإجمالي المقدّر ⁨$95,00 USD⁩` |        0 | `noindex, nofollow` |
| en 390            |          1 | `Estimated total $95.00`        |        0 | `noindex, nofollow` |

The Arabic total is wrapped in bidi isolates (`⁨…⁩`), so the currency cannot
re-order — the existing `money.js` behaviour, preserved.

Checkout correctly showed `Estimated total — Pending shipping` in English and
`بانتظار الشحن` in Arabic, which is the real shipping rule for an
unconfirmed destination, not a styling artefact.

## Tests

| Command                  | Result              |
| ------------------------ | ------------------- |
| `test:node`              | 321/322 — unchanged |
| `test:ui`                | 46/47 — unchanged   |
| `typecheck`              | 75 — unchanged      |
| `verify:source`          | pass                |
| `validate-design-tokens` | pass                |
| `build`                  | pass                |

## Browser review

**28 checks across 7 routes × 2 locales × 2 viewports: 28 clean, 0 axe
violations, 0 horizontal overflow, one h1 per route.**

Routes: `/cart` `/checkout` `/account` `/orders` `/checkout/success`
`/checkout/cancelled` `/order-tracking`.

- **Desktop:** dark masthead, drawn cart lines, sticky summary plate with
  hairline rows and a heavy rule above the total.
- **Mobile:** the summary un-sticks and the commit control goes full width, so
  it is never hunted for; cart line media shrinks to 68px; account navigation
  becomes a horizontal rail.
- **Arabic / RTL:** complete, including the bidi-isolated total and the
  `.workspace-index` order reference.
- **Keyboard:** focusable counts recorded per route; all controls native, so
  password managers and autofill behave normally.

## A third undefined token, caught by the gate

`var(--sh-target-lg, 52px)` referenced a token that did not exist. It now does —
a large commit target is a genuine design decision, so it became a real token
rather than an inline fallback.

The gate was also refined: `var(--x, fallback)` is a legitimate, safely
degrading pattern, so it is now allowed, while a **bare** reference to a missing
token still fails the build. That gate has now caught three real typos across
Phases 4, 5 and 7.

## Known limitations

- Authentication, MFA, saved designs, returns and refunds render their
  signed-out or empty states in a static build. Their styling is verified
  structurally, but the authenticated views need a Supabase instance to review
  visually. No logic in those flows was touched.
- Payment provider sandboxes are unavailable in this environment, so
  card/COD/retry end-to-end runs are **blocked**, not passed. See
  `PHASE9_EVIDENCE.md` for the external-blocker register.
