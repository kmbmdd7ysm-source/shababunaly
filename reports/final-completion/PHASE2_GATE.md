# Phase 2 GATE — Build provenance

- `scripts/generate-build-provenance.mjs` records full SHA, branch, dirty, Node/npm/Vite, lockfile hash, dist hash
- `scripts/verify-build-provenance.mjs` fails when SHA != HEAD (tested with fake zero SHA)
- Fresh build after provenance hardening: commitSha == HEAD `ad7019f3f3c2ace9c50f5b39d40f3110089d5e19`
- distSha256: `c45e5fcefa193e25dd51aa12150cc73cc64c9196c97d48f04a7d025032a81d5f`
