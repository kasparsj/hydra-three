# Semantic Clarifications

This page documents behavior that is easy to misread when jumping between Hydra-style signal chains and Three.js scene APIs.

## Rotation units

- `rotate(angle, speed)` in the GLSL coord chain uses **degrees** for `angle`.
- The transform converts `angle` to radians internally before applying rotation.
- `speed` is added as a time term in shader space (`ang + speed * time`), so treat it as radians-per-time-unit.
- Three.js object rotations (for example `mesh.rotation.x += ...`) use **radians**.

Rule of thumb: shader `rotate(...)` angle inputs are degrees; scene object rotations are radians.

## `.tex()` vs `.texMat()`

- `.tex(output?, options?)`
  - Ensures the current chain is compiled to an output.
  - Returns a `THREE.Texture` rendered from that output.
  - Use when you need a texture value to pass into materials, samplers, or additional texture utilities.

- `.texMat(output?, options?)`
  - Calls `.tex(...)` internally and returns a material with that texture set as `map`.
  - Material type follows current material mode:
    - `.phong()` -> `MeshPhongMaterial`
    - `.lambert()` -> `MeshLambertMaterial`
    - otherwise -> `MeshBasicMaterial`
  - Use when you want a direct texture-to-material bridge.

## `autoClear` levels and precedence

`autoClear` can be configured at multiple levels:

- output level: `o0.autoClear(...)`
- pass/source level: `scene().autoClear(...)`, `osc(...).autoClear(...)`

Behavior:

- output-level `autoClear` runs before pass execution for that output.
- pass-level `autoClear` applies on each compiled pass.
- `amount >= 1` performs full clear.
- `0 < amount < 1` inserts fade accumulation behavior.
- If both output and pass `autoClear` are set, both effects are applied in sequence.

## Render-target routing in `.out(..., options)`

When `renderTarget` is passed to `.out(...)`, the runtime assigns it to the terminal pass for the compiled chain:

- no FX chain: render target is applied to the scene/material pass.
- with FX chain: render target is moved to the final FX pass.

This preserves intermediate pass wiring while guaranteeing the final output target receives the result.

## Public vs internal scene helpers

- Public instancing path: `scene().mesh(geometry, material, { instanced: count })`
- Internal helper: `scene()._mesh(...)`

`_mesh` is an internal method and should not be treated as stable public API. Use public scene composition methods in docs, recipes, and production sketches.

## Global vs non-global runtime semantics

- `makeGlobal: true` installs helpers like `osc`, `scene`, module namespaces, and math helpers into global scope for live-coding ergonomics.
- `makeGlobal: false` keeps APIs under `hydra.synth` for host-safe embedding and multi-instance control.

Prefer non-global mode for application integration, editor embedding, and test harnesses.
