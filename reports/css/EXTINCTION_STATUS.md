# CSS extinction status

## Live
- Foundation tokens/typography/layout/shell (eager)
- Route/component sheets
- `legacy-retained.css` — used-only island extracted from former triad

## Archived (not imported)
- `src/styles/_archive/global.css`
- `src/styles/_archive/premium.css`
- `src/styles/_archive/shababuna.css`

## Removed
- `requestIdleCallback` post-first-paint legacy injection (cascade flash)

## Next
Continue moving retained rules into route/component ownership until `legacy-retained.css` can shrink further or vanish.
