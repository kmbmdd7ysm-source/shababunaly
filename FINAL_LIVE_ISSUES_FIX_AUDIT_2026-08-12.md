# SHABABUNA — Final Live Issues Fix Audit
Date: 2026-08-12

This release candidate is based only on the user-supplied
`SHABABUNA_FINAL_CUSTOMER_ORDER_MOBILE_FIXED_2026-08-11(1).zip`.

## Live issues addressed

### Orders / checkout
- Cash and pending-shipping orders can fall back to a session-scoped local order only after the trusted cloud order path fails.
- Online payment still fails closed when a trusted server order cannot be created.
- The fallback no longer stores customer/order history persistently in localStorage.
- Order notification has a direct canonical Formspree delivery path from checkout when the trusted server notification is unavailable.
- Guest-order access and tracking behavior remain available through the existing cloud/token path when configured, with same-session local lookup for fallback cash orders.

### Canonical Formspree
The owner-pinned endpoint is:
`https://formspree.io/f/mvzenjgv`

The public customer paths are wired through the canonical Formspree adapter:
- Contact
- Newsletter / Subscribe
- Teams & Wholesale
- Custom design request
- Special Request
- Orders
- Returns/operations paths already using the shared adapter

Contact/Newsletter submit directly first and use the same-origin Formspree proxy as fallback.
Teams/Custom quote and Special Request use their trusted API first, then direct canonical
Formspree fallback if that API/database layer is unavailable.

### Public form availability
Turnstile is no longer a hard blocker for owner-facing Contact, Newsletter, Team/Custom quote,
Special Request, or generic Formspree forwarding. Same-origin/origin checks, honeypot controls,
payload bounds and rate limiting remain on the server routes.

### Desktop account
Desktop sign-in/create-account composition was expanded and centered into a premium full-height
experience while preserving the existing authentication backend and mobile behavior.

### Custom
- Public Custom remains product-first.
- The supplied `/public/models/basketball_jersey.glb` is the official jersey model.
- Jersey renderer now owns one stable stage with explicit loading/ready/error states.
- Body/fabric and trim/edge colors remain separate controls.
- Full Game Set no longer renders a giant overlapping shorts block over the 3D jersey.
- Non-3D product types remain isolated to their own preview renderer.
- Public Custom hero spacing/line-height was corrected.
- Advanced production tools remain available separately at `/customize/advanced`.

### Product detail page
- Product media now presents one primary image at a time.
- Thumbnails and previous/next controls select the active media.
- Existing clean lightbox remains available for direct image viewing.
- True advanced media modes are retained only for products that actually have those assets.
- Purchase information remains separate from the media stage.

### Top notices
The old readiness / MOQ announcement stack is not mounted by GlobalChrome.

## Automated verification
- Node test suite: 328 / 328 passed.
- Catalogue validation: passed.
- Published products: 69.
- LHA products: 25.
- Ready-to-Ship products: 15.
- Commerce validation: passed.
- Brand validation: passed.
- Media validation: 0 errors / 44 existing warnings.
- SEO validation: passed.
- Cloud source-readiness: passed (source-level only).
- Source architecture/world-class validation: passed.
- Performance budget: passed.
- Static integrity: passed.
- Design-token/contrast validation: passed.
- Final hardening validation: passed after updating stale gates to the current intentional public-form and no-announcement behavior.
- Core smoke tests: passed.
- Source check: passed.
- Project lint checks: passed.
- TypeScript/TSX parser check across `src` + `api`: 321 files, 0 syntax parse errors.

## External verification boundary
A fresh dependency-backed Vite/TypeScript/ESLint/Stylelint/Playwright/Lighthouse run could not
be completed in this execution environment because the supplied project does not include a
package lock and dependency installation is unavailable here.

The environment also cannot make an outbound live Formspree submission, so no fake "email
received" claim is made. The runtime paths are pinned to the owner-provided endpoint and include
direct browser delivery plus same-origin/server fallbacks as documented above.

Cross-device persistent order tracking still requires the deployed trusted order backend
(Supabase configuration) to be available. Cash fallback orders remain usable in the current
browser session rather than silently failing checkout.
