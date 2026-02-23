# 3D API Review for Live-Coding Ergonomics

## A) Current API Map

1. Bootstrap and runtime ownership

- `HydraRenderer` is the main entry point with constructor options in `src/hydra-synth.js:117` and typed in `src/index.d.ts:1`.
- Runtime registration and active-runtime switching happen in `src/hydra-synth.js:256` and `src/three/runtime.js:2`.

2. Public API surface

- The live surface is assembled onto `synth` in `src/hydra-synth.js:157`.
- Core modules are short namespaces (`gm`, `mt`, `tx`, `cmp`, `rnd`, `nse`, `arr`, `gui`, `el`) assigned in `src/hydra-synth.js:194`.
- API breadth is large: 46 `HydraSynthApi` members, 10 namespaces, 67 GLSL transforms in `docs/api.md:15`, `docs/api.md:18`, `docs/api.md:19`.

3. Scene layer

- `scene()` resolves to `HydraScene` via `src/hydra-synth.js:799` and `src/three/scene.js:376`.
- Scene graph methods include mesh/points/lines/lights/world/group/out in `src/three/scene.js:774`, `src/three/scene.js:783`, `src/three/scene.js:823`, `src/three/scene.js:938`, `src/three/scene.js:952`.

4. Signal-chain layer and compile path

- Chain objects are `GlslSource` in `src/glsl-source.js:9`.
- Generator registration and chain method injection happen in `src/generator-factory.js:55`.
- `.out()` compiles chain/passes in `src/lib/mixins.js:188`.

5. Render lifecycle and event model

- Tick/update/render flow is `src/hydra-synth.js:659`.
- Output pass assembly and terminal routing are in `src/output.js:133`.
- Input hooks are canvas/document listeners mapped to user handlers in `src/canvas.js:43`.

## B) Friction Audit

| Issue                                                 | Evidence (`file:line`)                                                                                                              | Why confusing                                                                                                 | Severity | Suggested fix                                                                                                            |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| Globals mutate by default                             | `src/hydra-synth.js:123`; `src/hydra-synth.js:350`; `src/hydra-synth.js:362`; `src/eval-sandbox.js:88`                              | Live-coders get speed, but sketches become host-coupled and harder to reason about in multi-instance contexts | High     | vNext default `globals: false`; add explicit `liveGlobals(true)` for stage/live sessions                                 |
| Hidden active-runtime context                         | `src/three/runtime.js:25`; `src/three/runtime.js:67`; `src/three/mt.js:151`; `src/three/tx.js:264`                                  | Same helper call can target different runtime depending implicit active state                                 | High     | Bind helper namespaces per instance only (`H.tex`, `H.geom`, etc.) and remove fallback to global active runtime in vNext |
| Internal API leaks into user workflow                 | `docs/reference/semantic-clarifications.md:56`; `docs/reference/semantic-clarifications.md:58`; `examples/box-instanced-grid.js:34` | Users copy `_mesh` from examples despite docs saying internal                                                 | High     | Replace example usage with public `.mesh(..., { instanced })`; warn on `_` method calls                                  |
| Rotation unit mismatch                                | `src/glsl/glsl-functions.js:376`; `docs/reference/semantic-clarifications.md:7`; `examples/box.js:16`                               | Shader `rotate()` expects degrees while object rotation uses radians; context-switch tax during improvisation | High     | Add `rotateDeg()` and `rotateRad()`; keep `rotate()` as compatibility alias with warning                                 |
| Orbit controls require `Alt` with no API-level signal | `src/three/HydraOrbitControls.js:833`; `src/three/HydraOrbitControls.js:1034`; `README.md:136`                                      | “Controls don’t work” is a common live-coding interruption if modifier key behavior is not obvious            | High     | Add `controls.modifier` option (`none`, `alt`, `shift`, `meta`)                                                          |
| Surface is broad and abbreviation-heavy               | `docs/api.md:15`; `docs/api.md:18`; `docs/api.md:136`; `src/hydra-synth.js:194`                                                     | Memorization load is high for newcomers and occasional users                                                  | Medium   | Add long-name aliases (`geom`, `mat`, `tex`, `compose`, `random`, `noise`) and a smaller “fast path” Stage API           |
| Implicit scene/object reuse by name                   | `src/three/scene.js:382`; `src/three/scene.js:411`; `src/three/scene.js:827`                                                        | Re-running snippets may mutate prior objects unexpectedly if names match                                      | Medium   | Make reuse explicit (`reuse: true`) and default to fresh scene in live mode                                              |
| `.out()` pass routing is hard to predict              | `src/output.js:181`; `src/output.js:192`; `docs/reference/semantic-clarifications.md:46`                                            | FX + renderTarget combinations require understanding internals                                                | Medium   | Add explicit `render({ to, fx, target })` API with deterministic routing                                                 |
| Synonyms/aliases are inconsistent                     | `src/three/scene.js:564`; `src/three/scene.js:568`; `src/three/scene.js:660`; `src/output.js:201`                                   | Multiple spellings increase cognitive branching while live-editing                                            | Medium   | Define canonical names (`lineLoop`, `lineStrip`, `css2d`, `css3d`) and keep aliases as deprecations only                 |

