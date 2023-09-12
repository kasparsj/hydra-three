import generateGlsl from './generate-glsl.js'
import utilityGlsl from './glsl/utility-functions.js'
import vectorizeText from 'vectorize-text';

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

GlslSource.prototype.tex = function(_output) {
  if (!this.output) {
    this.out(_output);
  }
  return this.output.renderTexture();
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

  const vertTransform = this.transforms[0].transform.type === 'clear' ? this.transforms[1] : this.transforms[0];
  return Object.assign({
    vert: GlslSource.compileVert(this.defaultOutput.precision, true, vertTransform.transform, shaderInfo, this.utils),
    primitive: vertTransform.transform.primitive,
    userArgs: vertTransform.userArgs,
    geometry: this.geometry,
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
  varying vec3 vposition;
  varying vec2 vuv;
  varying vec3 vnormal;
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
    //vec2 st = gl_FragCoord.xy/resolution.xy;
    vec2 st = vuv;
    gl_FragColor = ${shaderInfo.fragColor};
  }
  `
}

GlslSource.compileVert = function(precision, useCamera, transform, shaderInfo, utils) {
  const useUV = typeof(transform.useUV) !== 'undefined'
    ? transform.useUV
    : (!transform.primitive || ['points', 'lines', 'line strip', 'line loop'].indexOf(transform.primitive) === -1);
  const useNormal = typeof(transform.useNormal) !== 'undefined'
      ? transform.useNormal
      : transform.type === 'vert' && (!transform.primitive || ['points', 'lines', 'line strip', 'line loop'].indexOf(transform.primitive) === -1)

  let vertHeader = `
  precision ${precision} float;
  uniform mat4 projection, view;
  attribute vec3 position;
  ${useUV ? 'attribute vec2 uv;' : ''}
  ${useNormal ? 'attribute vec3 normal;' : ''}
  varying vec3 vposition;
  varying vec2 vuv;
  varying vec3 vnormal;
  `
  let vertFn = `
  void ${transform.glslName}() {
    vposition = position;
    gl_Position = ${useCamera ? 'projection * view * ' : ''}vec4(position, 1.0);
  } 
  `
  let vertCall = `${transform.glslName}();`;
  if (transform.vert) {
    vertHeader = this.compileHeader(precision, shaderInfo.uniforms, utils) + `
    uniform mat4 projection, view;
    attribute vec3 position;
    ${useUV ? 'attribute vec2 uv;' : ''}
    ${useNormal ? 'attribute vec3 normal;' : ''}
    
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
    ${useUV ? 'vec2 st = uv;' : 'vec2 st = position.xy;'}
    vposition = ${shaderInfo.position};
    gl_Position = projection * view * vposition;
    `;
  }

  return vertHeader + `
    
  ${vertFn}

  void main () {
    ${useUV ? 'vuv = uv;' : ''}
    ${useNormal ? 'vnormal = normal;' : ''}
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

GlslSource.prototype.setGeometry = function(input) {
  const isGeometry = (v) => (v.isBufferGeometry || (v.positions && v.edges));
  const isClass = (v) => typeof v === 'function' && /^\s*class\s+/.test(v.toString());
  if (!input) input = [];
  if (!isGeometry(input)) {
    const vertTransform = this.transforms[0].transform.type === 'clear' ? this.transforms[1] : this.transforms[0];
    if (!Array.isArray(input)) input = [input];
    if (isClass(vertTransform.transform.geometry)) {
      if (vertTransform.transform.geometry === GridGeometry && vertTransform.transform.primitive && typeof(input[0]) !== 'string') {
        input.unshift(vertTransform.transform.primitive);
      }
      input = new (vertTransform.transform.geometry)(...input);
    }
    else {
      if (vertTransform.transform.geometry === vectorizeText && input.length === 1) {
        input.push({
          textAlign: 'center',
          textBaseline: 'middle',
          // font: 'arial',
          // triangles: true, // todo: make it work
        });
      }
      input = (vertTransform.transform.geometry)(...input);
    }
  }
  this.geometry = input;
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
