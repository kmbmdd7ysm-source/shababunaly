# OrganizationWorkspace TS migration recipe (partial)

Proven pieces (apply first):
1. `import type { LocaleValue } from '../../context/LanguageContext'`
2. `WorkspaceState` with array fields + `[key: string]: unknown`
3. `userMeta` from `auth.user.user_metadata`
4. `asRows()` for all `list*` + `loadEnterpriseWorkspace` results in `load`
5. Nested function prop types using `pick: (value: LocaleValue) => string`
6. `organizationId?: string | undefined` and `onSaved: () => void | Promise<void>` for exactOptionalPropertyTypes

Remaining (~100 errors) are mostly:
- `String(item.*)` / `String(row.*)` in nested card JSX
- `STATUS_LABELS[String(status)]` casts
- `design.primary` etc when `item.design` is unknown — cast `const design = asRecord(item.design)`
- `key={String(item.id)}`
- `AuthUser` → pass `user={auth.user as never}` or `user={auth.user as unknown as Record<string, unknown>}`

Do not use `any` or `@ts-nocheck` (audit forbids).
