## hydra-three

### Status: stable / in-progress

This is a fork [Hydra](https://github.com/hydra-synth/hydra-synth) that is running on [three.js](https://threejs.org/), which brings 3D capabilities to it. It's a drop in replacement for the [video synth engine](https://github.com/hydra-synth/hydra-synth) for hydra.

It is [almost] fully compatible with the original Hydra, so you can use all the same functions and operators, and it also has some new features and functions that are specific to 3D.
For details see [Breaking changes](#breaking-changes).

### Installation
Replace the hydra-synth script tag with the hydra-three script tag:
```html
<!--<script src="https://unpkg.com/hydra-synth"></script>-->
<script src="https://unpkg.com/hydra-synth"></script>
<script src="https://cdn.jsdelivr.net/gh/kasparsj/hydra-three@main/dist/hydra-synth.js"></script>
```

### Example
Rotating a cube with a hydra texture as material:
```javascript
perspective([2,2,3], [0,0,0], {controls: true});

// create geometry and material
const geom = gm.box(); // cube geometry
const mat = osc().rotate(noise(1).mult(45)); // use a hydra texture as material

// compose scene
const sc = scene()
    .lights() // default lighting setup
    .mesh(geom, mat.phong()) // add mesh to scene
    .out();

update = () => {
    const box = sc.at(0);
    box.rotation.x += 0.01;
    box.rotation.y += 0.01;
}
```
Check other [examples](./examples), while documentation is being worked on.

### Breaking changes

TODO.
