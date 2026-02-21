# Hydra-Three Release Readiness Report

Date: 2026-02-21  
Last refreshed: 2026-02-21 (full verification rerun)
Repository: `/Users/kasparsj/Work2/hydra/hydra-three`

## 1) Release readiness score

**Score: 9.9 / 10**

Why:
- Core runtime regressions previously blocking release are fixed and covered in smoke tests:
  - scoped global helper lifecycle (`/Users/kasparsj/Work2/hydra/hydra-three/src/hydra-synth.js:316`, `/Users/kasparsj/Work2/hydra/hydra-three/src/hydra-synth.js:334`, `/Users/kasparsj/Work2/hydra/hydra-three/src/hydra-synth.js:723`)
  - scoped `Math` helper lifecycle for `makeGlobal: true` (`/Users/kasparsj/Work2/hydra/hydra-three/src/hydra-synth.js:344`, `/Users/kasparsj/Work2/hydra/hydra-three/src/hydra-synth.js:354`)
  - no unconditional `window.GridGeometry` mutation on module import (`/Users/kasparsj/Work2/hydra/hydra-three/src/three/gm.js:112`)
  - offline-safe GUI init fallback when `dat.gui` cannot load (`/Users/kasparsj/Work2/hydra/hydra-three/src/gui.js:87`, `/Users/kasparsj/Work2/hydra/hydra-three/src/gui.js:97`)
- Build toolchain migration to Vite is complete and stable in CI (`/Users/kasparsj/Work2/hydra/hydra-three/vite.config.js`, `/Users/kasparsj/Work2/hydra/hydra-three/scripts/build/prepare-dist.mjs`).
- Validation gates pass cleanly: lint, typecheck, format, smoke, browser smoke, package dry-run, audits.
- Remaining risk is now mostly integration/distribution polish, not core rendering correctness.

## 2) User journey (new user in 10 minutes)

### Happy path (works)
1. Install this fork (not upstream npm package):
   - `npm i github:kasparsj/hydra-three#v1.0.0 three`
2. Start local dev:
   - `npm run dev`
3. In app code:
   - `import Hydra from "hydra-synth"`
   - `const hydra = new Hydra({ detectAudio: false, makeGlobal: true })`
   - `osc(8, 0.1, 0.8).out()`
4. Add 3D sample:
   - `const sc = scene().lights().mesh(gm.box(), osc().phong()).out()`
   - `update = () => { const box = sc.at(0); box.rotation.x += 0.01; box.rotation.y += 0.01 }`

### What still breaks or is easy to misuse
- `npm i hydra-synth` installs upstream package, not this fork (`/Users/kasparsj/Work2/hydra/hydra-three/README.md:16`).
- Runtime is browser-only; direct Node/SSR import throws (`/Users/kasparsj/Work2/hydra/hydra-three/src/package-entry.js:1`).
- In `makeGlobal: false`, bare globals like `update = ...` are not installed; use `hydra.synth.update = ...`.
- GUI fallback is intentionally no-op when script loading fails, so control panels may be unavailable offline (`/Users/kasparsj/Work2/hydra/hydra-three/src/gui.js:29`).
- Browser smoke suite requires installed Playwright browsers.

## 3) API surface summary (public entry points)

### Package entry points
- Root import: `hydra-synth` -> `/Users/kasparsj/Work2/hydra/hydra-three/src/package-entry.js`
- Root require: `hydra-synth` -> `/Users/kasparsj/Work2/hydra/hydra-three/dist/hydra-synth.js`
- Types: `hydra-synth` -> `/Users/kasparsj/Work2/hydra/hydra-three/src/index.d.ts`
- Subpath export: `hydra-synth/src/glsl/glsl-functions.js`

### Constructor and instance API
- `new Hydra(options)`
- Instance methods: `eval`, `setResolution`, `tick`, `hush`, `scene`, `shadowMap`, `dispose`, `loadScript`

### `hydra.synth` namespace
- Core lifecycle: `update`, `afterUpdate`, `render`, `time`, `bpm`, `fps`, `stats`
- Camera: `perspective`, `ortho`, `screenCoords`, `normalizedCoords`, `cartesianCoords`
- 3D/runtime modules: `tx`, `gm`, `mt`, `cmp`, `rnd`, `nse`, `gui`, `arr`, `el`
- Generators/transforms: `osc`, `noise`, `solid`, `src`, plus dynamic transforms via `setFunction(...)`
- Math helpers: available under `hydra.synth.math`; optionally installed on `Math` only in global mode

## 4) Packaging audit

- Name/version: `hydra-synth@1.0.0`
- Build system: Vite (`/Users/kasparsj/Work2/hydra/hydra-three/vite.config.js`)
- Primary artifact: `/Users/kasparsj/Work2/hydra/hydra-three/dist/hydra-synth.js`
- Exports map present with import/require/types and documented subpath export (`/Users/kasparsj/Work2/hydra/hydra-three/package.json`)
- Included publish files are explicit (`dist/`, `src/`, `examples/`, `README.md`, `LICENSE`, `CHANGELOG.md`)
- License metadata: `AGPL` (valid but non-SPDX-normalized expression)

