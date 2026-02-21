import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

class FakeEventTarget {
  constructor() {
    this._listeners = new Map()
  }

  addEventListener(type, handler) {
    const handlers = this._listeners.get(type) || []
    handlers.push(handler)
    this._listeners.set(type, handlers)
  }

  removeEventListener(type, handler) {
    const handlers = this._listeners.get(type) || []
    this._listeners.set(type, handlers.filter((h) => h !== handler))
  }
}

class FakeElement extends FakeEventTarget {
  constructor(tagName = 'div') {
    super()
    this.tagName = tagName.toUpperCase()
    this.style = {}
    this.children = []
  }

  appendChild(el) {
    this.children.push(el)
    el.parentElement = this
    return el
  }
}

class FakeCanvas extends FakeElement {
  constructor() {
    super('canvas')
    this.width = 1
    this.height = 1
  }
}

const walk = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walk(fullPath))
    } else if (entry.isFile() && fullPath.endsWith('.js')) {
      files.push(fullPath)
    }
  }
  return files
}

const importSpecs = (contents) => {
  const specs = []
  const fromMatches = contents.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)
  const sideEffectMatches = contents.matchAll(/\bimport\s+['"]([^'"]+)['"]/g)
  for (const match of fromMatches) specs.push(match[1])
  for (const match of sideEffectMatches) specs.push(match[1])
  return specs
}

const hasExplicitExtension = (spec) => /\.[a-zA-Z0-9]+$/.test(spec)

const validateImportSpecifiers = () => {
  const srcRoot = path.resolve(new URL('../../src/', import.meta.url).pathname)
  const files = walk(srcRoot)
  const invalid = []
  for (const file of files) {
    const contents = fs.readFileSync(file, 'utf8')
    for (const spec of importSpecs(contents)) {
      const mustBeExplicit =
        spec.startsWith('./') ||
        spec.startsWith('../') ||
        spec.startsWith('three/examples/') ||
        spec.startsWith('three/src/')
      if (mustBeExplicit && !hasExplicitExtension(spec)) {
        invalid.push(`${path.relative(srcRoot, file)} -> ${spec}`)
      }
    }
  }

  if (invalid.length > 0) {
    throw new Error(`Found import specifiers without explicit extension:\n${invalid.join('\n')}`)
  }
}

const originalDescriptors = {
  window: Object.getOwnPropertyDescriptor(globalThis, 'window'),
  document: Object.getOwnPropertyDescriptor(globalThis, 'document'),
  navigator: Object.getOwnPropertyDescriptor(globalThis, 'navigator')
}

const setGlobal = (name, value) => {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value
  })
}

const restoreGlobal = (name, descriptor) => {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor)
  } else {
    delete globalThis[name]
  }
}

validateImportSpecifiers()

const windowTarget = new FakeEventTarget()
const documentTarget = new FakeEventTarget()
documentTarget.body = new FakeElement('body')
documentTarget.head = new FakeElement('head')
documentTarget.createElement = (name) => (name === 'canvas' ? new FakeCanvas() : new FakeElement(name))
windowTarget.document = documentTarget

setGlobal('window', windowTarget)
setGlobal('document', documentTarget)
setGlobal('navigator', { platform: '', maxTouchPoints: 0 })

try {
  await import('../../src/canvas.js')
  await import('../../src/three/noise.js')
  await import('../../src/three/gm.js')
  const arr = await import('../../src/three/arr.js')
  assert.equal(typeof window.GridGeometry, 'function')
  assert.throws(() => arr.image('mock://image.png'), /requires a global tx loader/)
} finally {
  restoreGlobal('window', originalDescriptors.window)
  restoreGlobal('document', originalDescriptors.document)
  restoreGlobal('navigator', originalDescriptors.navigator)
}

console.log('module load smoke test passed')
