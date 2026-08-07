# Phase 15 — Arabic / RTL technical QA

## ARABIC_TECHNICAL_QA = PASS (partial, code-side)

Verified in this rebuild:

- Document `dir="rtl"` drives CSS direction after removing the global LTR `!important` root cause
- Playwright smoke: Arabic homepage/shop `html`/`body` direction = `rtl`
- GlobalChrome dismiss matrix includes desktop/mobile Arabic without banner/header overlap
- Shipping/Formspree/Ready-to-Ship copy updated in AR where rules changed
- Logical CSS preferred in new sheets; Stylelint/token validation covers bridge layers

## ARABIC_HUMAN_REVIEW = REQUIRED

Final commercial/legal Arabic copy still needs a human native reviewer.
Do not claim “human Arabic approved”.
Translation hash regeneration waits until strings stabilize after remaining phases.
