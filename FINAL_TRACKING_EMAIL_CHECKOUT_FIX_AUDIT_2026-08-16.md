# SHABABUNA — Tracking, Email, Checkout & Mobile Shop Correction Audit
Date: 2026-08-16

This targeted correction pass was applied only to the user-supplied
`SHABABUNA_FINAL_LIVE_ISSUES_FIXED_2026-08-12(1).zip`.

The pass intentionally avoids unrelated redesign work.

## 1. Guest order tracking
- Removed the Turnstile/security-check requirement from the Guest Order Lookup UI.
- Removed Turnstile enforcement from `api/guest-order-access.ts`.
- Exact Order Number + the same checkout email are now sufficient for lookup.
- Existing request rate limiting and exact email matching remain in place.
- If a cloud order is verified but a signed guest token cannot be minted, the verified order can still be opened for that session.
- Cash/pending fallback orders remain discoverable from session order storage using the same Order Number + email.
- Direct order-detail verification is also email-only.

## 2. Canonical Formspree delivery
Canonical owner endpoint:
`https://formspree.io/f/mvzenjgv`

The public submission layer is pinned to this endpoint.

Covered customer flows include:
- Contact Us
- Newsletter / Subscribe
- Teams & Wholesale
- Public Custom / Design Request
- Special Request
- Order notification
- Existing returns/operations flows using the shared adapter

Reliability changes:
- Public quote and Special Request flows no longer report success simply because database persistence succeeded.
- If the server-side notification is not confirmed as delivered, the browser retries the same canonical Formspree endpoint before showing success.
- Formspree payloads now include current standard fields `subject`, `name`, `message`, `email` and `_replyto`, while retaining `_subject` for backward compatibility.
- Internal/server notifications and order notifications also include `subject` and `_subject`.

## 3. Product Compare / Share
- Compare is now an independent product action.
- Share owns a separate share block.
- Mobile layout prevents Compare from visually entering the Share controls.

## 4. Order notification detail
Order email/fallback payload now carries:
- Order number
- Customer name, email and phone
- Country and shipping address
- Payment method and payment plan
- Delivery profile
- Shipping-quote state
- Product name
- SKU
- Variant key
- Size
- Colour
- Quantity
- Unit price
- Line total
- Subtotal
- Shipping
- Total
- Due now
- Remaining balance
- Display currency

The trusted server snapshot remains authoritative whenever available.

## 5. Checkout payment / contextual information
- Replaced multiple large explanatory blocks with one compact contextual information card after country/order context is known.
- Card/digital payment is always visible as a professional second payment option.
- It remains non-selectable when no real payment provider is configured; no fake card checkout is presented.
- Libya immediate-delivery cash orders remain full cash-on-delivery.
- Libya reservation/non-ready cash orders can choose the supported 50% / 100% plan.
- Pending international shipping is presented concisely rather than as multiple large warning cards.

## 6. Mobile Shop sticky controls
- Mobile category/filter/sort controls retain their sticky behavior.
- Removed the unwanted empty sticky offset above the controls.
- Categories remain horizontally scrollable/tappable.

## Verification completed
- Node test suite: 328 / 328 passed.
- Catalogue validation: 69 published products, 15 Ready-to-Ship, 25 LHA products, 0 errors / 0 warnings.
- Commerce validation: passed.
- Brand validation: passed.
- Media validation: 0 errors / 44 existing media warnings.
- SEO validation: passed.
- Cloud source-readiness: passed (source-level).
- World-class/source architecture: passed.
- Performance budgets: passed.
- Static integrity: passed.
- Design tokens / contrast: passed.
- Final hardening: passed.
- Core smoke tests: passed after updating the stale cash-plan assertion to the owner-approved behavior.
- Source check: passed.
- Project lint checks: passed.
- TypeScript/TSX parser check across `src` and `api`: 321 files, 0 parse errors.
- Forbidden tracker strings are absent from the tracker UI/API paths.

## Environment boundary
A fresh dependency-backed Vite/TypeScript/Playwright/Lighthouse build could not be completed
in this execution environment because the npm registry/dependency install is unavailable here.

The execution environment also cannot resolve `formspree.io`, so it cannot physically submit a
test email to the owner inbox. The code now only reports form success on an accepted Formspree/API
delivery path, and all relevant payloads are pinned to the owner-provided endpoint. Actual inbox
delivery also depends on the Formspree form's verified Target Email configuration.
