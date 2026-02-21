# Hydra-Three Release Readiness Report

Date: 2026-02-21  
Repository: `/Users/kasparsj/Work2/hydra/hydra-three`

## 1) Release readiness score

**Score: 9.5 / 10**

Why:
- Build/dev migrated to Vite and validated (`build`, `build:debug`, `ci:check`, browser smoke).
- CI parity gap is closed: push/PR CI now runs `lint` + `typecheck` in addition to build/smoke/package checks.
- Security posture is clean for production and full dependency trees (`npm audit --omit=dev` and `npm audit` both 0).
- Lifecycle and multi-instance support materially improved (`dispose()`, runtime registry/binding, multi-instance browser smoke).
- Public API contract is more explicit (new `docs/api.md`, shipped `src/index.d.ts`, `types` metadata in package).
- Remaining risk is now concentrated in lifecycle edge cases for globals/caches and output clear/fade behavior.

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
- If user tooling overrides/removes browser global shims, some legacy dependencies may still fail.
- GUI remote loading depends on script availability (dat.gui CDN path).
- Browser smoke commands require Playwright browser binaries installed.

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
- `makeGlobal: true`: installs methods into `window`
- `makeGlobal: false`: namespaced usage via `hydra.synth.*`

## 4) Packaging audit

- Name/version: `hydra-synth@1.4.1`
- Main artifact: `/Users/kasparsj/Work2/hydra/hydra-three/dist/hydra-synth.js`
- Build system: Vite + custom GLSL compile plugin
  - `/Users/kasparsj/Work2/hydra/hydra-three/vite.config.js`
  - `/Users/kasparsj/Work2/hydra/hydra-three/scripts/build/vite-glslify-plugin.mjs`
- Dist determinism guard:
  - `/Users/kasparsj/Work2/hydra/hydra-three/scripts/build/prepare-dist.mjs`
- Tarball audit (`npm pack --dry-run --json`):
  - `entryCount`: 92 files
  - package size: 403,609 bytes
  - unpacked size: 2,106,269 bytes
  - filename: `hydra-synth-1.4.1.tgz`
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
  - `/Users/kasparsj/Work2/hydra/hydra-three/scripts/smoke/browser-non-global-smoke.mjs`
  - `/Users/kasparsj/Work2/hydra/hydra-three/scripts/smoke/browser-multi-instance-smoke.mjs`

### CI posture
- CI push/PR (`/Users/kasparsj/Work2/hydra/hydra-three/.github/workflows/ci.yml`) now includes:
  - install, lint, typecheck, build, site build, smoke, browser smoke (Node 20), pack dry-run
- Release verify (`/Users/kasparsj/Work2/hydra/hydra-three/.github/workflows/release-verify.yml`) runs `ci:check` + browser smoke + release artifacts.

### Security posture
- `npm audit --omit=dev`: 0 vulnerabilities
- `npm audit`: 0 vulnerabilities
- Policy file present: `/Users/kasparsj/Work2/hydra/hydra-three/SECURITY.md`

### Verification snapshot (run on 2026-02-21)
- `npm run ci:check`: pass
- `npm run test:smoke:browser`: pass (chromium, firefox, non-global, multi-instance)
- `npm pack --dry-run --json`: pass
- `npm audit --omit=dev --json`: pass (0 vulnerabilities)
- `npm audit --json`: pass (0 vulnerabilities)

## 6) Known-bug candidates

These are current highest-probability risk candidates:

1. Global scene/object registries can leak or collide across long-running multi-instance sessions  
- Pointer: `/Users/kasparsj/Work2/hydra/hydra-three/src/three/scene.js:16`  
- Detail: module-level caches (`scenes`, `groups`, named meshes/lines/points maps) are process-global and not reset on renderer disposal.

2. Output-level clear/fade pipeline is explicitly marked unstable  
- Pointer: `/Users/kasparsj/Work2/hydra/hydra-three/src/output.js:136`  
- Detail: inline TODO states output-level clear/fade are not working properly; related render-target chaining caveat is noted at `/Users/kasparsj/Work2/hydra/hydra-three/src/output.js:160`.

3. Global helper lifecycle is not fully scoped to instance lifetime  
- Pointer: `/Users/kasparsj/Work2/hydra/hydra-three/src/hydra-synth.js:136`  
- Detail: `window.loadScript` / `window.getCode` assignment is not explicitly reverted on `dispose()`.

4. Debug helper leaks into `window` regardless of global mode  
- Pointer: `/Users/kasparsj/Work2/hydra/hydra-three/src/generator-factory.js:139`  
- Detail: `window.processFunction = processFunction` executes whenever `window` exists, even in `makeGlobal: false`.

5. Public TypeScript contract is intentionally broad and may under-constrain users  
- Pointer: `/Users/kasparsj/Work2/hydra/hydra-three/src/index.d.ts:24`  
- Detail: index signatures and `any`-heavy module APIs reduce static safety and IDE guidance.

## 7) Missing features (ranked by impact)

1. **Per-instance scene/cache lifecycle cleanup (high impact)**  
Remove/namespace global caches in `scene.js`, ensure dispose semantics reclaim all instance-bound objects.

2. **Output clear/fade correctness in pass pipeline (high impact)**  
Resolve output-level clear/fade behavior and render-target ordering edge cases in `output.js`.

3. **Strict global-mode lifecycle contract (medium-high impact)**  
Guarantee all window mutations are reversible and scoped per instance, including helper globals and conflict handling.

4. **Stronger public typing (medium impact)**  
Move from broad `any` contracts toward typed module/function signatures for core synth + 3D helpers.

5. **Deeper deterministic regression coverage (medium impact)**  
Expand unit-level checks for scene/world edge cases, dispose behavior, output clear/fade, and cache isolation.

6. **SPDX metadata polish (low impact)**  
Normalize license metadata to SPDX form for ecosystem tooling consistency.

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
- Multi-instance and dispose regressions remain covered in browser smoke.
- Known bug candidates #1-#3 are fixed or explicitly documented as constraints.
- Full dependency audit stays clean across consecutive RCs.

### Milestone 3: v1.0
Goal: durable public API and long-term integration confidence.

Acceptance criteria:
- Versioned API reference + tightened TypeScript surface.
- Fully scoped lifecycle semantics (single-instance and multi-instance) with explicit guarantees.
- Semver/deprecation policy integrated into release process.
- Two consecutive release cycles with zero high-severity regressions.
