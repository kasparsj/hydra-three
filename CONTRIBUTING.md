# Contributing

## Development setup

```bash
npm ci
npm run dev
```

## Required checks before opening a PR

Run this exact sequence:

```bash
npm run release:verify-meta
npm run docs:verify-sync
npm run docs:verify-coverage
npm run docs:check-links
npm run build
npm run site:build
npm run test:smoke
npm run pack:check
npx playwright install chromium firefox
npm run test:smoke:browser
```

Or run all with:

```bash
npm run ci:check
```

## What maintainers expect in PRs

- Keep changes additive unless a breaking change is unavoidable.
- Avoid public API changes unless there is a concrete correctness or safety reason.
- Update docs when behavior changes.
- Add a changelog entry under `## [Unreleased]` for user-visible changes.
- If API surface changes, run `npm run docs:generate` and commit updated `docs/.generated/*` and `docs/api.md`.

## Commit and release hygiene

- Keep commits reviewable and scoped to a single concern.
- Ensure `dist/hydra-synth.js` is regenerated when source changes affect the bundle.
- Release tags must use `vX.Y.Z` format and point to a green CI commit.
