## Production Checklist

Use this checklist before deploying hydra-three in a production creative-coding environment.

### Versioning and supply chain

- Pin a specific package/CDN version (avoid `@main` and floating latest).
- Keep a lockfile committed.
- Run `npm run pack:check` before release.

### Runtime reliability

- Verify startup with and without passing an explicit canvas.
- Verify both `makeGlobal: true` and `makeGlobal: false` modes for your host integration.
- Verify resize behavior under your embedding layout.
- Verify GPU-heavy patches at expected frame budget.

### Browser support

- Test on your target browser matrix (desktop + mobile if required).
- Validate media source behaviors (webcam/video/screen) on each target browser.
- Treat Node/SSR runtime execution as unsupported unless you provide browser-like shims.

### Observability

- Capture and aggregate runtime console errors.
- Add a recover path for shader compile failures in your host app.

### Build and release safety

- Run `npm run ci:check` in CI.
- Run `npm run lint` and `npm run typecheck` in CI.
- Run `npm run site:build` in CI to ensure docs/examples site generation stays healthy.
- Run `npm run test:smoke:browser` in CI (with Playwright Chromium and Firefox installed).
- Run browser smoke on both Chromium and Firefox in CI.
- Run non-global 3D smoke in CI to catch implicit-global regressions.
- Keep changelog entries for user-visible behavior changes.
- Tag every release commit.
- Ensure security reporting path is documented (see `SECURITY.md`).
