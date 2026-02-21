import Hydra from "../src/hydra-synth.js";

function init() {
  const hydra = new Hydra({ detectAudio: false, makeGlobal: true });
  const H = hydra.synth;
  window.hydraSynth = hydra;

  H.perspective([2, 2, 3], [0, 0, 0], { controls: true });

  // create geometry and material
  const geom = H.gm.box();
  const mat = H.osc().rotate(H.noise(1).mult(45)).phong();

  // compose scene
  const sc = H.scene().lights().mesh(geom, mat).out();

  H.update = () => {
    const box = sc.at(0);
    box.rotation.x += 0.01;
    box.rotation.y += 0.01;
  };
}

window.onload = init;
