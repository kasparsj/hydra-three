# Parameter Reference Tables

This page summarizes frequently used parameters and defaults for core public APIs.
For behavior-level edge cases (units, precedence, and internal/public boundaries), see
[`docs/reference/semantic-clarifications.md`](./semantic-clarifications.md).

## Hydra constructor options

| Option                | Type                             | Default            | Notes                                                |
| --------------------- | -------------------------------- | ------------------ | ---------------------------------------------------- |
| `width`               | `number`                         | `1280`             | Initial canvas width.                                |
| `height`              | `number`                         | `720`              | Initial canvas height.                               |
| `canvas`              | `HTMLCanvasElement`              | auto-created       | Provide your own canvas for embedding.               |
| `makeGlobal`          | `boolean`                        | `true`             | Installs globals like `osc`, `scene`, etc.           |
| `autoLoop`            | `boolean`                        | `true`             | Starts internal RAF loop automatically.              |
| `detectAudio`         | `boolean`                        | `true`             | Initializes audio analyzer (`a` bins).               |
| `numSources`          | `number`                         | `4`                | Number of source slots `s0..sN`.                     |
| `numOutputs`          | `number`                         | `4`                | Number of output slots `o0..oN`.                     |
| `webgl`               | `1 \| 2`                         | `2`                | Select WebGL renderer backend.                       |
| `precision`           | `"lowp" \| "mediump" \| "highp"` | platform-dependent | Shader precision hint.                               |
| `onError`             | `(error, context) => void`       | unset              | Runtime hook for `update/afterUpdate/tick` failures. |
| `liveMode`            | `"restart" \| "continuous"`      | `"continuous"`     | Eval behavior: rebuild on each run vs persistent scene reconciliation. |
| `enableStreamCapture` | `boolean`                        | `true`             | Enables `vidRecorder` capture setup.                 |
| `extendTransforms`    | object/array                     | `{}`               | Registers custom transforms at startup.              |
| `css2DElement`        | `HTMLElement`                    | auto               | Target element for CSS2D renderer if used.           |
| `css3DElement`        | `HTMLElement`                    | auto               | Target element for CSS3D renderer if used.           |
| `pb`                  | `unknown`                        | `null`             | Legacy/peer stream source integration input.         |

## Scene composition methods

| Method                        | Purpose                          | Typical usage                         |
| ----------------------------- | -------------------------------- | ------------------------------------- |
| `scene()`                     | Create or fetch a scene handle   | `scene({ name: "main" })`             |
| `.mesh(geom, mat, options)`   | Add mesh geometry                | `.mesh(gm.box(), osc().phong())`      |
| `.points(geom, mat, options)` | Add points primitive             | `.points([100, 100], mt.dots())`      |
| `.lines(...)`                 | Add line segments                | `.lines([100], mt.lines())`           |
| `.lineloop(...)`              | Add closed line loop             | `.lineloop([200], mt.lineloop())`     |
| `.lights(options)`            | Configure runtime lights group   | `.lights({ all: true })`              |
| `.world(options)`             | Configure sky/ground/fog helpers | `.world({ ground: true, fog: true })` |
| `.group(attrs)`               | Create/attach subgroup           | `scene().group({ name: "cluster" })`  |
| `.out(output, options)`       | Bind scene to output pipeline    | `.out(o0)`                            |

## Camera helper options

| Method                              | Inputs                                | Notes                                   |
| ----------------------------------- | ------------------------------------- | --------------------------------------- |
| `perspective(eye, target, options)` | tuple eye/target + camera options     | Good default for 3D exploration.        |
| `ortho(eye, target, options)`       | tuple eye/target + ortho bounds hints | Useful for design, line art, and grids. |
| `screenCoords(w, h)`                | width/height                          | Pixel-space style coordinate framing.   |
| `normalizedCoords()`                | none                                  | 0..1 style framing helper.              |
| `cartesianCoords(w, h)`             | width/height                          | Centered cartesian framing helper.      |

## Transform chain material helpers

| Method                     | Output                           | Notes                                |
| -------------------------- | -------------------------------- | ------------------------------------ |
| `.basic(options)`          | MeshBasic-style Hydra material   | Lighting-independent shading path.   |
| `.lambert(options)`        | MeshLambert-style Hydra material | Diffuse light response.              |
| `.phong(options)`          | MeshPhong-style Hydra material   | Specular + shininess response.       |
| `.material(options)`       | custom material properties       | Base helper used by presets above.   |
| `.tex(output, options)`    | Texture                          | Render chain to texture for reuse.   |
| `.texMat(output, options)` | Material                         | Material with rendered map attached. |

## Output render options

| Option         | Scope                 | Notes                                         |
| -------------- | --------------------- | --------------------------------------------- |
| `cssRenderer`  | `.out(..., options)`  | `"2d"`, `"3d"`, renderer aliases, or `false`. |
| `renderTarget` | compiled pass options | Route pass output into explicit target.       |
| `autoClear`    | output/scene/chain    | `1` = clear, `<1` = accumulation fade.        |
| `fx`           | output/scene/chain    | Adds post-processing passes.                  |

## Runtime hooks

| Hook                                         | Purpose                                            |
| -------------------------------------------- | -------------------------------------------------- |
| `update(dt)`                                 | user animation/update function each frame interval |
| `afterUpdate(dt)`                            | post-render callback                               |
| `click`, `mousedown`, `mouseup`, `mousemove` | input event hooks routed from canvas               |
| `keydown`, `keyup`                           | keyboard hooks routed from document                |
| `onError(error, { context, time })`          | centralized runtime error handling                 |
