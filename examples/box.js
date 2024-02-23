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
