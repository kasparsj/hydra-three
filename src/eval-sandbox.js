// handles code evaluation and attaching relevant objects to global and evaluation contexts

import Sandbox from './lib/sandbox.js'
import ArrayUtils from './lib/array-utils.js'

const MISSING_GLOBAL = Symbol('hydra-missing-global')
const globalBindings = new Map()

const setWindowGlobal = (name, value) => {
  if (value === MISSING_GLOBAL) {
    delete window[name]
  } else {
    window[name] = value
  }
}

const ensureGlobalBinding = (name) => {
  let binding = globalBindings.get(name)
  if (!binding) {
    binding = {
      base: Object.prototype.hasOwnProperty.call(window, name)
        ? window[name]
        : MISSING_GLOBAL,
      owners: [],
    }
    globalBindings.set(name, binding)
  }
  return binding
}

const registerGlobalOwner = (name, owner, value) => {
  const binding = ensureGlobalBinding(name)
  const ownerEntry = binding.owners.find((entry) => entry.owner === owner)
  if (ownerEntry) {
    ownerEntry.value = value
  } else {
    binding.owners.push({ owner, value })
  }
  setWindowGlobal(name, binding.owners[binding.owners.length - 1].value)
}

const unregisterGlobalOwner = (name, owner) => {
  const binding = globalBindings.get(name)
  if (!binding) return
  binding.owners = binding.owners.filter((entry) => entry.owner !== owner)
  if (binding.owners.length > 0) {
    setWindowGlobal(name, binding.owners[binding.owners.length - 1].value)
    return
  }
  setWindowGlobal(name, binding.base)
  globalBindings.delete(name)
}

class EvalSandbox {
  constructor(parent, makeGlobal, userProps = []) {
    this.makeGlobal = makeGlobal
    this.sandbox = Sandbox(parent)
    this.parent = parent
    this.boundGlobalProps = new Set()
    var properties = Object.keys(parent)
    properties.forEach((property) => this.add(property))
    this.userProps = userProps
  }

  _bindGlobal(name, value) {
    if (!this.makeGlobal) return
    registerGlobalOwner(name, this, value)
    this.boundGlobalProps.add(name)
  }

  add(name) {
    if (this.makeGlobal) {
      this._bindGlobal(name, this.parent[name])
    }
    // this.sandbox.addToContext(name, `parent.${name}`)
  }

// sets on window as well as synth object if global (not needed for objects, which can be set directly)

  set(property, value) {
    if(this.makeGlobal) {
      this._bindGlobal(property, value)
    }
    this.parent[property] = value
  }

  tick() {
    if(this.makeGlobal) {
      this.userProps.forEach((property) => {
        this.parent[property] = window[property]
      })
      //  this.parent.speed = window.speed
    } else {

    }
  }

  eval(code) {
    this.sandbox.eval(code)
  }

  destroy() {
    if (!this.makeGlobal) return
    this.boundGlobalProps.forEach((key) => {
      unregisterGlobalOwner(key, this)
    })
    this.boundGlobalProps.clear()
  }
}

export default EvalSandbox