## C) Proposed API vNext

Design principles:

1. One-liner to first 3D visual.
2. Full-word names by default; short aliases optional.
3. Explicit runtime, no hidden active context.
4. Explicit units (`Deg`/`Rad`) where ambiguity exists.
5. Stable public API; underscore methods private.
6. Presets for camera/lights/world to keep creative flow fast.
7. Escape hatch to current low-level APIs for power users.

TypeScript-style surface:

```ts
type ControlModifier = "none" | "alt" | "shift" | "meta";

interface HydraVNext {
  stage(config?: StageConfig): Stage;
  onFrame(fn: (dtMs: number, timeSec: number) => void): void;
  liveGlobals(enable?: boolean): void; // explicit global opt-in

  // friendly namespaces (legacy aliases kept: gm, mt, tx, cmp, rnd, nse)
  geom: GeometryApi;
  mat: MaterialApi;
  tex: TextureApi;
  compose: ComposeApi;
  random: RandomApi;
  noise: NoiseApi;
}

interface StageConfig {
  name?: string;
  background?: number | string;
  reuse?: boolean;
  camera?:
    | "ortho"
    | "perspective"
    | {
        type?: "ortho" | "perspective";
        eye?: [number, number, number];
        target?: [number, number, number];
        controls?: { enabled?: boolean; modifier?: ControlModifier };
      };
  lights?: false | "basic" | "studio" | Record<string, unknown>;
  world?: false | "ground" | "atmosphere" | Record<string, unknown>;
  clear?: number | { amount: number; color?: number | string };
}

interface Stage {
  add(geom: unknown, mat?: unknown, opts?: Record<string, unknown>): this;
  box(mat?: unknown, opts?: Record<string, unknown>): this;
  sphere(mat?: unknown, opts?: Record<string, unknown>): this;
  points(
    grid?: number | [number, number],
    mat?: unknown,
    opts?: Record<string, unknown>,
  ): this;
  lines(
    spec?: number | [number, number],
    mat?: unknown,
    opts?: Record<string, unknown>,
  ): this;
  lineStrip(
    spec?: number | [number, number],
    mat?: unknown,
    opts?: Record<string, unknown>,
  ): this;
  lineLoop(
    spec?: number | [number, number],
    mat?: unknown,
    opts?: Record<string, unknown>,
  ): this;
  instanced(
    geom: unknown,
    mat: unknown,
    count: number,
    opts?: Record<string, unknown>,
  ): unknown;

  group(name?: string, attrs?: Record<string, unknown>): unknown;
  obj(index?: number): unknown;
  clear(amount?: number, color?: number | string): this; // alias of autoClear
  fx(options: Record<string, unknown>): this;
  render(
    out?: unknown,
    options?: { target?: unknown; css?: "2d" | "3d" | false },
  ): this; // alias of out
  texture(out?: unknown, options?: Record<string, unknown>): unknown; // alias of tex
}

interface SignalChain {
  rotateDeg(angle?: number, speed?: number): SignalChain;
  rotateRad(angle?: number, speed?: number): SignalChain;
  material(
    type?: "basic" | "lambert" | "phong",
    opts?: Record<string, unknown>,
  ): unknown;
}
```

## D) Before/After Usage Examples

