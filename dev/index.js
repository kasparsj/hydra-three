const Hydra = require('./../src/index.js')

function init() {
  window.hydra = new Hydra({ detectAudio: false, makeGlobal: true })
  osc(8, 0.1, 0.8).out()
}

window.onload = init
