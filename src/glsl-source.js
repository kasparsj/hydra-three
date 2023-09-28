import generateGlsl from './generate-glsl.js'
import utilityGlsl from './glsl/utility-functions.js'
import vectorizeText from 'vectorize-text'
import {replaceGenType} from "./types.js"
import * as THREE from "three"
import {HydraFragmentShader, HydraVertexShader} from "./lib/HydraShader.js";
import * as cameraProto from "./lib/camera-proto.js";

var GlslSource = function (obj, options) {
  this.scene = null;
  this.transforms = []
  if (obj.scene) {
    this.scene = obj;
  }
  else if (obj) {
    this.transforms.push(obj)
  }
  this.defaultOutput = options.defaultOutput
  this.output = null
  this.type = 'GlslSource'
  this.defaultUniforms = options.defaultUniforms
  this.utils = Object.assign({}, utilityGlsl, options.utils)
  this._geometry = null;
  this._instanced = 0;
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

GlslSource.prototype.createPass = function(shaderInfo, options = {}) {
  const uniforms = {}
  shaderInfo.uniforms.forEach((uniform) => { uniforms[uniform.name] = uniform.value });

  const precision = this.defaultOutput.precision;
  const transform = this.transforms[0];
  if (shaderInfo.combine) {
    if (transform) {
      Object.assign(options, {
        frag: new HydraFragmentShader(transform.transform, shaderInfo, this.utils, {precision}),
        userArgs: transform.userArgs,
      });
    }
    return Object.assign({
      vert: new HydraVertexShader({
        glslName: 'combine',
      }, shaderInfo, [], { precision, useCamera: false }),
      uniforms: Object.assign({}, this.defaultUniforms, uniforms),
      viewport: this._viewport,
      clear: this._autoClear,
    }, options);
  }

  if (transform) {
    Object.assign(options, {
      frag: new HydraFragmentShader(transform.transform, shaderInfo, this.utils, {precision}),
      vert: new HydraVertexShader(transform.transform, shaderInfo, this.utils, { precision, useCamera: true }),
      primitive: transform.transform.primitive,
      userArgs: transform.userArgs,
    });
  }
  return Object.assign({
    scene: this.scene,
    uniforms: Object.assign({}, this.defaultUniforms, uniforms),
    camera: this._camera,
    geometry: this._geometry,
    instanced: this._instanced,
    material: this._material,
    lights: this._lights,
    viewport: this._viewport,
    clear: this._autoClear,
  }, options)
}

GlslSource.prototype.lights = function(options) {
  const camera = this._camera || (options.out || this.defaultOutput)._camera;
  this.scene.lights(camera, options || {cam: true, amb: true, sun: true, hemi: true});
  return this;
}

GlslSource.prototype.geometry = function(input) {
  const isGeometry = (v) => (v.isBufferGeometry || (v.positions && v.edges));
  const isClass = (v) => typeof v === 'function' && /^\s*class\s+/.test(v.toString());
  if (!input) input = [];
  if (!isGeometry(input)) {
    if (!Array.isArray(input)) input = [input];
    const transform = this.transforms[0];
    if (isClass(transform.transform.geometry)) {
      if (transform.transform.geometry === GridGeometry && transform.transform.primitive && typeof(input[0]) !== 'string') {
        input.unshift(transform.transform.primitive);
      }
      input = new (transform.transform.geometry)(...input);
    }
    else if (typeof transform.transform.geometry === 'function') {
      if (transform.transform.geometry === vectorizeText && input.length === 1) {
        input.push({
          textAlign: 'center',
          textBaseline: 'middle',
          // font: 'arial',
          // triangles: true, // todo: make it work
        });
      }
      input = (transform.transform.geometry)(...input);
    }
  }
  this._geometry = input;
}

GlslSource.prototype.material = function(options) {
  this._material = options;
  return this;
}

GlslSource.prototype.basic = function(options) {
  this.material(Object.assign({
    isMeshBasicMaterial: true,
    color: new THREE.Color( 0xffffff ),
  }, options));
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

GlslSource.prototype.instanced = function(count) {
  this._instanced = count;
  return this;
}

GlslSource.prototype.world = function(options) {
  if (!options.near || !options.far) {
    const camera = this._camera || (options.out || this.defaultOutput)._camera;
    options = Object.assign({
      near: camera.near,
      far: camera.far,
    }, options);
  }
  this.scene.world(options);
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

Object.assign(GlslSource.prototype, cameraProto);

export default GlslSource
