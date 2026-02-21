# hydra-three vs upstream hydra-synth: high-level differences

## Comparison scope

- Upstream scanned: `/Users/kasparsj/Work2/hydra/hydra-synth` (`up-main`, `c3ba80b`)
- Fork scanned: `/Users/kasparsj/Work2/hydra/hydra-three` (`main`, `256bc90`, plus current working tree changes)
- Scan date: 2026-02-21
- Method: full file-tree diff (excluding `.git/` and `node_modules/`) plus manual review of runtime, shader/compiler, packaging, CI, docs, and examples.

## Diff size at a glance

- Files added in `hydra-three`: 121
- Files removed from upstream: 6
- Files modified from upstream: 22
- Source tree growth:
  - `src/` files: 25 -> 67
  - `src/` JS+shader LOC (approx): 3,498 -> 9,604

## 1) Core architecture shift: regl pipeline -> three.js runtime

- Rendering backend was replaced:
  - Upstream: regl-based fullscreen shader ping-pong pipeline.
  - Fork: three.js renderer + `EffectComposer` pass graph.
- New 3D render abstractions were added:
  - `HydraPass`, `HydraShaderPass`, `HydraMaterialPass`, `HydraRenderPass`, `HydraFadePass`
  - `HydraUniform` registry for shared runtime uniforms (`time`, `resolution`, textures, bpm, mouse)
  - `HydraShader`/`HydraFragmentShader`/`HydraVertexShader` for shader assembly against three.js materials.
- Output model changed:
  - Upstream output = regl draw command + framebuffer ping-pong.
  - Fork output = per-output `EffectComposer` with multi-pass render/material/fx/layer support and render-to-texture helpers.

## 2) New 3D scene/camera/object API layer

- `hydra-three` adds a full 3D scene API (`src/three/scene.js`) on top of Hydra sources:
  - Scene creation and reuse, groups, mesh/line/points primitives, instancing, CSS2D/CSS3D objects.
  - Camera mixins: `perspective()`, `ortho()`, coordinate-space helpers (`screenCoords`, `normalizedCoords`, `cartesianCoords`).
  - Built-in camera controls via `HydraOrbitControls`.
  - World/lights integration (`scene().lights()`, `scene().world()`), helpers (`axesHelper`, lookup/filter helpers).
- New object/resource utility modules were added:
  - Geometry (`gm`), material (`mt`), texture/FBO (`tx`), composition layout (`cmp`), noise (`nse`), random (`rnd`), math (`math`), typed array/image tools (`arr`), global constructors (`three/globals`), GUI helpers (`gui`), DOM element helpers (`el`).

## 3) Public runtime API changes (`HydraRenderer` / `hydra.synth`)

- Constructor options expanded:
  - Added `webgl`, `css2DElement`, `css3DElement`.
- `hydra.synth` now exposes substantially more runtime surface:
  - Added `canvas`, `scene`, `shadowMap`, camera helpers, module namespaces (`tx`, `gm`, `mt`, `cmp`, `rnd`, `nse`, `gui`, `arr`, `el`).
- Event hooks were added to synth state:
  - `click`, `mousedown`, `mouseup`, `mousemove`, `keydown`, `keyup`.
  - `canvas.js` binds DOM listeners and routes to these hooks.
- Script loading behavior changed:
  - `loadScript(url, once = true)` now supports one-time dedupe by URL.
- `setResolution()` behavior changed:
  - Now updates CSS2D/CSS3D renderers in addition to outputs/sources.

## 4) Shader/generator/compiler system expansion

- Generator factory changed:
  - Introduced `types.js` type system (`typeLookup`, casting, gen-type replacement).
  - Added utility-function registry support (`util` transforms).
  - Added transform categories: `vert`, `genType`, `glsl`.
- GLSL source pipeline changed:
  - `GlslSource` now compiles to richer pass descriptors (material/camera/viewport/fx/autoclear aware), not just plain fragment pass objects.
  - Added material helpers on shader chains: `.basic()`, `.lambert()`, `.phong()`, `.material()`.
  - Added source-channel swizzle getters (`.x`, `.xy`, `.xyz`, etc.) and `.st()` transform stitching.
  - Added render-to-texture helpers through output pipeline (`tex`, `texMat` path).
- GLSL codegen changed:
  - Now supports vertex-aware paths and mixed source+scene combine flows.
  - Combine/combineCoord handling can synthesize temporary render passes for mixed pipelines.

## 5) Hydra transform/function set changes

