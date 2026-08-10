# Phase 9 — ProductMediaViewer A/B/C/D

## Delivered

- `ProductMediaViewer` orchestrates independent engines:
  - A `Realtime3DEngine` — only when `.glb/.gltf` + WebGL + `<model-viewer>` exist
  - B `Spin360Engine` — real spinset (≥24 frames), drag + keyboard, no padding
  - C `MultiAngleEngine` — labelled angles, clearly not 360
  - D `StaticMediaEngine` — premium still / asset-blocked
- `ProductViewer` re-exports `ProductMediaViewer` for compatibility
- Product page uses `ProductMediaViewer`
- UI suite 63/63 pass (viewer + StudioStage)

## Honesty

- Current catalog: Real 3D 0, True 360 0 — engines idle until assets exist
- No fake 360 from one photograph
- No fake 3D geometry

# Phase 10 — StudioStage pointer fix

- Named `handlePointerDown` / `handlePointerUp` / `handlePointerCancel`
- Exact same functions removed in cleanup
- Listeners registered once; `dir`/`index` via refs
- StudioStage UI tests pass