1. Task: textured spinning box  
   Evidence: `examples/box.js:2`, `examples/box.js:9`

Old:

```js
perspective([2, 2, 3], [0, 0, 0], { controls: true });
const geom = gm.box();
const mat = osc().rotate(noise(1).mult(45)).phong();
const sc = scene().lights().mesh(geom, mat).out();
update = () => {
  const box = sc.at(0);
  box.rotation.x += 0.01;
  box.rotation.y += 0.01;
};
```

New:

```js
const st = H.stage({
  camera: {
    type: "perspective",
    controls: { enabled: true, modifier: "none" },
  },
  lights: "basic",
})
  .box(osc().rotateDeg(noise(1).mult(45)).material("phong"))
  .render();

H.onFrame(() => {
  const box = st.obj(0);
  box.rotation.x += 0.01;
  box.rotation.y += 0.01;
});
```

Estimate: ~40-45% fewer lines/keystrokes.

2. Task: points trail  
   Evidence: `examples/points/dots.js:8`, `examples/points/dots.js:10`

Old:

```js
scene()
  .points([500, 500], mt.dots(pos, size, color))
  .autoClear(0.001)
  .out();
```

New:

```js
H.stage({ camera: "ortho" })
  .points([500, 500], H.mat.dots(pos, size, color))
  .clear(0.001)
  .render();
```

Estimate: ~30-35% fewer keystrokes.

3. Task: scene-to-texture bridge  
   Evidence: `examples/tex-map.js:12`, `examples/tex-map.js:25`

Old:

```js
const dotsTex = scene({ background: color(1, 1, 1) })
  .points([500, 500], dotsMat)
  .tex(o1);

const sc = scene().lights({ all: true, intensity: 2.5 }).world({}).out();
```

New:

```js
const dotsTex = H.stage({ background: color(1, 1, 1) })
  .points([500, 500], dotsMat)
  .texture(o1);

H.stage({ lights: { all: true, intensity: 2.5 }, world: "ground" }).render();
```

Estimate: ~30% fewer lines, clearer intent.

4. Task: instanced geometry (without private APIs)  
   Evidence: `examples/box-instanced-grid.js:34`, `docs/reference/semantic-clarifications.md:58`

Old:

```js
const sc = scene({ background: color(1, 1, 0) })
  .lights()
  .out();
const box = sc._mesh(geom, mat, { instanced: count });
```

New:

```js
const st = H.stage({ background: color(1, 1, 0), lights: "basic" }).render();
const box = st.instanced(geom, mat, count);
```

Estimate: ~25% fewer keystrokes and no internal method dependency.

5. Task: world+fog setup for creative scene  
   Evidence: `site/playground/examples.js:666`, `site/playground/examples.js:668`

Old:

```js
const sc = scene({ background: color(0.95, 0.97, 1) })
  .lights({ all: true, intensity: params.light })
  .world({ ground: true, fog: true, far: params.far })
  .out();
```

New:

```js
const st = H.stage({
  background: color(0.95, 0.97, 1),
  lights: { preset: "studio", intensity: params.light },
  world: { preset: "atmosphere", ground: true, far: params.far },
}).render();
```

Estimate: ~20-25% fewer keystrokes, better discoverability via presets.

## E) Migration Strategy

Phase 1 (non-breaking, fastest ROI)

1. Add aliases only: `stage` -> `scene`, `render` -> `out`, `clear` -> `autoClear`.
2. Add friendly namespaces alongside legacy: `geom/mat/tex/compose/random/noise`.
3. Stop teaching internals in examples/docs.

- Deprecation/shim: keep old names fully functional.
- Risk: low.
- Fallback: disable aliases behind feature flag if regressions appear.

Phase 2 (additive vNext surface)

1. Introduce `stage(config)` presets and `onFrame`.
2. Add `rotateDeg` + `rotateRad`; keep `rotate` as compatibility alias.
3. Add control modifier option for orbit controls.

- Deprecation/shim: console warnings for ambiguous `rotate` and `_` methods.
- Risk: medium (docs and examples must be synchronized).
- Fallback: `legacy: true` runtime option to keep old behavior defaults.

Phase 3 (breaking cleanup, major version)

