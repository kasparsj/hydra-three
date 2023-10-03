import GlslSource from './glsl-source.js'
import glslFunctions from './glsl/glsl-functions.js'
import {typeLookup, processGlsl} from "./types.js";

class GeneratorFactory {
  constructor ({
      defaultUniforms,
      defaultOutput,
      extendTransforms = [],
      changeListener = (() => {})
    } = {}
    ) {
    this.defaultOutput = defaultOutput
    this.defaultUniforms = defaultUniforms
    this.changeListener = changeListener
    this.extendTransforms = extendTransforms
    this.generators = {}
    this.utils = {}
    this.init()
  }
  init () {
    const functions = glslFunctions()
    this.glslTransforms = {}
    this.generators = Object.entries(this.generators).reduce((prev, [method, transform]) => {
      this.changeListener({type: 'remove', synth: this, method})
      return prev
    }, {})

    this.sourceClass = (() => {
      return class extends GlslSource {
      }
    })()

    // add user definied transforms
    if (Array.isArray(this.extendTransforms)) {
      functions.concat(this.extendTransforms)
    } else if (typeof this.extendTransforms === 'object' && this.extendTransforms.type) {
      functions.push(this.extendTransforms)
    }

    functions.map((transform) => this.setFunction(transform))
 }

  createSource(method, source, args) {
    if (!this.glslTransforms[method]) {
      this.glslTransforms[method] = source
    }
    return new this.sourceClass({name: method, transform: source, userArgs: args, synth: this}, {
        defaultOutput: this.defaultOutput,
        defaultUniforms: this.defaultUniforms,
        utils: this.utils,
    })
  }

 _addMethod (method, transform) {
    this.glslTransforms[method] = transform
    let retval = undefined
    if (['src', 'coord', 'genType', 'vert', 'glsl'].indexOf(transform.type) > -1) {
      const func = (...args) => this.createSource(method, transform, args)
      this.generators[method] = func
      this.changeListener({type: 'add', synth: this, method})
      retval = func
    }
    const self = this
    this.sourceClass.prototype[method] = function (...args) {
      if (this.transforms.length === 0 || (transform.type !== 'src' && transform.type !== 'vert')) {
        this.transforms.push({name: method, transform: transform, userArgs: args, synth: self})
      }
      else {
          console.error(`transform ${transform.name} not allowed after ${this.transforms[this.transforms.length-1].name}`);
      }
      return this
    }
    return retval
  }

  setFunction(obj) {
    // todo: remove utils and instead manage function dependencies
    if (obj.type === 'util') this.utils[obj.name] = obj;
    var processedGlsl = processFunction(obj)
    if(processedGlsl) this._addMethod(obj.name, processedGlsl)
  }
}

// expects glsl of format
// {
//   name: 'osc', // name that will be used to access function as well as within glsl
//   type: 'src', // can be src: vec4(vec2 _st), coord: vec2(vec2 _st), color: vec4(vec4 _c0), combine: vec4(vec4 _c0, vec4 _c1), combineCoord: vec2(vec2 _st, vec4 _c0)
//   inputs: [
//     {
//       name: 'freq',
//       type: 'float', // 'float'   //, 'texture', 'vec4'
//       default: 0.2
//     },
//     {
//           name: 'sync',
//           type: 'float',
//           default: 0.1
//         },
//         {
//           name: 'offset',
//           type: 'float',
//           default: 0.0
//         }
//   ],
   //  glsl: `
   //    vec2 st = _st;
   //    float r = sin((st.x-offset*2/freq+time*sync)*freq)*0.5  + 0.5;
   //    float g = sin((st.x+time*sync)*freq)*0.5 + 0.5;
   //    float b = sin((st.x+offset/freq+time*sync)*freq)*0.5  + 0.5;
   //    return vec4(r, g, b, 1.0);
   // `
// }

// // generates glsl function:
// `vec4 osc(vec2 _st, float freq, float sync, float offset){
//  vec2 st = _st;
//  float r = sin((st.x-offset*2/freq+time*sync)*freq)*0.5  + 0.5;
//  float g = sin((st.x+time*sync)*freq)*0.5 + 0.5;
//  float b = sin((st.x+offset/freq+time*sync)*freq)*0.5  + 0.5;
//  return vec4(r, g, b, 1.0);
// }`

function processFunction(obj) {
  obj.glslName || (obj.glslName = obj.name);
  if (obj.type === 'glsl' || obj.type === 'genType') return obj;
  else if (obj.type === 'util') {
    return processGlsl(obj, obj.returnType);
  }
  let t = typeLookup[obj.type]
  if(t) {
    return processGlsl(obj, t.returnType, t.args);
  } else {
    console.warn(`type ${obj.type} not recognized`, obj)
  }

}

window.processFunction = processFunction;

export { GeneratorFactory, processFunction }
