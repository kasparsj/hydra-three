const Hydra = require('./../src/index.js')

function init() {
  window.hydraSynth = new Hydra({ detectAudio: false, makeGlobal: true })

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
}

window.onload = init
