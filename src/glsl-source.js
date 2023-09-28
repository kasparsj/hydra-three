import generateGlsl from './generate-glsl.js'
import utilityGlsl from './glsl/utility-functions.js'
import vectorizeText from 'vectorize-text';
import {replaceGenType} from "./types.js";
import HydraShader from "./lib/HydraShader.js";

var GlslSource = function (obj) {
  this.transforms = []
  this.transforms.push(obj)
  this.defaultOutput = obj.defaultOutput
  this.output = null
  this.synth = obj.synth
  this.type = 'GlslSource'
  this.defaultUniforms = obj.defaultUniforms
  this.utils = Object.assign({}, utilityGlsl, obj.utils);
  this._geometry = null;
  this._blendMode = typeof(obj.transform.blendMode) !== 'undefined' ? obj.transform.blendMode : false;
  this._linewidth = obj.transform._linewidth || 1;
  this._viewport = {};
  return this
}

GlslSource.prototype.addTransform = function (obj)  {
  this.transforms.push(obj)
}

GlslSource.prototype.out = function (_output) {
  var output = _output || this.defaultOutput
  this.output = output;
  var glsl = this.compile()
  this.synth.currentFunctions = []
  if(output) try{
    output.render(glsl)
  } catch (error) {
    console.log('shader could not compile', error)
  }
  return this;
}

GlslSource.prototype.tex = function(_output, options = {}) {
  if (!this.output) {
    this.out(_output);
  }
  return this.output.renderTexture(options);
}

GlslSource.prototype.compile = function (options = {}) {
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
      // todo: add support for generated vertex shader
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
  const uniforms = {}
  shaderInfo.uniforms.forEach((uniform) => { uniforms[uniform.name] = uniform.value });
  const precision = this.defaultOutput.precision;
  const transform = this.transforms[0];
  if (shaderInfo.combine) {
    if (transform) {
      Object.assign(options, {
        frag: HydraShader.compileFrag(transform.transform, shaderInfo, this.utils, {precision}),
        userArgs: transform.userArgs,
      });
    }
    return Object.assign({
      vert: HydraShader.compileVert({
        glslName: 'combine',
      }, shaderInfo, [], { precision, useCamera: false }),
      // todo: fix or delete
      // blendMode: this._blendMode,
      linewidth: this._linewidth,
      uniforms: Object.assign({}, this.defaultUniforms, uniforms),
      viewport: this._viewport,
      clear: this._autoClear,
    }, options);
  }

  if (transform) {
    Object.assign(options, {
      primitive: transform.transform.primitive,
      userArgs: transform.userArgs,
      frag: HydraShader.compileFrag(transform.transform, shaderInfo, this.utils, {precision}),
      vert: HydraShader.compileVert(transform.transform, shaderInfo, this.utils, { precision, useCamera: true }),
    });
  }
  return Object.assign({
    geometry: this._geometry,
    blendMode: this._blendMode,
    linewidth: this._linewidth,
    uniforms: Object.assign({}, this.defaultUniforms, uniforms),
    viewport: this._viewport,
    clear: this._autoClear,
  }, options)
}

// todo: make hydra-synth function
GlslSource.prototype.blendMode = function(blendMode = true) {
  this._blendMode = blendMode;
  return this;
}

GlslSource.prototype.linewidth = function(linewidth) {
  this._linewidth = linewidth;
  return this;
}

GlslSource.prototype.geometry = function(input) {
  const isGeometry = (v) => (v.isBufferGeometry || (v.positions && v.edges));
  const isClass = (v) => typeof v === 'function' && /^\s*class\s+/.test(v.toString());
  if (!input) input = [];
  if (!isGeometry(input)) {
    if (!Array.isArray(input)) input = [input];
    if (isClass(this.transforms[0].transform.geometry)) {
      if (this.transforms[0].transform.geometry === GridGeometry && this.transforms[0].transform.primitive && typeof(input[0]) !== 'string') {
        input.unshift(this.transforms[0].transform.primitive);
      }
      input = new (this.transforms[0].transform.geometry)(...input);
    }
    else {
      if (this.transforms[0].transform.geometry === vectorizeText && input.length === 1) {
        input.push({
          textAlign: 'center',
          textBaseline: 'middle',
          // font: 'arial',
          // triangles: true, // todo: make it work
        });
      }
      input = (this.transforms[0].transform.geometry)(...input);
    }
  }
  this._geometry = input;
}

GlslSource.prototype.viewport = function(x, y, w, h) {
  this._viewport = {x, y, w, h};
  return this;
}

GlslSource.prototype.autoClear = function(amount = 1.0, options = {}) {
  this._autoClear = {
    amount,
    ...options,
  };
  return this;
}

GlslSource.prototype.st = function(source) {
  const self = this;
  source.transforms.map((transform) => {
    if (transform.transform.type === 'genType') {
      transform.transform = replaceGenType(transform.transform, 'coord')
    }
    self.transforms.push(transform);
  });
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
