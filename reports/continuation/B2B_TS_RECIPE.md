# b2b.js → b2b.ts migration recipe (next slice)

Attempted: rename produced ~73 errors in `b2b.ts` (mostly TS7006/TS7031 implicit any)
plus a few exactOptionalPropertyTypes mismatches in OrganizationWorkspace / CustomizePage
once ambient `.d.ts` was removed.

## Approach
1. Rename `b2b.js` → `b2b.ts`, delete `b2b.d.ts`
2. Bulk-annotate helper params (`userId: string`, `kind: string`, `row: Record<string, unknown>`, etc.)
3. Type exported function inputs with optional `accessToken?: string | undefined` (exactOptional)
4. Fix OrganizationWorkspace callers to always pass required keys or widen param optionality
5. Fix CustomizePage `roster: never[]` by typing save/submit payloads as `unknown[]` / `RosterRow[]`
6. `npx tsc --noEmit` must be EXIT 0 before deleting ambient permanently

Do not use `@ts-nocheck` or `any`.

## Attempt notes (91c668a+)
Bulk `Record<string, unknown>` on destructured export params reduces implicit-any count
but turns property access into `unknown` (TS18046) and breaks Supabase client typing.
Prefer explicit interfaces per export (as in the previous ambient `b2b.d.ts`) written
into the `.ts` file, then migrate internals function-by-function.
