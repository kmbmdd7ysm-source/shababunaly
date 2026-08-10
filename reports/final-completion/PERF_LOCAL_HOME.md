# Local home performance snapshot (dev server — not Lighthouse CI)

Dev-server timings are not production Core Web Vitals. Recorded for continuity.

Use production build + Lighthouse/PageSpeed for release gates (existing
`reports/lighthouse-*.json` / `reports/pagespeed-*.json` from prior runs).

```json
{
  "domContentLoaded": 233,
  "loadEvent": 416,
  "paints": {
    "first-paint": 52,
    "first-contentful-paint": 52
  },
  "wallMs": 977
}
```

