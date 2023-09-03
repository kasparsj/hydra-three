import generateGlsl from './generate-glsl.js'
import formatArguments from './format-arguments.js'

// const glslTransforms = require('./glsl/composable-glsl-functions.js')
import utilityGlsl from './glsl/utility-functions.js'
import GlslTransform from "./glsl-transform.js";

var GlslSource = function (obj) {
  this.transforms = []
  this.transforms.push(obj)
  this.defaultOutput = obj.defaultOutput
  this.synth = obj.synth
  this.type = 'GlslSource'
  this.defaultUniforms = obj.defaultUniforms
  this.utils = Object.assign({}, utilityGlsl, obj.utils);
  return this
}

GlslSource.prototype = Object.create(GlslTransform.prototype);

GlslSource.prototype.out = function (_output) {
  var output = _output || this.defaultOutput
  var glsl = this.glsl(output)
  this.synth.currentFunctions = []
 // output.renderPasses(glsl)
  if(output) try{
    output.render(glsl)
  } catch (error) {
    console.log('shader could not compile', error)
  }
}

GlslSource.prototype.glsl = function (output) {
  //var output = _output || this.defaultOutput
  var self = this
  // uniforms included in all shaders
//  this.defaultUniforms = output.uniforms
  var passes = []
  var transforms = []
//  console.log('output', output)
  this.transforms.forEach((transform) => {
    if(transform.transform.type === 'renderpass') {
      // if (transforms.length > 0) passes.push(this.compile(transforms, output))
      // transforms = []
      // var uniforms = {}
      // const inputs = formatArguments(transform, -1)
      // inputs.forEach((uniform) => { uniforms[uniform.name] = uniform.value })
      //
      // passes.push({
      //   frag: transform.transform.frag,
      //   uniforms: Object.assign({}, self.defaultUniforms, uniforms)
      // })
      // transforms.push({name: 'prev', transform:  glslTransforms['prev'], synth: this.synth})
      console.warn('no support for renderpass')
    } else {
      transforms.push(transform)
      const inputs = formatArguments(transform, -1);
      // todo: another condition for a new pass could be clear option
      if (transform.transform.type === 'combine' && inputs[0].value.transforms && inputs[0].value.transforms[0].transform.vert) {
        passes = passes.concat(transform.userArgs[0].glsl());
        transform.userArgs[0] = output;
      }
    }
  })

  if (transforms.length > 0) passes.push(this.compile(transforms))

  return passes
}

GlslSource.prototype.getInfo = function () {
  var transforms = []
  this.transforms.forEach((transform) => {
    if(transform.transform.type === 'renderpass'){
      console.warn('no support for renderpass')
    } else {
      transforms.push(transform)
    }
  })
  if (transforms.length > 0) {
    var shaderInfo = generateGlsl(transforms, this.synth)
    var uniforms = {}
    shaderInfo.uniforms.forEach((uniform) => { uniforms[uniform.name] = uniform.value })
    return {
      shaderInfo,
      utilityGlsl: this.utils,
      // todo: differs from compile
      vert: transforms[0].transform.vert,
      // todo: differs from compile
      attributes: transforms[0].transform.attributes,
      // todo: differs from compile
      attributesCount: transforms[0].transform.attributesCount,
      primitive: transforms[0].transform.primitive,
      uniforms: Object.assign({}, this.defaultUniforms, uniforms)
    };
  }
}

GlslSource.prototype.compile = function (transforms) {
  var shaderInfo = generateGlsl(transforms, this.synth)
  var uniforms = {}
  shaderInfo.uniforms.forEach((uniform) => { uniforms[uniform.name] = uniform.value })

  var fragHeader = `
  precision ${this.defaultOutput.precision} float;
  ${Object.values(shaderInfo.uniforms).map((uniform) => {
    let type = uniform.type
    switch (uniform.type) {
      case 'texture':
        type = 'sampler2D'
        break
    }
    return `
      uniform ${type} ${uniform.name};`
  }).join('')}
  uniform float time;
  uniform vec2 resolution;
  varying vec2 uv;
  uniform sampler2D prevBuffer;
  
  ${Object.values(this.utils).map((transform) => {
    //  console.log(transform.glsl)
    return `
            ${transform.glsl}
          `
  }).join('')}
  `

  var frag = fragHeader + `
  
  ${shaderInfo.glslFunctions.map((transform) => {
    return `
            ${transform.transform.glsl}
          `
  }).join('')}

  void main () {
    vec4 c = vec4(1, 0, 0, 1);
    vec2 st = gl_FragCoord.xy/resolution.xy;
    gl_FragColor = ${shaderInfo.fragColor};
  }
  `

  return {
    vert: GlslSource.compileVert({
      precision: this.defaultOutput.precision,
      transform: transforms[0].transform,
      fragHeader,
      shaderInfo,
    }),
    attributes: transforms[0].transform.attributes,
    primitive: transforms[0].transform.primitive,
    userArgs: transforms[0].userArgs,
    clear: typeof(this.clear) !== 'undefined' ? this.clear : transforms[0].transform.clear,
    frag: frag,
    uniforms: Object.assign({}, this.defaultUniforms, uniforms)
  }

}

GlslSource.compileVert = function(options = {}) {
  const {precision, transform} = options;

  var vertHeader = `
  precision ${precision} float;
  attribute vec2 position;
  varying vec2 uv;
  `
  var vertFn = `
  void ${transform.name}() {
    gl_Position = vec4(2.0 * position - 1.0, 0, 1);
  } 
  `
  var vertCall = `${transform.name}();`;
  if (transform.vert) {
    const {fragHeader, shaderInfo} = options;

    vertHeader = fragHeader + `
    attribute vec2 position;
    
    ${shaderInfo.glslFunctions.map((trans) => {
      if (trans.transform.name !== transform.name) {
        return `
            ${trans.transform.glsl}
          `
      }
    }).join('')}
    `
    vertFn = transform.vert;
    vertCall = `
    vec2 st = uv;
    ${shaderInfo.fragColor};
    `;
  }

  return vertHeader + `
    
  ${vertFn}

  void main () {
    uv = position;
    ${vertCall}
  }`
}

GlslSource.prototype.setClear = function (amount = 1) {
  this.clear = amount;
  return this;
}

export default GlslSource
