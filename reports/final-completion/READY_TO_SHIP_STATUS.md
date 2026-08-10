# Ready to Ship — honest inventory gate

## UI (implemented)
- Shop entrance gate + `/shop/ready-to-ship` route
- Homepage CTA, mobile filter entry, product availability labels
- Non-Libya caveat copy on Ready-to-Ship department view

## Count = 0 in staging-safe mode (expected)
`normalizeCatalogProduct` only promotes `readyToShip` when `inventoryVerified === true`
and verified stock exists. Static catalog definitions set `readyToShip: true` intent
flags, but **do not** set `inventoryVerified` or `stockByVariant` — trusted inventory
comes from Supabase overlays.

## Classification
**BLOCKED on external/trusted inventory** — fabricating `inventoryVerified` or stock
would violate protected systems. UI entry points remain visible and honest.

