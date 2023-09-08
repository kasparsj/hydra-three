import generateGlsl from './generate-glsl.js'
import utilityGlsl from './glsl/utility-functions.js'

var GlslSource = function (obj) {
  this.transforms = []
  this.transforms.push(obj)
  this.defaultOutput = obj.defaultOutput
  this.output = null
  this.synth = obj.synth
  this.type = 'GlslSource'
  this.defaultUniforms = obj.defaultUniforms
  this.utils = Object.assign({}, utilityGlsl, obj.utils);
  this.blendMode = typeof(obj.transform.blendMode) !== 'undefined' ? obj.transform.blendMode : false;
  this.lineWidth = obj.transform.lineWidth || 1;
  this._viewport = {};
  return this
}

GlslSource.prototype.addTransform = function (obj)  {
  this.transforms.push(obj)
}

GlslSource.prototype.out = function (_output) {
  var output = _output || this.defaultOutput
  this.output = output;
  var glsl = this.glsl()
  this.synth.currentFunctions = []
  if(output) try{
    output.render(glsl)
  } catch (error) {
    console.log('shader could not compile', error)
  }
  return this;
}

GlslSource.prototype.glsl = function (options = {}) {
  this.passes = []
  this.passes.push(this.createPass(generateGlsl(this), options))
  return this.passes
}

GlslSource.prototype.getInfo = function () {
  if (this.transforms.length > 0) {
    var shaderInfo = generateGlsl(this)
    var uniforms = {}
    shaderInfo.uniforms.forEach((uniform) => { uniforms[uniform.name] = uniform.value })
    return {
      shaderInfo,
      utilityGlsl: this.utils,
      // todo: differs from compile
      vert: this.transforms[0].transform.vert,
      // todo: differs from compile
      attributes: this.transforms[0].transform.attributes,
      // todo: differs from compile
      attributesCount: this.transforms[0].transform.attributesCount,
      primitive: this.transforms[0].transform.primitive,
      uniforms: Object.assign({}, this.defaultUniforms, uniforms)
    };
  }
}

GlslSource.prototype.createPass = function(shaderInfo, options = {}) {
  var uniforms = {}
  shaderInfo.uniforms.forEach((uniform) => { uniforms[uniform.name] = uniform.value })

  if (shaderInfo.combine) {
    return {
      vert: GlslSource.compileVert(this.defaultOutput.precision, false, {
        glslName: 'combine',
      }, shaderInfo),
      userArgs: this.transforms[0].userArgs,
      // todo: fix or delete
      // blendMode: this.blendMode,
      lineWidth: this.lineWidth,
      frag: GlslSource.compileFrag(this.defaultOutput.precision, shaderInfo, this.utils),
      uniforms: Object.assign({}, this.defaultUniforms, uniforms),
      viewport: this._viewport,
    };
  }

  return Object.assign({
    vert: GlslSource.compileVert(this.defaultOutput.precision, true, this.transforms[0].transform, shaderInfo, this.utils),
    attributes: this.transforms[0].transform.attributes,
    primitive: this.transforms[0].transform.primitive,
    userArgs: this.transforms[0].userArgs,
    blendMode: this.blendMode,
    lineWidth: this.lineWidth,
    frag: GlslSource.compileFrag(this.defaultOutput.precision, shaderInfo, this.utils),
    uniforms: Object.assign({}, this.defaultUniforms, uniforms),
    viewport: this._viewport,
  }, options)
}

GlslSource.compileHeader = function(precision, uniforms = {}, utils = {}) {
  return `
  precision ${precision} float;
  ${Object.values(uniforms).map((uniform) => {
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
  
  ${Object.values(utils).map((transform) => {
    //  console.log(transform.glsl)
    return `
            ${transform.glsl}
          `
  }).join('')}
  `
}

GlslSource.compileFrag = function(precision, shaderInfo, utils) {
  const header = this.compileHeader(precision, shaderInfo.uniforms, utils);
  return header + `
  
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
}

GlslSource.compileVert = function(precision, useCamera, transform, shaderInfo, utils) {
  var vertHeader = `
  precision ${precision} float;
  uniform mat4 projection, view;
  attribute vec2 position;
  varying vec2 uv;
  `
  var vertFn = `
  void ${transform.glslName}() {
    gl_Position = ${useCamera ? 'projection * view * ' : ''}vec4(2.0 * position - 1.0, 0, 1);
  } 
  `
  var vertCall = `${transform.glslName}();`;
  if (transform.vert) {
    vertHeader = this.compileHeader(precision, shaderInfo.uniforms, utils) + `
    uniform mat4 projection, view;
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
    if (vertFn.indexOf(`vec4 ${transform.glslName}(`) === -1) {
      if (vertFn.indexOf(`vec4 main(`) > -1) {
        vertFn = vertFn.replace(`vec4 main(`, `vec4 ${transform.glslName}(`);
      }
      else if (transform.primitive) {
        let primitiveFn = transform.primitive.split(" ").join("");
        vertFn = vertFn.replace(`vec4 ${primitiveFn}(`, `vec4 ${transform.glslName}(`);
      }
    }
    vertCall = `
    vec2 st = uv;
    vec4 pos = ${shaderInfo.position};
    gl_Position = projection * view * pos;
    `;
  }

  return vertHeader + `
    
  ${vertFn}

  void main () {
    uv = position;
    ${vertCall}
  }`
}

// todo: make hydra-synth function
GlslSource.prototype.setBlend = function(blendMode = true) {
  this.blendMode = blendMode;
  return this;
}

GlslSource.prototype.setLineWidth = function(lineWidth) {
  this.lineWidth = lineWidth;
  return this;
}

GlslSource.prototype.viewport = function(x, y, w, h) {
  this._viewport = {x, y, w, h};
  return this;
}

const glslProps = ['x', 'y', 'z', 'xy', 'xz', 'yx', 'yz', 'zx', 'zy', 'xyz', 'xyzw'];
glslProps.map((prop) => {
  Object.defineProperty(GlslSource.prototype, prop, {
    get() {
      this.getter = prop;
      return this;
    }
  });
});

export default GlslSource
