# Hydra-Three Release Readiness Report

Date: 2026-02-21  
Repository: `/Users/kasparsj/Work2/hydra/hydra-three`

## 1) Release readiness score

**Score: 9.8 / 10**

Why:
- Previously highest-risk runtime issues were fixed and validated:
  - scene/object caches are runtime-scoped (`/Users/kasparsj/Work2/hydra/hydra-three/src/three/scene.js`)
  - output clear/fade and explicit render-target routing were corrected (`/Users/kasparsj/Work2/hydra/hydra-three/src/output.js`, `/Users/kasparsj/Work2/hydra/hydra-three/src/three/HydraPass.js`)
  - global helper lifecycle is now reversible across overlapping instances (`/Users/kasparsj/Work2/hydra/hydra-three/src/hydra-synth.js`, `/Users/kasparsj/Work2/hydra/hydra-three/src/eval-sandbox.js`)
  - unconditional debug leak to `window` was removed (`/Users/kasparsj/Work2/hydra/hydra-three/src/generator-factory.js`)
- Browser smoke coverage was expanded to lock in these behaviors (`browser-non-global-smoke`, `browser-multi-instance-smoke`).
- CI and release-verify gates remain strong and passing.
- Remaining risk is now mostly ecosystem/polish-level rather than core runtime correctness.

## 2) User journey (new user in 10 minutes)

### Happy path (what works now)
1. Serve `/Users/kasparsj/Work2/hydra/hydra-three/examples/quickstart.html` over HTTP.
2. Load `/Users/kasparsj/Work2/hydra/hydra-three/dist/hydra-synth.js`.
3. Run:
   - `const hydra = new Hydra({ detectAudio: false, makeGlobal: true })`
   - `osc(8, 0.1, 0.8).out()`
4. Confirm animated canvas renders.
5. Optional 3D:
   - `perspective(...)`
   - `scene().lights().mesh(gm.box(), osc().phong()).out()`

### What still breaks or is easy to misuse
- `npm i hydra-synth` installs upstream package name by default; this fork still expects GitHub-ref install flow.
- Node/SSR runtime execution is unsupported by design (`/Users/kasparsj/Work2/hydra/hydra-three/src/package-entry.js:1`).
- GUI remote loading depends on script availability (dat.gui CDN path).
- Browser smoke commands require Playwright browser binaries installed.
- This codebase still mutates some browser globals (`Math`, `window.GridGeometry`) outside `makeGlobal` mode.

## 3) API surface summary (public entry points)

### Package entry points
- Root import: `hydra-synth` -> `/Users/kasparsj/Work2/hydra/hydra-three/src/package-entry.js`
- Root require: `hydra-synth` -> `/Users/kasparsj/Work2/hydra/hydra-three/dist/hydra-synth.js`
- Types: `hydra-synth` -> `/Users/kasparsj/Work2/hydra/hydra-three/src/index.d.ts`
- Subpath export: `hydra-synth/src/glsl/glsl-functions.js`

### Constructor and instance API
- `new Hydra(options)`
- Key methods: `eval`, `setResolution`, `tick`, `hush`, `scene`, `shadowMap`, `dispose`

### Runtime namespace (`hydra.synth`)
- Core synth lifecycle/state (`time`, `bpm`, `fps`, `update`, `afterUpdate`, etc.)
- Camera helpers (`perspective`, `ortho`, `screenCoords`, `normalizedCoords`, `cartesianCoords`)
- 3D/helper modules (`tx`, `gm`, `mt`, `cmp`, `rnd`, `nse`, `arr`, `gui`, `el`)
- GLSL transform API + `setFunction(...)` extension point

### Global mode
- `makeGlobal: true`: installs methods into `window` and helper globals (`loadScript`, `getCode`) during active instance lifetime.
- `makeGlobal: false`: namespaced usage via `hydra.synth.*`, with no `window.osc`/helper-global leakage in smoke coverage.

## 4) Packaging audit

- Name/version: `hydra-synth@1.0.0`
- Main artifact: `/Users/kasparsj/Work2/hydra/hydra-three/dist/hydra-synth.js`
- Build system: Vite + custom GLSL compile plugin
  - `/Users/kasparsj/Work2/hydra/hydra-three/vite.config.js`
  - `/Users/kasparsj/Work2/hydra/hydra-three/scripts/build/vite-glslify-plugin.mjs`
- Dist determinism guard:
  - `/Users/kasparsj/Work2/hydra/hydra-three/scripts/build/prepare-dist.mjs`
- Tarball audit (`npm pack --dry-run --json`):
  - `entryCount`: 92 files
  - package size: 406,202 bytes
  - unpacked size: 2,122,543 bytes
  - filename: `hydra-synth-1.0.0.tgz`
- Metadata quality:
  - present: `exports`, `types`, `main`, `unpkg`, `files`, `repository`, `bugs`, `homepage`
  - license string is `AGPL` (works, but SPDX normalization would be cleaner)

## 5) Quality audit

