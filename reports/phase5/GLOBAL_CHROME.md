# Phase 5 — GlobalChrome / Dismiss / Header stack

## Architecture

```
GlobalChrome
├── ReadinessBanner   (document flow, dismissible)
├── AnnouncementBar   (document flow, dismissible)
└── MainHeader        (nav, tools, overlay)
```

- Sticky owner: `.gw-chrome-sticky`
- Readiness state: `ReadinessProvider` / `useReadiness()`
- `ProductionReadinessGate` re-exports the provider for `main.jsx` compatibility
- Dismiss remains text buttons with 44px hit targets (`gw-*-dismiss`)

## Evidence

Playwright matrix (`CHROME_SMOKE_PASS`):

| Scenario | Overlap | Brand covered |
| --- | --- | --- |
| desktop EN/AR — both open | no | no |
| desktop EN/AR — announce dismissed | no | no |
| desktop EN/AR — none | no | no |
| mobile EN/AR — both / dismiss / none | no | no |
| tablet EN | no | no |
| 200% zoom samples | no | no |

Dismiss collapse moves `headTop` smoothly with the grid-rows animation (e.g. desktop EN both→announce-dismissed: headTop 126→66; then none: 2).

## Gate

- Banner/header states pass visually & functionally
- No logo/menu overlap
- EN + AR, desktop/tablet/mobile, zoom samples
- Build + UI tests green