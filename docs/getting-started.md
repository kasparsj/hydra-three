## Getting Started

This guide is optimized for first success in under 10 minutes.
Official distribution for this fork is via pinned Git tags and artifacts in this repository.

Runtime note: this package targets browser execution. Importing it in pure Node/SSR without a browser-like runtime is unsupported.

### 1. Choose your runtime path

#### Script tag (fastest)

```html
<script src="https://cdn.jsdelivr.net/gh/kasparsj/hydra-three@v1.4.1/dist/hydra-synth.js"></script>
<script>
  const hydra = new Hydra({ detectAudio: false });
  osc(8, 0.1, 0.8).out();
</script>
```

For production, pin to a tag or commit (avoid floating refs).

#### npm + bundler

```bash
npm i github:kasparsj/hydra-three#v1.4.1 three
```

```js
import Hydra from "hydra-synth";

const hydra = new Hydra({
  detectAudio: false,
  makeGlobal: true,
});

osc(8, 0.1, 0.8).out();
```

For non-global mode:

```js
import Hydra from "hydra-synth";

const hydra = new Hydra({
  detectAudio: false,
  makeGlobal: false,
});

const H = hydra.synth;
H.osc(8, 0.1, 0.8).out();
```

### 2. Confirm baseline behavior

You should see:

- a canvas attached to the page
- animated output
- no runtime exceptions in console

### 3. Try a 3D sample

```js
perspective([2, 2, 3], [0, 0, 0], { controls: true });
const sc = scene().lights().mesh(gm.box(), osc().phong()).out();
```

You can also run examples from the GitHub Pages site examples gallery.

### 4. Local project setup

```bash
npm ci
npm run dev
npm run ci:check
npx playwright install chromium firefox
npm run test:smoke:browser
```

The repo dev entrypoint is `dev/index.js`.

### 5. Known Vite issue

If you get `ReferenceError: global is not defined`, add:

```js
define: {
  global: {},
}
```

See:

- <https://github.com/vitejs/vite/discussions/5912#discussioncomment-1724947>
- <https://github.com/vitejs/vite/discussions/5912#discussioncomment-2908994>
