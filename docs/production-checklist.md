## Production Checklist

Use this checklist before deploying hydra-three in a production creative-coding environment.

### Versioning and supply chain
- Pin a specific package/CDN version (avoid `@main` and floating latest).
- Keep a lockfile committed.
- Run `npm run pack:check` before release.

### Runtime reliability
- Verify startup with and without passing an explicit canvas.
- Verify resize behavior under your embedding layout.
- Verify GPU-heavy patches at expected frame budget.

### Browser support
- Test on your target browser matrix (desktop + mobile if required).
- Validate media source behaviors (webcam/video/screen) on each target browser.

### Observability
- Capture and aggregate runtime console errors.
- Add a recover path for shader compile failures in your host app.

### Build and release safety
- Run `npm run ci:check` in CI.
- Keep changelog entries for user-visible behavior changes.
- Tag every release commit.
- Ensure security reporting path is documented (see `SECURITY.md`).
