# operations.js → operations.ts recipe

Probe: 1259 lines, ~39 exports, ~125 tsc errors after bare rename (mostly
implicit any on destructured params + exactOptional null vs undefined).

## Approach
1. Start from ambient `operations.d.ts` as the public surface
2. Migrate export-by-export into `.ts` with explicit input types
3. Prefer `string | null | undefined` for optional IDs matching callers
4. Do not bulk-`Record` destructure (same pitfall as b2b)

Keep ambient until green.
