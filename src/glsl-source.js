import generateGlsl from './generate-glsl.js'
import utilityGlsl from './glsl/utility-functions.js'
import vectorizeText from 'vectorize-text'
import {replaceGenType} from "./types.js"
import * as THREE from "three"

var GlslSource = function (obj) {
  this.transforms = []
  this.transforms.push(obj)
  this.defaultOutput = obj.defaultOutput
  this.output = null
  this.synth = obj.synth
  this.type = 'GlslSource'
  this.defaultUniforms = obj.defaultUniforms
  this.utils = Object.assign({}, utilityGlsl, obj.utils)
  this._geometry = null;
  this._material = {};
  this._lights = null;
  this._viewport = {}
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
    return {
      vert: GlslSource.compileVert({
        glslName: 'combine',
      }, shaderInfo, [], { precision, useCamera: false }),
      userArgs: transform.userArgs,
      frag: GlslSource.compileFrag(transform.transform, shaderInfo, this.utils, {precision}),
      version: transform.version >= 300 ? THREE.GLSL3 : THREE.GLSL1,
      uniforms: Object.assign({}, this.defaultUniforms, uniforms),
      viewport: this._viewport,
      clear: this._autoClear,
    };
  }

  return Object.assign({
    useUV: typeof(transform.transform.useUV) !== 'undefined'
        ? transform.transform.useUV
        : (!transform.transform.primitive || ['points', 'lines', 'line strip', 'line loop'].indexOf(transform.transform.primitive) === -1),
    useNormal: typeof(transform.transform.useNormal) !== 'undefined'
        ? transform.transform.useNormal
        : transform.transform.type === 'vert' && (!transform.transform.primitive || ['points', 'lines', 'line strip', 'line loop'].indexOf(transform.transform.primitive) === -1),
    vert: GlslSource.compileVert(this.transforms[0].transform, shaderInfo, this.utils, { precision, useCamera: true }),
    primitive: transform.transform.primitive,
    userArgs: transform.userArgs,
    geometry: this._geometry,
    material: this._material,
    lights: this._lights,
    frag: GlslSource.compileFrag(transform.transform, shaderInfo, this.utils, {precision}),
    version: transform.version >= 300 ? THREE.GLSL3 : THREE.GLSL1,
    uniforms: Object.assign({}, this.defaultUniforms, uniforms),
    viewport: this._viewport,
    clear: this._autoClear,
  }, options)
}

GlslSource.compileHeader = function(transform, uniforms = {}, utils = {}, options = {}) {
  const isVertex = options.vert
  return `
  #include <common>
  ${!isVertex ? '#include <packing>' : ''}
  ${isVertex ? '#include <uv_pars_vertex>' : '#include <uv_pars_fragment>'}
  ${isVertex ? '#include <normal_pars_vertex>' : '#include <normal_pars_fragment>'}
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
  uniform sampler2D prevBuffer;
  ${Object.values(utils).map((trans) => {
    return `
            ${trans[('glsl' + transform.version)] || trans.glsl}
          `
  }).join('')}
  `
}

GlslSource.compileFrag = function(transform, shaderInfo, utils, options = {}) {
  const header = this.compileHeader(transform, shaderInfo.uniforms, utils, options)
  const fn = `
    ${shaderInfo.glslFunctions.map((trans) => {
    return `
            ${trans.transform[('glsl' + transform.version)] || trans.transform.glsl}
          `
  }).join('')}
  `
  const call = `
  vec2 st = vUv;
  gl_FragColor = ${shaderInfo.fragColor};
  `
  return [header, fn, call]
}

GlslSource.compileVert = function(transform, shaderInfo, utils, options = {}) {
  let vertHeader = `
  #include <common>
  #include <uv_pars_vertex>
  #include <normal_pars_vertex>
  `
  let vertFn = ``
  let vertCall = `
  #include <uv_vertex>
  #include <color_vertex>
  #include <morphcolor_vertex>
  #include <beginnormal_vertex>
  #include <morphnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>
  #include <normal_vertex>
  #include <begin_vertex>
  #include <morphtarget_vertex>
  #include <skinning_vertex>
  #include <displacementmap_vertex>
  ${options.useCamera ? '#include <project_vertex>' : 'gl_Position = vec4(position, 1.0);'}
  `;
  if (transform.vert) {
    vertHeader = this.compileHeader(transform, shaderInfo.uniforms, utils, Object.assign({vert: true}, options))
    vertFn = `
    ${shaderInfo.glslFunctions.map((trans) => {
      if (trans.transform.name !== transform.name) {
        return `
            ${trans.transform[('glsl' + transform.version)] || trans.transform.glsl}
          `
      }
    }).join('')}
    ${transform.vert}
    `;
    vertCall = `
    #if defined( USE_UV )
    vec2 st = uv;
    #else
    vec2 st = position.xy;
    #endif
    vPosition = ${shaderInfo.position}.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition, 1.0);
    `;
  }
  return [vertHeader, vertFn, vertCall];
}

GlslSource.prototype.lights = function(lights) {
  this._lights = lights;
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
  this._geometry = input;
}

GlslSource.prototype.material = function(options) {
  this._material = options;
  return this;
}

GlslSource.prototype.phong = function(options) {
  this.material(Object.assign({
    isMeshPhongMaterial: true,
    color: new THREE.Color( 0xffffff ),
    specular: new THREE.Color( 0x111111 ),
    shininess: 30,
  }, options));
  return this;
}

GlslSource.prototype.lambert = function(options) {
  this.material(Object.assign({
    isMeshLambertMaterial: true,
    color: new THREE.Color( 0xffffff ),
  }, options));
  return this;
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
