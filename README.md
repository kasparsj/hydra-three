## hydra-three

three.js-powered fork of [hydra-synth](https://github.com/hydra-synth/hydra-synth) focused on creative coding with 3D scene APIs while keeping Hydra-style live coding workflows.

### Project status
- Experimental, actively maintained.
- API goal: remain compatible with core Hydra patterns and add 3D-specific capabilities.

## 10-minute quickstart

### Option A: Browser script tag (fastest)
Use jsDelivr from this repository:

```html
<script src="https://cdn.jsdelivr.net/gh/kasparsj/hydra-three@main/dist/hydra-synth.js"></script>
<script>
  const hydra = new Hydra({ detectAudio: false })
  osc(8, 0.1, 0.8).out()
</script>
```

For production, pin to a release tag or commit (do not use floating `@main`).

Success criteria:
- You see animated output immediately.
- `Hydra` is available on `window`.

### Option B: npm + bundler

```bash
npm i github:kasparsj/hydra-three#main three
```

```js
import Hydra from 'hydra-synth'

const hydra = new Hydra({
  detectAudio: false,
  makeGlobal: true
})

osc(8, 0.1, 0.8).out()
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

This starts a live-reload dev server using `dev/index.js`.

Useful checks:

```bash
npm run ci:check
npx playwright install chromium
npm run test:smoke:browser
```

## Example

```javascript
// setup perspective camera, enabling camera controls (alt+click to rotate, alt+scroll to zoom)
perspective([2,2,3], [0,0,0], {controls: true});

// create geometry and material
const geom = gm.box();
const mat = osc().rotate(noise(1).mult(45)).phong();

// compose scene
const sc = scene()
  .lights()
  .mesh(geom, mat)
  .out();

update = () => {
  const box = sc.at(0);
  box.rotation.x += 0.01;
  box.rotation.y += 0.01;
}
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
- Production checklist: [`docs/production-checklist.md`](./docs/production-checklist.md)
- Release process: [`docs/release.md`](./docs/release.md)
- Security policy: [`SECURITY.md`](./SECURITY.md)
- Contribution guide: [`CONTRIBUTING.md`](./CONTRIBUTING.md)

## Trust signals

- CI runs build + smoke + package checks on Node 20 and 22.
- CI runs a real Chromium smoke test of `examples/quickstart.html` on Node 20.
- Release tags (`v*`) run verification and attach an npm tarball artifact.

## License

AGPL (see [`LICENSE`](./LICENSE)).
