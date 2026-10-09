# Visual layout checks and reviewed image baselines

The Shababuna Playwright suite tests nine customer-facing routes in English and Arabic across mobile, tablet, and desktop viewport sizes. Accessibility checks run across Chromium, Firefox, and WebKit.

## What CI verifies now

- Every rendered route has a visible main landmark and a usable viewport width.
- Pages must not produce horizontal document overflow, including on mobile.
- A full-page screenshot renders successfully on the pinned Chromium engine.
- **Pixel comparison is enforced only when the exact expected screenshot is already committed to the repository.** There are no approved image goldens yet. Passing CI must not be presented as pixel-perfect visual approval.

## Create reviewed baselines

From a clean development environment with the approved product content, assets, and fonts:

```sh
VISUAL_BASELINE_REVIEW=generate npx playwright test e2e/visual.spec.js --project=desktop-chromium --update-snapshots
```

Review every image in `e2e/visual.spec.js-snapshots/` against the approved reference design and commit only those visually reviewed. Do not let CI automatically approve or overwrite expected screenshots. Subsequent tests will fail if a committed baseline drifts beyond the configured threshold.

The baseline generation mode is **local and explicit**; it is never enabled in GitHub Actions. Cross-browser WCAG checks, mobile breakpoint tests, and checkout integrity remain separate mandatory gates.
