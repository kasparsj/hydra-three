import GlslSource from './glsl-source.js'
import glslFunctions from './glsl/glsl-functions.js'
import vertFunctions from './glsl/vert-functions.js'
import {typeLookup} from "./types.js";

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

    const functions2 = vertFunctions(this.generators); // sandbox is not ready at this moment yet
    functions2.map((transform) => this.setFunction(transform))
 }

 _addMethod (method, transform) {
    const self = this
    this.glslTransforms[method] = transform
    let retval = undefined
    if (['src', 'coord', 'vert', 'glsl'].indexOf(transform.type) > -1) {
      const func = (...args) => new this.sourceClass({
        name: method,
        transform: transform,
        userArgs: args,
        defaultOutput: this.defaultOutput,
        defaultUniforms: this.defaultUniforms,
        synth: self,
        utils: this.utils,
      })
      this.generators[method] = func
      this.changeListener({type: 'add', synth: this, method})
      retval = func
    }
    this.sourceClass.prototype[method] = function (...args) {
      if (transform.type !== 'src' && transform.type !== 'vert') {
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
  if (obj.type === 'glsl') return obj;
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

function processGlsl(obj, returnType, args = []) {
    let baseArgs = args.map((arg) => arg).join(", ")
    let customArgs = (obj.inputs || (obj.inputs = [])).map((input) => `${input.type} ${input.name}`).join(', ')
    let allArgs = `${baseArgs}${customArgs.length > 0 ? ', '+ customArgs: ''}`

    const func = `${returnType || ''} ${obj.glslName}(${allArgs}`;
    const fixOrWrap = (glsl) => {
        if (glsl.indexOf(func) === -1) {
            if (glsl.indexOf(`${returnType} main(${allArgs}`) > -1) {
                return glsl.replace(`${returnType} main(${allArgs}`, func);
            }
            else {
                if (obj.primitive) {
                    let primitiveFn = obj.primitive.split(" ").join("");
                    if (glsl.indexOf(primitiveFn) > -1) {
                        return glsl.replace(`${returnType} ${primitiveFn}(${allArgs}`, func);
                    }
                }
                if (returnType) {
                    return `
  ${func}) {
      ${glsl}
  }
`
                }
            }
        }
        return glsl;
    }
    obj.glsl = fixOrWrap(obj.glsl);
    if (obj.vert) {
        obj.vert = fixOrWrap(obj.vert);
    }

    // add extra input to beginning for backward combatibility @todo update compiler so this is no longer necessary
    if(obj.type === 'combine' || obj.type === 'combineCoord') obj.inputs.unshift({
        name: 'color',
        type: 'vec4'
    })
    return Object.assign({}, obj, { returnType })
}

export default GeneratorFactory
