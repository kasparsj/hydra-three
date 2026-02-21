if (typeof window === 'undefined' || typeof document === 'undefined') {
  throw new Error(
    'hydra-synth is browser-only at runtime. Import it from a browser context (script tag or browser bundler entry).'
  )
}

await import('../dist/hydra-synth.js')

const Hydra = globalThis.Hydra || (typeof window !== 'undefined' ? window.Hydra : undefined)

export default Hydra
