# orders.js → orders.ts recipe

Prior attempt (~65 errors after Row rewrite):
- Nested money/shipping objects typed as `{}` need dedicated interfaces
- `writeLocalOrders` historically returned `{ok,error}` — ambient said `void`; preserve runtime return or update callers
- Prefer porting `normalizeOrder` first as pure function with `OrderRaw` interface, then CRUD

Keep ambient until this slice is green end-to-end.
