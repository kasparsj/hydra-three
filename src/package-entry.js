import '../dist/hydra-synth.js'

const Hydra = globalThis.Hydra || (typeof window !== 'undefined' ? window.Hydra : undefined)

export default Hydra
