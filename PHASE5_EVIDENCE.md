# Phase 5 — Team, B2B, Team Locker, Special Requests, Our Work

Branch `cursor/shababuna-redesign-master-plan-dc14`. Rollback: revert the Phase 5
commit, or delete the `workspace.css` import in `src/main.jsx`.

## Baseline

Tree clean at the Phase 4 commit. `verify:source` green. Before this phase these
routes carried **16 axe violations** across 20 checks.

## Scope and approach

`src/styles/workspace.css`, a bridge layer, migrates Teams & Wholesale, Team
Locker, Special Requests, Our Work and the LHA store. **No page component was
edited at all.** Quote logic, file-upload handling and scanning, Turnstile,
access control and production tracking are untouched — the files that own them
were not opened.

These routes are professional rather than cinematic, which is the correct
route-appropriate expression: drawn plates, specification rows, a clear
commercial spine, and forms that read as commercial instruments.

## Files created

- `src/styles/workspace.css`
- `PHASE5_EVIDENCE.md`

## Files modified

- `src/main.jsx` — one import
- `src/styles/tokens.css` — added `--sh-alert-on-dark`
- `src/styles/studio.css` — fixed an undefined-token typo
- `scripts/validate-design-tokens.mjs` — new undefined-token gate + bridge layer

## Dependencies

**None added. None removed.**

## Two silent bugs found by a gate I added mid-phase

While fixing an error colour I wrote `var(--sh-alarm)`. That token does not
exist — the real one is `--sh-alert`. A `var()` reference to an undeclared
custom property fails silently **and takes its whole declaration with it**, so
the error colour simply vanished with no warning anywhere.

That is too easy a mistake to leave undefended, so
`validate-design-tokens.mjs` now checks every `var(--sh-*)` reference in every
scoped and bridge layer against the declared set.

It immediately caught a **second, pre-existing typo I had shipped in Phase 4**:
`var(--sh-e-arc)` in `studio.css`. That silently invalidated the artboard's
`transition` declaration, so the camera rotation had not been animating at all.
Now `--sh-e-draw` — deliberately _not_ `--sh-e-release`, which the token file
reserves for exactly three moments of commitment, and a camera move is not one.

A new `--sh-alert-on-dark: #e8735a` was added following the system's own
`--sh-signal-on-dark` precedent, measured at **6.59:1** on `--sh-night`.

## The contrast lesson of this phase

Five separate violations had one root cause: **I re-grounded plates to chalk
whose legacy copy was light**, because those panels had always been dark. White
`#ffffff` list items landed on chalk at 1.08:1; `#cacaca` labels at 1.50:1;
`#999999` step numbers at 2.61:1; and a `#050505` heading landed on the night
plate at 1.12:1.

Fixed by respecting what each surface actually is:

- `.process-grid` steps and `.special-request-info` **stay dark** — that is what
  their copy was written for, and a dark information panel is the stronger read
  for the commercial spine anyway.
- Plates inside `.section--dark` take the night surface.
- Step numbers inside light plates take the ink scale.
- The footer status keeps its rule and its meaning but loses the plate, because
  the footer is a dark chapter with `!important` light copy.

## Tests

| Command                                   | Result                   |
| ----------------------------------------- | ------------------------ |
| `test:node`                               | 321/322 — unchanged      |
| `test:ui`                                 | 46/47 — unchanged        |
| `typecheck`                               | 75 — unchanged, zero new |
| `verify:source`                           | pass                     |
| `lint-project` / `validate-design-tokens` | pass                     |
| `build`                                   | pass                     |

## Browser review

Both locales, 390×844 and 1440×1000, with axe and keyboard:

| Route               | Result                                      |
| ------------------- | ------------------------------------------- |
| `/teams-wholesale`  | clean · 0 axe · overflow 0                  |
| `/special-request`  | clean · 0 axe · overflow 0                  |
| `/our-work`         | clean · 0 axe · overflow 0 · 66 focusables  |
| `/team-locker/demo` | clean · 0 axe · overflow 0 · 70 focusables  |
| `/lha-store`        | clean · 0 axe · overflow 0 · 190 focusables |

**20 checks, 20 clean, 0 axe violations, 0 horizontal overflow — down from 16
violations at baseline.**

- **Desktop:** dark masthead, drawn plates, the five-step commercial spine as a
  dark chapter, quote form as a bordered instrument.
- **Mobile:** plates reduce padding, the heading row stacks, forms stay
  single-column, zero overflow.
- **Arabic / RTL:** complete. The leading-edge tick on each plate is placed with
  `inset-inline-start`, so it mirrors automatically; there is no `[dir='rtl']`
  override anywhere in this layer.
- **Keyboard:** focusable counts recorded per route above; all controls remain
  native elements.

## Preserved

Quote submission and validation, `Turnstile`, file type and size restrictions,
malware-scan status handling, `team-locker` access control, organization
workspace gating, production tracking, deposit and final-payment display, and
every price and minimum. **Zero page components were edited.**

## Our Work — content honesty

`/our-work` is restyled only. No club, contract, achievement, project or
partnership was added. The route continues to present exactly the verified
content already in the repository. Required final photography is recorded in
`docs/HERO_MEDIA_MANIFEST.md` under "Our Work showcase — blocked on client
approval".

## Known limitations

- Team Locker was reviewed at `/team-locker/demo`, which renders the
  not-found/empty state because no seeded team exists in a static build. The
  private, authenticated view needs a Supabase instance and is verified at the
  code level only.
- The B2B lifecycle is presented as the existing pages describe it. No step was
  invented, and nothing unsupported by the backend was added.
