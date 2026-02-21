# Playground Guide

The interactive playground provides:

- live code editing
- live parameter controls
- instant rerendering to a Three.js canvas
- deep-linkable URL state for selected preset, code edits, and parameter overrides

Published URL:

- `https://kasparsj.github.io/hydra-three/playground/index.html`

## How it works

- Each example defines:
  - editable sketch code
  - a parameter schema (`name`, `min`, `max`, `step`, `value`)
- Parameter changes trigger debounced reruns.
- The runtime is recreated per run for predictable state and easier experimentation.
- The page URL is synced to current state:
  - `?example=<id>` for preset selection
  - `?code=...` for code overrides
  - `?params={...}` for non-default parameter values
- `Copy Link` writes a shareable URL for the current state.

## Files

- `site/playground/index.html`
- `site/playground/playground.js`
- `site/playground/examples.js`

## Add a new playground example

1. Add an object to `playgroundExamples` in `site/playground/examples.js`.
2. Define its `params` schema.
3. Write sketch code using the injected `params` object.
4. Run `npm run site:build` and verify behavior in the generated site.

## Recipe deep links

- Textured box: `?example=textured-box`
- Points trail: `?example=points-trail`
- Scene texture bridge: `?example=scene-texture-bridge`
- Terrain displacement: `?example=terrain-displacement`

## Runtime note

The playground currently uses `makeGlobal: true` inside a controlled page context to keep eval ergonomics simple. For host applications and multi-instance integration, prefer non-global mode.
