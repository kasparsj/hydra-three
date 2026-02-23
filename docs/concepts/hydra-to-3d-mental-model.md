# Hydra to 3D Mental Model

hydra-three keeps Hydra's live coding flow, but expands it from image-space composition into a scene-space + image-space workflow.

## Core idea

Think in two layers that can feed each other:

1. **Signal chain layer**

- Hydra transforms (`osc`, `noise`, `blend`, `modulate`, etc.) generate and transform textures/signals.

2. **Scene layer**

- Three.js scene graph (`scene`, `group`, `mesh`, `lights`, `world`) composes objects and cameras.

In hydra-three, these layers connect directly:

- A Hydra chain can become a Three material (`osc().phong()`).
- A scene can render to an output or texture and get reused by another chain.

## Mental mapping from classic Hydra

| Classic Hydra concept       | hydra-three equivalent                                |
| --------------------------- | ----------------------------------------------------- |
| `osc().color().out()`       | still valid for texture output                        |
| source chain as final image | source chain as image **or** material input           |
| one composition space (UV)  | two spaces: UV + scene graph/object space             |
| feedback via `src(o0)`      | feedback plus scene-to-texture workflows via `.tex()` |

## Rule of thumb

- Use **generator chains** when your problem is procedural texture/signal design.
- Use **scene APIs** when your problem is object placement, camera, lighting, or world composition.
- Use both together for most 3D sketches.

## Minimal combined example

```js
perspective([2, 2, 3], [0, 0, 0], { controls: true });

const mat = osc(8, 0.1, 0.8).rotateDeg(noise(1).mult(45)).phong();

scene().lights({ all: true }).mesh(gm.box(), mat).out();
```

## Global vs non-global mode mental model

- `makeGlobal: true`
  - functions like `osc`, `scene`, `gm` are installed on `window`.
  - best for fast live coding and sketching.

- `makeGlobal: false`
  - call through `const H = hydra.synth; H.osc(...); H.scene(...);`
  - best for embedding in serious apps, multi-instance hosts, and isolation.

## Semantics to keep in mind

- `rotateDeg()` uses degrees, `rotateRad()` uses radians, and `rotate()` is a legacy degrees alias.
- `.tex()` returns a rendered texture from the chain.
- `.texMat()` returns a Three material with the chain baked as map.
- `autoClear` controls accumulation/trails and can be applied at multiple levels.