1. Flip default from global to non-global.
2. Make canonical method names primary (`lineLoop`, `lineStrip`), keep old aliases behind compat layer.
3. Make scene/object reuse opt-in (`reuse: true`) for named resources.

- Deprecation/shim: one major cycle with warnings + codemod.
- Risk: high for existing live sets relying on globals.
- Fallback: publish `@legacy` compatibility bundle for transition period.

## F) Quick Wins (next 1-2 sprints)

1. Remove internal `_mesh` from public examples  
   Files: `examples/box-instanced-grid.js:34`, `docs/reference/semantic-clarifications.md:55`  
   Why: immediate API trust improvement.

2. Add friendly namespace aliases on `synth`  
   Files: `src/hydra-synth.js:194`, `src/index.d.ts:185`, `docs/api.md:136`  
   Why: faster discoverability without breakage.

3. Add `render()` and `clear()` aliases  
   Files: `src/lib/mixins.js:188`, `src/lib/mixins.js:169`, `src/index.d.ts:83`  
   Why: lower cognitive overhead in live sessions.

4. Make orbit modifier configurable  
   Files: `src/three/HydraOrbitControls.js:833`, `src/lib/mixins.js:45`, `README.md:136`  
   Why: removes “controls feel broken” live-coding interruption.

5. Add explicit rotate unit helpers  
   Files: `src/glsl/glsl-functions.js:360`, `docs/reference/semantic-clarifications.md:7`  
   Why: resolves high-frequency unit confusion.

6. Remove hidden global dependency from `arr.image`  
   Files: `src/three/arr.js:191`, `src/index.d.ts:120`  
   Why: cleaner runtime ownership and fewer surprising failures.

## Notes on priority

- Speed and creativity impact were weighted using actual example usage and docs patterns, where `scene()`, `.out()`, `mt.*`, and camera helpers dominate (`examples/**/*.js`, `docs/**/*.md`).
- The highest-value simplifications are those reducing ambiguity and ceremony in the first 30-60 seconds of live coding.

## Addendum: Continuous Live-Coding (Implemented)

This specific redesign goal is now implemented as the default runtime behavior.

1. New constructor/runtime option

- `liveMode: "restart" | "continuous"` added to runtime options and synth surface in `src/hydra-synth.js:133`, `src/hydra-synth.js:146`, `src/hydra-synth.js:182`.
- Default constructor behavior now uses `continuous` live mode in `src/hydra-synth.js:133`.
- Type definitions added in `src/index.d.ts:17`, `src/index.d.ts:34`, `src/index.d.ts:171`, `src/index.d.ts:204`.

2. Continuous eval lifecycle

- `HydraRenderer.eval` now wraps eval with scene reconciliation hooks when mode is continuous in `src/hydra-synth.js:287`.
- Lifecycle hooks are implemented in `src/three/scene.js:272` and `src/three/scene.js:286`.

3. Scene/object reconciliation for live reruns

- Live-eval state, deterministic auto-naming, touch tracking, and pruning are implemented in `src/three/scene.js:110`, `src/three/scene.js:132`, `src/three/scene.js:151`, `src/three/scene.js:180`, `src/three/scene.js:199`.
- Reconciliation gate now runs on graph mutations or touched scenes in `src/three/scene.js:310`.

4. Playground UX support

- Mode selector (`Continuous`/`Restart`) added in `site/playground/index.html:178`.
- Runtime mode state, URL persistence, and mode-specific run behavior are wired in `site/playground/playground.js:5`, `site/playground/playground.js:27`, `site/playground/playground.js:313`, `site/playground/playground.js:334`, `site/playground/playground.js:401`.
- Documentation updated in `docs/playground.md:51` and `docs/reference/parameter-reference.md:22`.

5. Explicit runtime reset API

- `resetRuntime()` is now exposed on both runtime and synth surfaces in `src/hydra-synth.js:184`, `src/hydra-synth.js:325`, `src/index.d.ts:175`, `src/index.d.ts:215`.
- Playground adds separate `Reset Runtime` action in `site/playground/index.html:185` and `site/playground/playground.js:99`, `site/playground/playground.js:396`.

## G) Continuous Mode: Remaining Gaps (Post-Implementation)

