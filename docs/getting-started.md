## Getting Started

This guide is optimized for first success in under 10 minutes.
Official distribution for this fork is via pinned Git tags and artifacts in this repository.
This repository is intentionally `private: true` in `package.json` to prevent accidental npm registry publish under the upstream package name.

Runtime note: this package targets browser execution. Importing it in pure Node/SSR without a browser-like runtime is unsupported.

### 1. Choose your runtime path

#### Script tag (fastest)

```html
<script src="https://cdn.jsdelivr.net/gh/kasparsj/hydra-three@v1.0.0/dist/hydra-synth.js"></script>
<script>
  const hydra = new Hydra({ detectAudio: false });
  osc(8, 0.1, 0.8).out();
</script>
```

For production, pin to a tag or commit (avoid floating refs).

#### npm + bundler

```bash
npm i github:kasparsj/hydra-three#v1.0.0 three
```

Important: `npm i hydra-synth` installs upstream hydra-synth, not this fork.

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

In non-global mode, assign lifecycle hooks through `hydra.synth`:

```js
const H = hydra.synth;
H.update = () => {};
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
For parameter-editable sketches, use the interactive playground at
`https://kasparsj.github.io/hydra-three/playground/index.html`.

### 4. Local project setup

```bash
npm ci
npm run dev
npm run ci:check
npx playwright install chromium firefox
npm run test:smoke:browser
```

The repo dev entrypoint is `dev/index.js`.

GUI fallback behavior:

- GUI init tries local vendored `dat.gui` first.
- If unavailable, runtime falls back to a no-op GUI adapter instead of throwing.

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

## 6. Continue with core docs

- API reference: [`docs/api.md`](./api.md)
- Hydra to 3D model: [`docs/concepts/hydra-to-3d-mental-model.md`](./concepts/hydra-to-3d-mental-model.md)
- Scene graph guide: [`docs/concepts/scene-graph.md`](./concepts/scene-graph.md)
- Rendering pipeline guide: [`docs/concepts/rendering-pipeline.md`](./concepts/rendering-pipeline.md)
- Chaining patterns: [`docs/concepts/chaining-composition.md`](./concepts/chaining-composition.md)
- Parameter reference: [`docs/reference/parameter-reference.md`](./reference/parameter-reference.md)
- Semantic clarifications: [`docs/reference/semantic-clarifications.md`](./reference/semantic-clarifications.md)
- Common recipes: [`docs/recipes/common-recipes.md`](./recipes/common-recipes.md)
- Playground guide: [`docs/playground.md`](./playground.md)
- Advanced performance: [`docs/performance/advanced-performance.md`](./performance/advanced-performance.md)
