## Examples

These scripts are grouped by visual primitive or workflow.

### General
- `box.js`
- `box-tex.js`
- `box-instanced-grid.js`
- `tex-map.js`
- `cmp-noise.js`
- `cmp-stack.js`

### Line loop
- `lineloop/lineloop.js`
- `lineloop/sphere.js`
- `lineloop/thread.js`

### Lines
- `lines/lines.js`
- `lines/noise.js`

### Line strip
- `linestrip/thread.js`

### Points
- `points/dots.js`
- `points/grid.js`
- `points/noise.js`
- `points/noise-flow.js`
- `points/squares.js`

## Running examples locally

1. Start the local dev server:

```bash
npm ci
npm run dev
```

2. Edit `dev/index.js` to load one of these files, or paste snippets into your host app using the same APIs.

For an immediate zero-edit sanity check, open `examples/quickstart.html` in a static server that serves the repository root (it expects `../dist/hydra-synth.js`).