Update (2026-02-22): stale-object deletion on subtractive eval is addressed by scene-touch reconciliation in `src/three/scene.js:580`, `src/three/scene.js:590`, `src/three/scene.js:610`, with smoke coverage in `scripts/smoke/browser-non-global-smoke.mjs:188`, `scripts/smoke/browser-non-global-smoke.mjs:555`. Stable identity keys are supported through `key` in scene/object attrs via `src/three/scene.js:676`, `src/three/scene.js:711`, `src/three/scene.js:1158`, and typed in `src/index.d.ts:53`, `src/index.d.ts:60`. Prune-time and replacement-time resource disposal are implemented via `src/three/scene.js:368`, `src/three/scene.js:610`, `src/three/scene.js:652`, with smoke coverage in `scripts/smoke/browser-non-global-smoke.mjs:249`, `scripts/smoke/browser-non-global-smoke.mjs:292`, `scripts/smoke/browser-non-global-smoke.mjs:570`, `scripts/smoke/browser-non-global-smoke.mjs:580`. Continuous-mode guidance now includes a one-time unkeyed hint via `src/three/scene.js:20`, `src/three/scene.js:169`, `src/three/scene.js:567`, `src/three/scene.js:575`, with smoke coverage in `scripts/smoke/browser-non-global-smoke.mjs:177`, `scripts/smoke/browser-non-global-smoke.mjs:590`. Restart-mode input rebinding is addressed via runtime-pointer routing in `src/canvas.js:42`, `src/canvas.js:44`, with cleanup in `src/hydra-synth.js:785` and smoke coverage in `scripts/smoke/browser-non-global-smoke.mjs:365`, `scripts/smoke/browser-non-global-smoke.mjs:367`, `scripts/smoke/browser-non-global-smoke.mjs:595`, `scripts/smoke/browser-non-global-smoke.mjs:600`.

| Issue                                                      | Evidence (`file:line`)                                                                                           | Why confusing                                                                                                                                         | Severity | Suggested fix                                                                                                              |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| Eval-order object identity drift (when `key` is omitted)   | `src/three/scene.js:133`; `src/three/scene.js:155`; `src/three/scene.js:711`; `src/index.d.ts:53`              | Reordering lines can still retarget unnamed objects because fallback identity remains eval-order-based for sketches that do not opt into `key`        | Medium   | Continue migrating examples/docs to `key` and provide a codemod for unkeyed object creation in continuous mode             |
| Auto-generated live names can collide with user naming     | `src/three/scene.js:17`; `src/three/scene.js:155`; `src/three/scene.js:676`; `src/three/scene.js:711`          | Users can accidentally pick `__live_*` names and trigger unexpected reuse behavior in continuous mode                                                 | Medium   | Reserve live identity in `userData` (symbol/private key) and stop relying on public object names for unnamed tracking      |

## H) Updated Quick Wins (next 1-2 sprints)

Update (2026-02-22): explicit `key` usage was added to first-touch examples/docs in `site/playground/examples.js:55`, `examples/box.js:9`, and `docs/reference/parameter-reference.md:33`. Replaced-resource disposal, restart input rebinding, and the continuous unkeyed hint are implemented in `src/three/scene.js:652`, `src/canvas.js:42`, and `src/three/scene.js:567`.

1. Continue migrating remaining examples to explicit `key` usage  
   Files: `site/playground/examples.js:115`, `site/playground/examples.js:388`, `examples/tex-map.js:25`  
   Why: closes the remaining eval-order drift cases in sketches users copy and remix.

2. Reserve internal live-name prefix and stop depending on public names for unnamed identity  
   Files: `src/three/scene.js:17`, `src/three/scene.js:155`, `src/three/scene.js:676`  
   Why: avoids accidental collisions when users deliberately set names that overlap live-generated markers.

3. Regenerate API docs and keep them in lockstep  
   Files: `docs/api.md:3`, `package.json:35`, `package.json:63`  
   Why: improves discoverability and trust in public API docs.

## I) Impact x Frequency Ranking (Execution Order)

