import generateGlsl from './generate-glsl.js'
import utilityGlsl from './glsl/utility-functions.js'
import {replaceGenType} from "./types.js"
import * as THREE from "three"
import {HydraFragmentShader, HydraVertexShader} from "./lib/HydraShader.js";
import * as cameraProto from "./lib/camera-proto.js";
import {HydraThree} from "./three/HydraThree.js";
import HydraUniform from "./three/HydraUniform.js";
import * as scene from "./three/scene.js";
import * as mt from "./three/mt.js";

var GlslSource = function (obj, options) {
  this.scene = null;
  this.transforms = [];
  this._geometry = null;
  this._instanced = 0;
  this._material = {};
  if (obj.scene) {
    this.scene = obj;
  }
  else if (obj) {
    this.scene = scene.createScene();
    if (obj.transform.type === 'vert') {
      this._geometry = obj.userArgs[0];
      obj.userArgs = obj.userArgs.slice(1);
    }
    this.transforms.push(obj);
  }
  this.defaultOutput = options.defaultOutput;
  this.output = null;
  this.type = 'GlslSource';
  this.defaultUniforms = options.defaultUniforms;
  this.utils = Object.assign({}, utilityGlsl, options.utils);
  this._viewport = {};
  return this;
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
  if (!options.uniforms) {
    const shaderUni = {}
    shaderInfo.uniforms.forEach((uniform) => { shaderUni[uniform.name] = uniform.value });
    options.uniforms = Object.assign({}, this.defaultUniforms, shaderUni);
  }
  // todo: fix (maybe set a limit of 50 uniform groups per output)
  // const group = this.output ? (this.output.label + this.passes.length) : ('temp_' + Math.random(10000));
  const group = 'temp_' + Math.random(10000)
  options.uniforms = Object.assign({}, {
    prevBuffer: { value: null },
  }, HydraUniform.wrapUniforms(options.uniforms, group));
  const transform = this.transforms[0];
  if (shaderInfo.combine) {
    if (transform) {
      Object.assign(options, {
        frag: new HydraFragmentShader(transform.transform, shaderInfo, this.utils),
        userArgs: transform.userArgs,
      });
    }
    return Object.assign({
      vert: new HydraVertexShader({
        glslName: 'combine',
      }, shaderInfo, [], { useCamera: false }),
      viewport: this._viewport,
      clear: this._autoClear,
    }, options);
  }

  if (transform) {
    Object.assign(options, {
      frag: new HydraFragmentShader(transform.transform, shaderInfo, this.utils),
      vert: new HydraVertexShader(transform.transform, shaderInfo, this.utils, { useCamera: true }),
      primitive: transform.transform.primitive,
      userArgs: transform.userArgs,
    });
    if (this._geometry) {
      const geometry = HydraThree.geometry(transform.transform, this._geometry);
      const material = mt.hydra(Object.assign({
        lights: this.scene.hasLights(),
      }, options), this._material);
      this.scene.add(HydraThree.object(transform.transform.primitive, geometry, material, this._instanced));
    }
    else if (this._material) {
      Object.assign(options, {
        material: Object.assign({lights: !!(this._material.isMeshLambertMaterial || this._material.isMeshPhongMaterial)}, this._material),
      });
    }
  }
  return Object.assign({
    scene: this.scene,
    camera: this._camera,
    viewport: this._viewport,
    clear: this._autoClear,
  }, options);
}

GlslSource.prototype.lights = function(options) {
  const camera = this._camera || (options && options.out || this.defaultOutput)._camera;
  this.scene.lights(camera, options || {cam: true, amb: true, sun: true, hemi: true});
  return this;
}

GlslSource.prototype.material = function(options) {
  this._material = options;
  return this;
}

GlslSource.prototype.basic = function(options = {}) {
  this.material(Object.assign({
    isMeshBasicMaterial: true,
    color: new THREE.Color( 0xffffff ),
  }, options));
  return this;
}

GlslSource.prototype.phong = function(options = {}) {
  this.material(Object.assign({
    isMeshPhongMaterial: true,
    color: new THREE.Color( 0xffffff ),
    specular: new THREE.Color( 0x111111 ),
    shininess: 30,
  }, options));
  return this;
}

GlslSource.prototype.lambert = function(options = {}) {
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

GlslSource.prototype.world = function(options = {}) {
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
