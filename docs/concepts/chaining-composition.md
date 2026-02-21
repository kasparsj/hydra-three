# Chaining and Composition Patterns

hydra-three supports multiple composition styles. These patterns help keep sketches readable and reusable.

## Pattern 1: Texture-first material flow

Use Hydra chains to design texture behavior first, then apply to scene objects.

```js
const mat = osc(8, 0.1, 0.8)
  .modulate(noise(2), 0.1)
  .color(0.9, 0.7, 0.8)
  .phong();

scene().lights({ all: true }).mesh(gm.box(), mat).out();
```

Best for procedural looks and shader-driven motion.

## Pattern 2: Scene-first composition

Build geometry/camera/layout first, then swap materials/signals rapidly.

```js
const sc = scene()
  .lights({ all: true })
  .mesh(gm.sphere(), mt.meshPhong())
  .out();

update = () => {
  sc.at(0).rotation.y += 0.01;
};
```

Best for animation blocking and world design.

## Pattern 3: Render-to-texture bridge

Render one chain/scene to texture, reuse it in another scene.

```js
const tex = scene().points([200, 200], mt.dots()).tex(o1);
scene().mesh(gm.plane(2, 2), src(tex).lambert()).out();
```

Best for layered systems, portals, and feedback experiments.

## Pattern 4: Non-global embedding

Prefer namespaced calls in host applications.

```js
const hydra = new Hydra({ makeGlobal: false, detectAudio: false });
const H = hydra.synth;
H.scene().mesh(H.gm.box(), H.osc().phong()).out();
```

Best for reliability in multi-instance or app-integrated contexts.

## Pattern 5: Data-driven textures

Build typed-array data, then map it to textures.

```js
const noiseData = arr.noise(512, 512, { type: "improved" });
const tex = tx.data(noiseData, { min: "linear", mag: "linear" });
scene().mesh(gm.plane(2, 2), src(tex).basic()).out();
```

Best for custom simulation and algorithmic image sources.

## Common pitfalls

- Avoid mixing many mutable globals in complex patches.
- Avoid hidden state coupling across outputs unless intentional.
- Avoid expensive post FX on every output when one composited pass is enough.
- Avoid using internal methods in production unless you accept API volatility.