| Rank | Issue                                                       | Impact evidence (`file:line`)                                                           | Frequency evidence (`file:line`)                                                         | Score (I x F) |
| ---- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------- |
| 1    | Globals still default-on in runtime and playground          | `src/hydra-synth.js:123`; `src/hydra-synth.js:350`; `site/playground/playground.js:344` | `examples/box.js:2`; `site/playground/examples.js:55`                                    | 4 x 4 = 16    |
| 2    | Orbit controls hard-gated by `Alt` modifier                 | `src/three/HydraOrbitControls.js:833`; `src/three/HydraOrbitControls.js:1034`           | `examples/box.js:1`; `site/playground/examples.js:49`; `site/playground/examples.js:812` | 4 x 3 = 12    |
| 3    | Rotation unit mismatch (`rotate` degrees vs object radians) | `src/glsl/glsl-functions.js:376`; `examples/box.js:6`; `examples/box.js:16`             | `site/playground/examples.js:52`; `examples/box.js:6`                                    | 3 x 4 = 12    |
| 4    | Hidden runtime fallback context in helper modules           | `src/three/runtime.js:25`; `src/three/mt.js:151`; `src/three/tx.js:264`                 | `site/playground/examples.js:57`; `site/playground/examples.js:116`                      | 4 x 2 = 8     |
| 5    | Eval-order drift for sketches that omit `key`               | `src/three/scene.js:133`; `src/three/scene.js:711`; `src/index.d.ts:53`                 | `site/playground/examples.js:115`; `examples/tex-map.js:25`                              | 3 x 2 = 6     |
| 6    | Auto-generated live names can collide with user naming      | `src/three/scene.js:17`; `src/three/scene.js:155`; `src/three/scene.js:676`             | `docs/concepts/scene-graph.md:8`; `docs/reference/parameter-reference.md:33`             | 2 x 2 = 4     |

## J) Speed/Creativity Success Metrics

1. Speed metric: time-to-first-visible-3D should stay one sketch block with no mandatory boilerplate.
   Evidence baseline: first playground example reaches render via `scene({ key: ... }).lights().mesh(..., { key: ... }).out()` in `site/playground/examples.js:55`.
2. Creativity metric: iterative reruns in continuous mode should not duplicate stale graph content after subtractive edits.
   Evidence baseline: reconciliation gate includes touched-scene evals in `src/three/scene.js:590`, with browser smoke coverage in `scripts/smoke/browser-non-global-smoke.mjs:188` and `scripts/smoke/browser-non-global-smoke.mjs:555`.
3. Stability metric: keyed objects should preserve identity across eval reorder in continuous mode.
   Evidence baseline: keyed identity binding in `src/three/scene.js:205` and smoke coverage in `scripts/smoke/browser-non-global-smoke.mjs:224`, `scripts/smoke/browser-non-global-smoke.mjs:565`.
4. Safety metric: long sessions should not accumulate unreleased scene resources after prune cycles.
   Evidence baseline: prune and replacement paths now dispose unretained geometry/material while preserving shared resources in `src/three/scene.js:368`, `src/three/scene.js:652`, with smoke coverage in `scripts/smoke/browser-non-global-smoke.mjs:249`, `scripts/smoke/browser-non-global-smoke.mjs:292`, `scripts/smoke/browser-non-global-smoke.mjs:570`, `scripts/smoke/browser-non-global-smoke.mjs:580`.
5. Restart stability metric: input handlers should follow the active runtime after disposal/recreation on the same canvas.
   Evidence baseline: canvas input dispatch now routes via runtime pointer in `src/canvas.js:42`, with cleanup in `src/hydra-synth.js:785` and smoke coverage in `scripts/smoke/browser-non-global-smoke.mjs:365`, `scripts/smoke/browser-non-global-smoke.mjs:367`, `scripts/smoke/browser-non-global-smoke.mjs:595`, `scripts/smoke/browser-non-global-smoke.mjs:600`.
6. Guidance metric: unkeyed continuous eval should emit a one-time hint toward `key`.
   Evidence baseline: hint gate and warning path are in `src/three/scene.js:567`, `src/three/scene.js:575`, with smoke coverage in `scripts/smoke/browser-non-global-smoke.mjs:177`, `scripts/smoke/browser-non-global-smoke.mjs:590`.
7. Stability metric: generated API docs should always reflect public typings before merge.
   Evidence baseline: docs are generated (`docs/api.md:3`) and CI includes docs-sync verification (`package.json:63`).
