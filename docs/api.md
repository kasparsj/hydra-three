## API Reference (v0.x Baseline)

This page documents the public surface intended for stable use in the current `v0.x` line.

Runtime scope:

- Browser runtime only (DOM + WebGL required).
- Node/SSR execution is unsupported unless you provide browser-like shims.

## Constructor

```js
import Hydra from "hydra-synth";

const hydra = new Hydra({
  detectAudio: false,
  makeGlobal: true,
});
```

Constructor options:

- `width`, `height`: initial canvas size
- `canvas`: provide an existing canvas
- `makeGlobal`: install synth methods on `window`
- `autoLoop`: automatically run `tick()`
- `detectAudio`: initialize audio analyzer
- `numSources`, `numOutputs`: source/output slots
- `webgl`: `1` or `2`
- `precision`: `"lowp" | "mediump" | "highp"`
- `enableStreamCapture`: enable `vidRecorder` support
- `extendTransforms`: custom transform definitions

## Instance API

- `hydra.eval(code)`
- `hydra.setResolution(width, height)`
- `hydra.tick(dt)`
- `hydra.hush()`
- `hydra.shadowMap(options)`
- `hydra.scene(attributes)`
- `hydra.dispose()`

## `hydra.synth` API

Core:

- `render`, `setResolution`, `tick`, `hush`
- lifecycle hooks: `update`, `afterUpdate`
- timing/state: `time`, `bpm`, `fps`, `stats`

Camera and scene:

- `perspective(...)`, `ortho(...)`
- `screenCoords(...)`, `normalizedCoords()`, `cartesianCoords(...)`
- `scene(...)`

3D module namespaces:

- `tx`, `gm`, `mt`, `cmp`, `rnd`, `nse`, `gui`, `arr`, `el`

Hydra generator methods:

- All GLSL transforms are available on `hydra.synth` (for example `osc`, `noise`, `solid`, `src`, etc.).
- Add custom transforms with `hydra.synth.setFunction(...)`.

## Global vs non-global mode

`makeGlobal: true`:

- Synth methods are installed on `window` (for example `window.osc`).
- Helper globals `window.loadScript` and `window.getCode` are installed while at least one global-mode instance is active, then restored on `dispose()`.

`makeGlobal: false`:

- Use namespaced calls, for example:

```js
const H = hydra.synth;
H.osc(8, 0.1, 0.8).out();
```

## TypeScript support

Type definitions ship with the package at:

- `src/index.d.ts`

This provides baseline types for constructor options, `HydraRenderer`, and the `hydra.synth` contract.

Current declarations include:

- typed transform definition input for `setFunction(...)`
- typed chain shape for generator outputs (`out`, `phong`, `lambert`, `basic`, `tex`)
- typed scene API baseline (`scene().mesh(...).out()`, `scene().lights(...)`, `scene().world(...)`)
