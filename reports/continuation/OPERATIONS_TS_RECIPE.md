# operations.js → operations.ts recipe

Probe: 1259 lines, ~39 exports, ~125 tsc errors after bare rename (mostly
implicit any on destructured params + exactOptional null vs undefined).

## Approach
1. Start from ambient `operations.d.ts` as the public surface
2. Migrate export-by-export into `.ts` with explicit input types
3. Prefer `string | null | undefined` for optional IDs matching callers
4. Do not bulk-`Record` destructure (same pitfall as b2b)

Keep ambient until green.

## Probe lesson (99.32% stretch)
Annotating destructured params as `: Row` breaks callers: defaults like
`orderId = null` cause inferred param types of `null | undefined`, rejecting
`string` arguments from FulfillmentManager / OrderOperationsCard / etc.

**Required approach:** write explicit interfaces per export (orderId?: string | null)
matching ambient + callers — never bulk `: Row` on destructured staff RPCs.
