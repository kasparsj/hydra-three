# Changelog

## [Unreleased]
### Added
- GitHub Pages site build pipeline (`npm run site:build`) that generates docs and runnable example pages from repository sources.
- GitHub Pages deployment workflow (`.github/workflows/pages.yml`) for automatic publishing on `main`.
- Cross-browser smoke tests (`npm run test:smoke:browser`) using Playwright Chromium and Firefox against `examples/quickstart.html`.
- Non-global 3D browser smoke test (`npm run test:smoke:browser:non-global`) to guard against implicit global coupling regressions.
- Regression smoke test (`npm run test:smoke:regression`) for runtime bug fixes in 3D helpers and media utilities.
- Release metadata verification script (`npm run release:verify-meta`) for changelog/version/tag consistency.
- Release checksum generation script (`npm run release:checksums`) that writes `release-checksums.txt`.
- CI and release workflows now run cross-browser smoke tests and upload tarball + checksum artifacts on tags.
- Issue templates for bug, performance regression, and creative regression triage.
- Repo quality gates:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run format:check`

### Changed
- Distribution docs now define this fork's release channel as Git tags + GitHub artifacts.
- Quickstart install snippets are pinned to release tag `v1.4.1` instead of floating branch refs.
- Runtime docs now explicitly define browser-only package execution and non-global mode usage.

### Fixed
- Removed implicit `hydraSynth` global runtime coupling from 3D internals by introducing explicit runtime context wiring.
- Fixed source canvas resize behavior when only one dimension changes.
- Fixed camera resize listener binding/removal mismatch in mixins.
- Fixed hemisphere light options merge logic.
- Fixed world relief noise argument ordering and `getReliefAt()` scene lookup.
- Fixed `VideoRecorder` source buffer reference to avoid runtime `ReferenceError`.
- Fixed `arr.image()` loading path to return resolved image data asynchronously instead of a permanently empty typed array.
- Fixed undefined width/height usage in `cmp.lookAtBox()` orthographic path.

## [1.4.1] - 2026-02-21
### Added
- CI workflow for build, smoke testing, and package dry-run checks.
- Release verification workflow for `v*` tags that uploads npm tarball artifacts.
- Canvas smoke test script (`npm run test:smoke`).
- Module-load smoke test (`npm run test:smoke:module`) with strict ESM import coverage.
- Local dev entrypoint restored at `dev/index.js`.
- New onboarding and operations docs:
  - `docs/getting-started.md`
  - `docs/production-checklist.md`
  - `docs/release.md`
  - `examples/README.md`
- Contributor and security docs:
  - `CONTRIBUTING.md`
  - `SECURITY.md`
- Quickstart static example: `examples/quickstart.html`.

### Fixed
- Constructor canvas initialization now uses the created canvas safely when no canvas is supplied.
- Canvas resize helpers no longer rely on implicit global state.
- ESM import specifiers now use explicit `.js` extensions in internal and `three/examples` imports.
- Top-level `window.*` assignments are guarded to avoid immediate crashes in non-browser module loading.
- `arr.image()` now fails with a clear error when `tx` loader is unavailable instead of throwing an unbound reference error.
- Package `import` entry now loads from a stable bundled wrapper (`src/package-entry.js`) instead of raw source modules.

## [1.4] - 2025-09-24

This fork is based on hydra-synth 1.4

See original changelog:
https://github.com/hydra-synth/hydra-synth/blob/main/CHANGELOG.md#14---2025-09-24