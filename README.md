## hydra-three

three.js-powered fork of [hydra-synth](https://github.com/hydra-synth/hydra-synth) focused on creative coding with 3D scene APIs while keeping Hydra-style live coding workflows.

### Project status

- Experimental, actively maintained.
- API goal: remain compatible with core Hydra patterns and add 3D-specific capabilities.

## Distribution Model

- Official distribution for this fork is via GitHub tags and release artifacts from this repository.
- CDN usage should reference a pinned tag in this repository.
- The npm package name `hydra-synth` is owned upstream; this fork does not rely on upstream npm publishing for releases.
- `package.json` is marked `private: true` to avoid accidental npm registry publish under the upstream package name.
- Do not use `npm i hydra-synth` for this fork unless you intentionally want upstream hydra-synth.
- For this fork, install from this repository tag: `npm i github:kasparsj/hydra-three#v1.0.0 three`.

## Runtime Contract

- Runtime target is browser execution (WebGL + DOM APIs required).
- The ESM package entry is browser-only; importing in pure Node/SSR without a browser-like runtime is unsupported.
- For server-side build pipelines, run Hydra code in browser contexts and publish artifacts from CI.

## Project Site

- GitHub Pages publishes docs and runnable examples from this repository.
- Local site build output: `site-dist/`
- Build locally:

```bash
npm run build
npm run site:build
```

## 10-minute quickstart

### Option A: Browser script tag (fastest)

Use jsDelivr from this repository:

```html
<script src="https://cdn.jsdelivr.net/gh/kasparsj/hydra-three@v1.0.0/dist/hydra-synth.js"></script>
<script>
  const hydra = new Hydra({ detectAudio: false });
  osc(8, 0.1, 0.8).out();
</script>
```

For production, pin to a release tag or commit (do not use floating refs).

Success criteria:

- You see animated output immediately.
- `Hydra` is available on `window`.

### Option B: npm + bundler

```bash
npm i github:kasparsj/hydra-three#v1.0.0 three
```

Do not replace this with `npm i hydra-synth`; that resolves to the upstream package, not this fork.

```js
import Hydra from "hydra-synth";

const hydra = new Hydra({
  detectAudio: false,
  makeGlobal: true,
});

osc(8, 0.1, 0.8).out();
```

Non-global mode is also supported:

```js
import Hydra from "hydra-synth";

const hydra = new Hydra({
  detectAudio: false,
  makeGlobal: false,
});

const H = hydra.synth;
H.osc(8, 0.1, 0.8).out();
```

#### Vite note

If Vite reports `ReferenceError: global is not defined`, add:

```js
define: {
  global: {},
}
```

Refs:

- <https://github.com/vitejs/vite/discussions/5912#discussioncomment-1724947>
- <https://github.com/vitejs/vite/discussions/5912#discussioncomment-2908994>

## Local development

```bash
npm ci
npm run dev
```

This starts a Vite live-reload dev server using `dev/index.html` and `dev/index.js`.

Useful checks:

```bash
npm run ci:check
npm run lint
npm run typecheck
npx playwright install chromium firefox
npm run test:smoke:browser
npm run site:build
```

GUI note:

- `gui.init()` now tries local vendored `dat.gui` first (`/vendor/dat.gui.min.js`, `vendor/dat.gui.min.js`), then CDN fallback.
- If all script loads fail, it falls back to a no-op GUI object so runtime code does not crash.

## Example

```javascript
// setup perspective camera, enabling camera controls (alt+click to rotate, alt+scroll to zoom)
perspective([2, 2, 3], [0, 0, 0], { controls: true });

// create geometry and material
const geom = gm.box();
const mat = osc().rotate(noise(1).mult(45)).phong();

// compose scene
const sc = scene().lights().mesh(geom, mat).out();

update = () => {
  const box = sc.at(0);
  box.rotation.x += 0.01;
  box.rotation.y += 0.01;
};
```

More examples: [`examples/README.md`](./examples/README.md)

## 3D APIs (summary)

### Camera

- `perspective(eye, target, options)`
- `ortho(eye, target, options)`

### Scene

- `scene()` creates a scene handle and exposes scene composition helpers.

### Geometry

- Geometry functions are exposed under `gm`.
- Example: `gm.box()`.

### Material

- Material functions are exposed under `mt`.
- Example: `mt.meshPhong()`.

## Production guidance

Use these docs before shipping:

- Getting started: [`docs/getting-started.md`](./docs/getting-started.md)
- API reference: [`docs/api.md`](./docs/api.md)
- Upstream fork differences: [`docs/upstream-differences.md`](./docs/upstream-differences.md)
- Production checklist: [`docs/production-checklist.md`](./docs/production-checklist.md)
- Release process: [`docs/release.md`](./docs/release.md)
- Security policy: [`SECURITY.md`](./SECURITY.md)
- Contribution guide: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Issue templates: [`.github/ISSUE_TEMPLATE`](./.github/ISSUE_TEMPLATE)

## Trust signals

- CI runs build + smoke + package checks on Node 20 and 22.
- CI runs real Chromium and Firefox smoke tests of `examples/quickstart.html` on Node 20.
- CI runs non-global and multi-instance 3D browser smoke tests on Chromium and Firefox.
- Release tags (`v*`) run version/changelog/tag metadata verification and attach tarball + checksum artifacts.
- GitHub Pages deploys generated docs and runnable examples from repository sources on every push to `main`.

## License

AGPL-3.0-only (see [`LICENSE`](./LICENSE)).
