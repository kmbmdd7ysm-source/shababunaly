# Bundle snapshot

Generated from local `npm run build` artifacts under `dist/assets`.

## Totals (approx)
- JS files: 78 · ~2154 KB
- CSS files: 18 · ~352 KB

## Largest JS chunks
| Chunk | ~KB | Notes |
| --- | ---: | --- |
| Realtime3DEngine | 878 | model-viewer — lazy, not on Home/Shop |
| index (app) | 248 | shared storefront |
| index (css/js companion) | 212 | — |
| react vendor | 160 | — |
| OperationsDashboard | 92 | staff-only lazy |
| AccountPage | 82 | customer account |
| CustomizePage | 76 | design studio |

## Gates
- Operations not in initial shopper path: YES (lazy route)
- Realtime3D not in Home/Shop initial: YES (dynamic engine chunk)
- Further Account/Customize splitting still desired