### Tests/checks in use
- Static:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run format:check`
- Node smoke:
  - `/Users/kasparsj/Work2/hydra/hydra-three/scripts/smoke/canvas-smoke.mjs`
  - `/Users/kasparsj/Work2/hydra/hydra-three/scripts/smoke/module-load-smoke.mjs`
  - `/Users/kasparsj/Work2/hydra/hydra-three/scripts/smoke/regression-smoke.mjs`
- Browser smoke:
  - `/Users/kasparsj/Work2/hydra/hydra-three/scripts/smoke/browser-smoke.mjs`
  - `/Users/kasparsj/Work2/hydra/hydra-three/scripts/smoke/browser-non-global-smoke.mjs` (non-global leak checks + output pipeline checks)
  - `/Users/kasparsj/Work2/hydra/hydra-three/scripts/smoke/browser-multi-instance-smoke.mjs` (runtime isolation + helper-global lifecycle checks)

### CI posture
- CI push/PR (`/Users/kasparsj/Work2/hydra/hydra-three/.github/workflows/ci.yml`) includes:
  - install, lint, typecheck, build, site build, smoke, browser smoke (Node 20), pack dry-run
- Release verify (`/Users/kasparsj/Work2/hydra/hydra-three/.github/workflows/release-verify.yml`) runs `ci:check` + browser smoke + release artifacts.

### Security posture
- `npm audit --omit=dev`: 0 vulnerabilities
- `npm audit`: 0 vulnerabilities
- Policy file present: `/Users/kasparsj/Work2/hydra/hydra-three/SECURITY.md`

### Verification snapshot (run on 2026-02-21)
- `npm run lint`: pass
- `npm run typecheck`: pass
- `npm run format:check`: pass
- `npm run ci:check`: pass
- `npm run test:smoke:browser`: pass (chromium, firefox, non-global, multi-instance)
- `npm pack --dry-run --json`: pass
- `npm audit --omit=dev --json`: pass (0 vulnerabilities)

## 6) Known-bug candidates

These are current highest-probability remaining risk candidates:

1. Implicit mutation of global `Math` API is not lifecycle-scoped  
- Pointer: `/Users/kasparsj/Work2/hydra/hydra-three/src/hydra-synth.js:154`  
- Detail: `Object.assign(Math, math)` is process-global and not reverted on `dispose()`.

2. Geometry helper exports `GridGeometry` onto `window` unconditionally  
- Pointer: `/Users/kasparsj/Work2/hydra/hydra-three/src/three/gm.js:4`  
- Detail: `window.GridGeometry` is assigned whenever `window` exists, independent of `makeGlobal`.

3. Runtime-less fallback store remains shared by design  
- Pointer: `/Users/kasparsj/Work2/hydra/hydra-three/src/three/scene.js:35`  
- Detail: `defaultStore` is module-scoped; low-frequency edge case if scene helpers are used without an active runtime.

4. Public TypeScript surface is improved but still broad for many dynamic transforms  
- Pointer: `/Users/kasparsj/Work2/hydra/hydra-three/src/index.d.ts:126`  
- Detail: dynamic index signatures and generic module methods still limit strict static guarantees.

5. GUI dependency still relies on remote script loading at runtime  
- Pointer: `/Users/kasparsj/Work2/hydra/hydra-three/src/gui.js:12`  
- Detail: external fetch of dat.gui can fail in restricted/offline environments.

## 7) Missing features (ranked by impact)

1. **Eliminate implicit global pollution (high impact)**  
Scope/guard/revert global mutations (`Math`, `window.GridGeometry`) under explicit lifecycle controls.

2. **Distribution clarity for fork consumers (high impact)**  
Reduce install ambiguity between upstream `hydra-synth` and this fork (publish strategy or explicit package identity guidance).

3. **Stronger strict-mode TypeScript contract (medium-high impact)**  
Move more runtime APIs from broad `unknown`/index signatures to typed module/function contracts.

4. **Deeper deterministic regression checks (medium impact)**  
Add focused tests for runtime-less helper invocation and edge render-pipeline chains.

5. **Offline-safe GUI strategy (medium-low impact)**  
Add local/fallback `dat.gui` strategy to avoid remote script dependency at runtime.

6. **SPDX metadata polish (low impact)**  
Normalize license metadata for ecosystem tooling consistency.

## 8) Roadmap

### Milestone 1: MVP Public (status: achieved)
Goal: safe public adoption for demos and small projects.

Acceptance criteria:
- `npm run ci:check` passes on clean clone.
- Chromium + Firefox browser smoke passes in CI.
- Quickstart success path works in <10 minutes.
- Release metadata + package dry-run checks pass.

### Milestone 2: Stable v0.x (status: in progress)
Goal: predictable behavior and low operational risk.

Acceptance criteria:
- CI gate parity remains enforced (`lint`, `typecheck`, smoke/browser smoke, pack check).
- Multi-instance and global lifecycle regressions remain covered in browser smoke.
- Known bug candidates #1-#2 are fixed or explicitly documented as constraints.
- Full dependency audit stays clean across consecutive RCs.

### Milestone 3: v1.0
Goal: durable public API and long-term integration confidence.

Acceptance criteria:
- Versioned API reference + tightened TypeScript surface.
- Fully scoped lifecycle semantics with explicit guarantees (including global/no-global behavior).
- Semver/deprecation policy integrated into release process.
- Two consecutive release cycles with zero high-severity regressions.
