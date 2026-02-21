# Advanced Performance Notes

This guide focuses on practical frame-time control for serious sketches and installations.

## Performance model

Frame cost mainly comes from:

1. geometry count and draw calls
2. shader complexity and overdraw
3. post-processing pass count
4. texture size and update frequency
5. feedback/accumulation pipelines

## High-impact optimizations

## 1) Prefer instancing for repeated meshes

- use instanced paths for large repeated object sets.
- avoid per-object materials where one shared material can work.

## 2) Keep render target sizes intentional

- `.tex()` and FBO defaults can be larger than needed for a specific effect.
- choose width/height based on visual need, not screen maximum by default.

## 3) Minimize post FX in inner loops

- each FX pass adds full-frame work.
- stack only passes that materially improve the aesthetic target.

## 4) Control accumulation scope

- `autoClear(<1)` can become expensive in complex pipelines.
- isolate trail effects to specific outputs/scenes instead of global usage.

## 5) Reuse geometry and materials

- avoid allocating new geometry/material objects in `update`.
- update transforms/uniforms rather than recreating scene objects.

## 6) Use non-global mode in host apps

- reduces accidental cross-instance coupling.
- simplifies profiling and lifecycle ownership in app runtimes.

## 7) Manage input and event workloads

- input hooks run often; keep handlers lightweight.
- move heavy work to frame update paths with explicit budgets.

## Runtime tuning checklist

- set clear FPS targets per deployment profile (desktop, mobile, projector).
- profile with and without FX to identify largest pass deltas.
- verify behavior in Chromium and Firefox if both are target environments.
- validate memory growth during long runs (hours, not seconds).

## Debugging hotspots

- sudden frame drops:
  - check recent shader/pipeline additions, especially bloom/blur stacks.
- stutter under feedback chains:
  - reduce render target resolution or pass count.
- long startup time:
  - preload textures and simplify first-frame scene initialization.

## Production posture

- ship with conservative defaults and opt-in heavy effects.
- treat visual parity checks as regression tests for performance tradeoffs.
- use browser smoke + scene-specific profiling before release tags.
