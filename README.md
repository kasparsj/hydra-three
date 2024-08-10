## hydra-three

### Status: experimental / in-progress

This is a fork [Hydra](https://github.com/hydra-synth/hydra-synth) that is running on [three.js](https://threejs.org/), which brings 3D capabilities to it. It's a drop in replacement for the [video synth engine](https://github.com/hydra-synth/hydra-synth) for hydra.

It is fully compatible with the original Hydra, 
so you can use all the same functions, 
and it adds [new features and functions that are specific to 3D](#new-features-and-3d-apis).

### Installation
Replace the hydra-synth script tag with the hydra-three script tag:
```html
<!--<script src="https://unpkg.com/hydra-synth"></script>-->
<script src="https://cdn.jsdelivr.net/gh/kasparsj/hydra-three@main/dist/hydra-synth.js"></script>
```

### Example
Rotating cube with a hydra texture as material:
```javascript
// setup perspective camera, enabling camera controls (alt+click to rotate, alt+scroll to zoom)
perspective([2,2,3], [0,0,0], {controls: true});

// create geometry and material
const geom = gm.box(); // cube geometry
const mat = osc().rotate(noise(1).mult(45)).phong(); // use a hydra texture mapped onto a phong material

// compose scene
const sc = scene()
    .lights() // default lighting setup
    .mesh(geom, mat) // add mesh to scene
    .out();

update = () => {
    const box = sc.at(0);
    box.rotation.x += 0.01;
    box.rotation.y += 0.01;
}
```
Check other [examples](./examples), while documentation is being worked on.

### 3D functions and APIs (WIP)

#### Camera API

`perspective(eye, target, options)` - sets up a perspective camera and controls for it.

`ortho(eye, target, options)` - sets up an orthographic camera and controls for it.

#### Scene API

`const sc = scene()` - creates a new scene object through which the Scene API is accessible.

#### Geometry API

Geometry API for creating and manipulating geometries is accessible through the `gm` object, e.g.

`gm.box()` - creates a box geometry.

#### Material API

Material API for creating and manipulating materials is accessible through the `mt` object, e.g.

`mt.meshPhong()` - creates a [MeshPhongMaterial](https://threejs.org/docs/#api/en/materials/MeshPhongMaterial) for shiny surfaces with specular highlights.
