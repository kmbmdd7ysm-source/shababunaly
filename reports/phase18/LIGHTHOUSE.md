# Phase 18 — Lighthouse (honest scores)

Target: production preview `http://127.0.0.1:4173/` homepage  
Chrome headless local run (not PageSpeed staging URL).

| Category | Score |
| --- | --- |
| Performance | **58** |
| Accessibility | **100** |

| Metric | Value |
| --- | --- |
| LCP | 6.2 s |
| CLS | 0.168 |
| TBT | 0 ms |

Raw: `reports/phase18/lighthouse-home.json`

## Notes

- Scores are **not** fabricated. Local headless Lighthouse on this VM is not identical to field PageSpeed.
- LCP bottleneck likely hero atmosphere image + large JS entry; Hero slots intentionally not replaced/removed.
- CLS 0.168 still above 0.1 budget — investigate sticky chrome + cinematic opening further without removing Hero architecture.
- PageSpeed remote staging URL: not available in this run.

## Next performance work

- Further route CSS/JS splitting (partially done)
- Image priority/dimensions around existing Hero slots
- Pause offscreen motion (partial motion system exists)
