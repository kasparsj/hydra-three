## Release Process

This project should release from `main` only.
Official release channel for this fork is Git tags + GitHub release artifacts from this repository.

### Pre-release checks

Run:

```bash
npm ci
npm run release:verify-meta
npm run ci:check
npx playwright install chromium firefox
npm run test:smoke:browser
npm run site:build
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

Pushing a `v*` tag triggers `.github/workflows/release-verify.yml`, which reruns checks and uploads:
- npm tarball artifact
- sha256 checksum file (`release-checksums.txt`)

### Distribution

Primary distribution paths for this fork:
- GitHub tag + release artifacts
- jsDelivr pinned to this repository's release tag
- GitHub Pages site for docs and runnable examples

### Site deployment

- The site is generated with `npm run site:build`.
- Output directory is `site-dist/`.
- `.github/workflows/pages.yml` deploys the generated site on pushes to `main`.

### Post-release
- Verify package contents and installability.
- Verify CDN URL for the new version.
- Verify checksum file matches uploaded tarball.
- Announce release notes.
