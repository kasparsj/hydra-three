# Hydra-Three Leftover Roadmap

## Product/Release Strategy
- Decide long-term package identity strategy for registry distribution (keep GitHub-only/private package, or publish a scoped npm package).

## API/Type Surface
- Strengthen dynamic transform typing in `/Users/kasparsj/Work2/hydra/hydra-three/src/index.d.ts` to reduce index-signature ambiguity.
- Freeze a versioned public API contract and define deprecation rules for `v1.0`.

## Runtime/Error Policy
- Add built-in runtime error handling modes (for example: `warn`, `throw`) on top of the current `onError` callback.
- Define/document default production behavior for repeated runtime errors.

## Scene/Runtime Lifecycle
- Add explicit guidance or API for detached scene lifecycle cleanup (currently GC/WeakMap-driven).
- Add a dedicated detached-scene regression harness (browser-level) to prevent future cross-runtime contamination regressions.

## GUI Reliability
- Improve visibility when GUI falls back to no-op mode (user-facing diagnostic signal).
- Add a documented policy for updating vendored `dat.gui` asset (`/Users/kasparsj/Work2/hydra/hydra-three/vendor/dat.gui.min.js`).

## Release Hardening for v1.0
- Achieve two consecutive tagged releases with zero high-severity regressions.
- Add explicit release rollback/playbook documentation.