Tarball audit (`npm pack --dry-run --json`, 2026-02-21):
- filename: `hydra-synth-1.0.0.tgz`
- package size: `407900` bytes
- unpacked size: `2131721` bytes
- entry count: `92`
- main dist artifact size: `dist/hydra-synth.js` = `1759906` bytes

## 5) Quality audit

### Checks and tests
- `npm run lint`: pass
- `npm run typecheck`: pass
- `npm run format:check`: pass
- `npm run test:smoke`: pass
- `npm run test:smoke:browser`: pass (chromium + firefox quickstart, chromium non-global + multi-instance)
- `npm run ci:check`: pass

Latest verification snapshot (rerun on 2026-02-21):
- `npm run ci:check`: pass
- `npm run test:smoke:browser`: pass
- `npm audit --omit=dev --json`: pass (0 vulnerabilities)
- `npm pack --dry-run --json`: pass (`407900` package bytes, `2131721` unpacked bytes, `92` files)

### CI posture
- CI workflow runs Node 20 + 22 matrix, with browser smoke on Node 20 (`/Users/kasparsj/Work2/hydra/hydra-three/.github/workflows/ci.yml`).
- Tagged release verify workflow re-runs `ci:check`, browser smoke, creates tarball + checksums (`/Users/kasparsj/Work2/hydra/hydra-three/.github/workflows/release-verify.yml`).

### Security posture
- `npm audit --omit=dev --json`: 0 vulnerabilities
- `npm audit --json`: 0 vulnerabilities
- Security policy present: `/Users/kasparsj/Work2/hydra/hydra-three/SECURITY.md`

## 6) Known-bug candidates

1. Runtime-less scene fallback store is shared module state (low-frequency edge case)
- Pointer: `/Users/kasparsj/Work2/hydra/hydra-three/src/three/scene.js:35`, `/Users/kasparsj/Work2/hydra/hydra-three/src/three/scene.js:83`
- Detail: calls into scene helpers without an active runtime reuse `defaultStore`, which may surprise advanced embedding scenarios.

2. Dynamic source texture resize path is still TODO
- Pointer: `/Users/kasparsj/Work2/hydra/hydra-three/src/hydra-source.js:141`, `/Users/kasparsj/Work2/hydra/hydra-three/src/hydra-source.js:146`, `/Users/kasparsj/Work2/hydra/hydra-three/src/hydra-source.js:150`
- Detail: runtime video/canvas size changes are detected but not actively applied to texture dimensions.

3. GUI fallback is safe but silently degrades to no-op controls
- Pointer: `/Users/kasparsj/Work2/hydra/hydra-three/src/gui.js:29`, `/Users/kasparsj/Work2/hydra/hydra-three/src/gui.js:97`
- Detail: offline/script-fail path avoids crashes but can hide that the control UI is unavailable.

4. Tick loop broadly catches errors and logs warnings
- Pointer: `/Users/kasparsj/Work2/hydra/hydra-three/src/hydra-synth.js:639`
- Detail: top-level catch in `tick()` reduces hard crashes but can mask repeated runtime faults in production unless logs are monitored.

## 7) Missing features (ranked by impact)

1. **Fork package identity on npm (high impact)**
- Publish under a distinct package name (or scoped package) to remove upstream install ambiguity.

2. **Strict typed transform/module contracts (medium-high impact)**
- Generate richer `.d.ts` for dynamic transform methods so editor/runtime signatures align more tightly.

3. **Offline first-class GUI (medium impact)**
- Ship vendored/local `dat.gui` asset path by default (fallback today is intentionally no-op).

4. **Broader browser matrix for advanced smoke tests (medium impact)**
- Add Firefox coverage for non-global and multi-instance scenarios (currently chromium-only for those deep checks).

5. **Resolve texture-resize TODO path (medium-low impact)**
- Implement and verify dynamic source texture resize/update behavior under changing input dimensions.

6. **SPDX metadata polish (low impact)**
- Normalize `license` string to explicit SPDX expression.

## 8) Roadmap

### Milestone 1: MVP Public (achieved)
Goal: usable public release for demos/prototyping.

Acceptance criteria:
- Vite-based build and dev workflow is the default.
- `npm run ci:check` passes from clean clone.
- Browser smoke passes in CI (Chromium + Firefox quickstart).
- Release tarball/checksum verification works on `v*` tags.

### Milestone 2: Stable v0.x (in progress)
Goal: predictable integration behavior for downstream projects.

Acceptance criteria:
- Known-bug candidates #1 and #2 are fixed or explicitly documented as hard constraints.
- Non-global + multi-instance browser smoke extended to Firefox.
- Offline GUI path defaults to local asset before fallback no-op.
- Packaging guidance removes accidental upstream installs for new users.

### Milestone 3: v1.0
Goal: durable API contract and low-risk long-term upgrades.

Acceptance criteria:
- Distinct package identity or explicit release channel policy finalized.
- Versioned API surface and TypeScript contract frozen with deprecation policy.
- Two consecutive tagged releases with zero high-severity regressions.
- Release automation includes deterministic artifact checks and documented rollback procedure.