- Added source/noise/color constructors and generic operators in `glsl-functions`:
  - New noise-related generators: `snoise`, `pnoise`, `wnoise`, `cnoise`, `fbm`.
  - New color constructors: `solid2`, `solid3`, `hex`.
  - New generic operations (`genType`): `map`, `sin`, `cos`, `tan`, `atan`, `pow`.
  - Added `glsl` raw expression transform type.
- Utility GLSL library expanded (`utility-functions`) with more reusable internal helpers (`_twopi`, `_permute`, `_mod289`, `_taylorInvSqrt`, `_pnoise`, etc.).
- Behavior-level transform changes include:
  - `rotate()` now treats angle as degrees (internally converts to radians), unlike upstream’s direct-radian style.
  - `src()` includes `glsl300` variant for GLSL3 texture sampling.

## 6) Source/media/texture pipeline changes

- `HydraSource` texture implementation switched from regl textures to three.js textures:
  - `CanvasTexture`, `VideoTexture`, `TextureLoader`.
  - Stream/camera/video/screen init paths adapted accordingly.
- Source cleanup semantics changed:
  - `clear()` disposes texture and nulls it (instead of resetting to 1x1 regl texture).
- Canvas source resize bug fixed:
  - width/height mismatch check now uses `||` (not `&&`), so one-axis changes trigger resize.
- New texture infrastructure via `tx`:
  - Data textures, array textures, atlas packing, wrap/repeat/mirror helpers, render targets, texture save/load helpers.

## 7) Build, packaging, and module-loading changes

- Toolchain replaced:
  - Upstream: `browserify` + `budo` + `esmify`.
  - Fork: Vite (`vite`, `vite-plugin-glslify`) + ESM-first scripts.
- Distribution entrypoint changed:
  - `package.json` `main` now points to `dist/hydra-synth.js`.
  - ESM import now routes through `src/package-entry.js`, which explicitly enforces browser runtime and then loads bundle.
- Package metadata changed:
  - Version bumped to `1.4.1`.
  - Repo/homepage/issues changed to `kasparsj/hydra-three`.
  - `files` allowlist added for pack contents.
- Dependency set changed:
  - Removed runtime dependency on `regl`.
  - Added `three`, `gl-mat4`, `glsl-film-grain`.
  - Added dev dependencies for lint/typecheck/format/test/build tooling (`eslint`, `typescript`, `prettier`, `playwright`, Vite ecosystem).

## 8) Testing, quality gates, and release engineering added

- New CI workflows:
  - `ci.yml`: Node matrix build + smoke tests + packaging dry-run.
  - `release-verify.yml`: tag-triggered full verification + tarball/checksum artifacts.
  - `pages.yml`: automated GitHub Pages build/deploy.
- New smoke/regression test scripts:
  - Canvas smoke.
  - Module-load/import smoke.
  - Regression smoke for previously fixed runtime bugs.
  - Browser smoke in Chromium/Firefox.
  - Non-global 3D browser smoke.
- New quality gates:
  - `lint`, `typecheck`, `format:check`, release metadata checks, checksum generation.

## 9) Documentation and developer experience expansion

- Added operational docs:
  - `docs/getting-started.md`
  - `docs/production-checklist.md`
  - `docs/release.md`
- Added governance/support docs:
  - `CONTRIBUTING.md`
  - `SECURITY.md`
- README was rewritten around fork identity, distribution model, browser-only runtime contract, and 3D quickstart.
- New examples catalog (`examples/`) focused on 3D/scene APIs.
- Added static docs/examples website generator and checked-in generated output (`site-dist/`).

## 10) Repository/process additions

- Added issue templates for bug/performance/creative regression reports.
- Added release and site build scripts under `scripts/`.
- Added tarball artifacts in repo (`hydra-synth-1.4.0.tgz`, `hydra-synth-1.4.1.tgz`) and release checksum workflow support.

## 11) Components removed or replaced from upstream

- Removed upstream-only files/paths:
  - `assets/hydra-webpage.png`
  - `dev/examples.js`
  - `dev/style.css`
  - `src/shader-generator.js`
  - `src/shaderManager.js`
  - `src/glsl/gaussian.frag` (moved to shared shader location)
- Replaced/obsoleted architecture:
  - regl-centric output/pipeline implementation is superseded by three.js render/composer pass architecture.

## 12) Practical compatibility impact summary

- Existing 2D Hydra shader patterns still exist, but runtime behavior is now anchored to three.js rendering internals.
- Projects depending on regl internals or upstream package-loading assumptions may require adaptation.
- ESM consumers now must run in browser-like runtime contexts (pure Node/SSR import is explicitly unsupported).
- New 3D APIs are first-class and deeply integrated, not thin add-ons.
