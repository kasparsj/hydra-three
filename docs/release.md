## Release Process

This project should release from `main` only.

### Pre-release checks

Run:

```bash
npm ci
npm run ci:check
npx playwright install chromium
npm run test:smoke:browser
```

Ensure:
- CI is green.
- `CHANGELOG.md` has release notes.
- No uncommitted changes.

### Versioning

1. Update `package.json` version.
2. Update `CHANGELOG.md` with a dated section.
3. Commit version + changelog.
4. Create an annotated tag:

```bash
git tag -a vX.Y.Z -m "vX.Y.Z"
```

5. Push commit + tag.

Pushing a `v*` tag triggers `.github/workflows/release-verify.yml`, which reruns checks and uploads an npm tarball artifact.

### Publish

Publish from a clean checkout of the tagged commit.

```bash
npm publish
```

### Post-release
- Verify package contents and installability.
- Verify CDN URL for the new version.
- Announce release notes.
