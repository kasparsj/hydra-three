import generateGlsl from './generate-glsl.js'
import utilityGlsl from './glsl/utility-functions.js'
import {replaceGenType} from "./types.js"
import * as THREE from "three"
import {HydraFragmentShader, HydraVertexShader} from "./lib/HydraShader.js";
import * as cameraProto from "./lib/camera-proto.js";
import HydraUniform from "./three/HydraUniform.js";
import * as scene from "./three/scene.js";
import * as mt from "./three/mt.js";
import {GridGeometry} from "./lib/GridGeometry.js";

var GlslSource = function (obj, options) {
  this.scene = null;
  this.transforms = [];
  this._material = {};
  if (obj) {
    if (obj.scene) {
      this.scene = obj;
    }
    else {
      this.scene = scene.createScene();
      this.transforms.push(obj);
    }
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
        frag: new HydraFragmentShader(Object.assign({}, transform.transform, {
          // todo: quickfix
          useUV: true,
        }), shaderInfo, this.utils),
        userArgs: transform.userArgs,
      });
    }
    // todo: quickfix
    delete options.renderTarget;
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
    if (this._material) {
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

GlslSource.prototype.obj = function(...args) {
  let object;
  if (args[0] instanceof THREE.Object3D) {
    object = args[0];
  }
  else {
    let [geometry, material, options] = args;
    if (material instanceof GlslSource) {
      material = mt.hydra(material, options.material);
    }
    if (!geometry) geometry = [];
    if (!geometry.isBufferGeometry) {
      if (!Array.isArray(geometry)) geometry = [geometry];
      if (typeof(geometry[0]) !== 'string') {
        geometry.unshift(options.primitive);
      }
      geometry = new GridGeometry(...geometry);
    }
    switch (options.primitive) {
      case 'points':
      case 'line loop':
      case 'lineloop':
      case 'line strip':
      case 'linestrip':
      case 'lines':
        switch (options.primitive) {
          case 'points':
            object = new THREE.Points(geometry, material);
            break;
          case 'line loop':
          case 'lineloop':
            object = new THREE.LineLoop(geometry, material);
            break;
          case 'line strip':
          case 'linestrip':
            object = new THREE.Line(geometry, material);
            break;
          case 'lines':
            object = new THREE.LineSegments(geometry, material);
            break;
        }
        break;
      default:
        // todo: text
        // todo: plane
        if (typeof material === 'undefined' || !(material instanceof THREE.Material)) {
          material = mt.mesh(material);
        }
        if (options.instanced) {
          object = new THREE.InstancedMesh(geometry, material, options.instanced);
        }
        else {
          object = new THREE.Mesh(geometry, material);
        }
        break;
    }
  }
  this.scene.add(object);
  return this;
}

GlslSource.prototype.mesh = function(...args) {
  args[2] = Object.assign(args[2] || {}, { primitive: 'triangles' });
  return this.obj(...args);
}

GlslSource.prototype.points = function(...args) {
  args[2] = Object.assign(args[2] || {}, { primitive: 'points' });
  return this.obj(...args);
}

GlslSource.prototype.linestrip = function(...args) {
  args[2] = Object.assign(args[2] || {}, { primitive: 'linestrip' });
  return this.obj(...args);
}

GlslSource.prototype.lines = function(...args) {
  args[2] = Object.assign(args[2] || {}, { primitive: 'lines' });
  return this.obj(...args);
}

GlslSource.prototype.lineloop = function(...args) {
  args[2] = Object.assign(args[2] || {}, { primitive: 'lineloop' });
  return this.obj(...args);
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
