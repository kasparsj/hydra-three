# Rendering Pipeline Guide

This guide explains how hydra-three turns chains and scenes into pixels.

## Pipeline overview

1. A chain (`osc().color().phong()`) builds a transform graph.
2. The graph compiles into shader/pass descriptors.
3. Output (`o0`, `o1`, ...) builds an EffectComposer pass stack.
4. Passes render into render targets and/or screen.
5. Final output can be reused as texture via `src(o0)` or `.tex()`.

## Primary entities

- `GlslSource`
  - chain object for transform compilation.

- `Output`
  - owns composer passes, temporary render targets, camera state.

- `HydraMaterialPass` / `HydraRenderPass` / `HydraFadePass`
  - pass types for shader-only, scene rendering, and feedback/fade accumulation.

- `HydraUniform`
  - shared uniform registry (`time`, `resolution`, `mouse`, `bpm`, output textures).

## Scene pass vs material pass

- **Material pass**: full-screen shader operations and chain composition.
- **Scene pass**: object-based rendering using Three.js scene/camera.

A single output can mix both, including post FX and layers.

## Feedback and accumulation

- `prev()` samples previous buffer in chain space.
- `autoClear(amount, color)` controls accumulation amount.
  - `amount = 1` behaves like clear.
  - `0 < amount < 1` leaves trails/fades.

## Texture extraction

- `.tex()` renders chain to texture and returns a map-compatible texture.
- `.texMat()` returns a material with the rendered texture pre-attached.

Use this when connecting signal-space synthesis to geometry materials.

## Layering and post processing

- scene layers can compile into isolated passes and be mixed back.
- `fx` options add post-process passes (blur, bloom, pixelate, etc.).

For heavy scenes, keep FX selective and benchmark frame time impact.

## Error handling

- runtime errors in `update`, `afterUpdate`, and `tick` are routed through `onError` when provided.
- use `onError` in host apps to centralize diagnostics and recovery.
