// handles code evaluation and attaching relevant objects to global and evaluation contexts

import Sandbox from './lib/sandbox.js'
import ArrayUtils from './lib/array-utils.js'

const MISSING_GLOBAL = Symbol('hydra-missing-global')

class EvalSandbox {
  constructor(parent, makeGlobal, userProps = []) {
    this.makeGlobal = makeGlobal
    this.sandbox = Sandbox(parent)
    this.parent = parent
    this.globalSnapshot = new Map()
    var properties = Object.keys(parent)
    properties.forEach((property) => this.add(property))
    this.userProps = userProps
  }

  _rememberGlobal(name) {
    if (!this.makeGlobal || this.globalSnapshot.has(name)) return
    if (Object.prototype.hasOwnProperty.call(window, name)) {
      this.globalSnapshot.set(name, window[name])
    } else {
      this.globalSnapshot.set(name, MISSING_GLOBAL)
    }
  }

  add(name) {
    if (this.makeGlobal) {
      this._rememberGlobal(name)
      window[name] = this.parent[name]
    }
    // this.sandbox.addToContext(name, `parent.${name}`)
  }

// sets on window as well as synth object if global (not needed for objects, which can be set directly)

  set(property, value) {
    if(this.makeGlobal) {
      this._rememberGlobal(property)
      window[property] = value
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
    this.globalSnapshot.forEach((value, key) => {
      if (value === MISSING_GLOBAL) {
        delete window[key]
      } else {
        window[key] = value
      }
    })
    this.globalSnapshot.clear()
  }
}

export default EvalSandbox
