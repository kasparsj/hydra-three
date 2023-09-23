import GlslSource from "./glsl-source.js";
import * as THREE from "three";
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { ClearPass } from "three/examples/jsm/postprocessing/ClearPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { HydraUniform } from "./lib/three-utils.js";

var Output = function (index, synth) {
  this.id = index;
  this.synth = synth;
  this.width = synth.width
  this.height = synth.height
  this.composer = new EffectComposer(synth.renderer)
  this.composer.renderToScreen = false
  this._camera = null
  this.precision = synth.precision
  this.label = `o${index}`

  this.init()
}

Output.prototype.init = function () {
  new HydraUniform('prevBuffer', this.getTexture(), () => this.getTexture(), 'hydra-' + this.label);
  new HydraUniform('currentBuffer', this.getCurrent(), () => this.getCurrent(), 'hydra-' + this.label);
  this.uniforms = {
    time: HydraUniform.get('time', 'hydra'),
    resolution: HydraUniform.get('resolution', 'hydra'),
  }
  return this
}

Output.prototype.resize = function(width, height) {
  this.width = width;
  this.height = height;
  this.composer.setSize(width, height);
}


Output.prototype.getCurrent = function () {
  return this.composer.writeBuffer.texture;
}

Output.prototype.getTexture = function () {
   return this.composer.readBuffer.texture;
}

Output.prototype.camera = function(eye, target = [0,0,0], options = {}) {
  options = Object.assign({
    fov: 50,
    aspect: 1,
    near: 0,
    far: 1,
    left: -1,
    right: 1,
    top: 1,
    bottom: -1,
  }, options);
  this.eye = eye;
  this.target = target;
  if (eye && target) {
    switch (options.type) {
      case 'perspective':
        this._camera = new THREE.PerspectiveCamera( options.fov, options.aspect, options.near, options.far);
        break;
      case 'ortho':
      case 'orthographic':
      default:
        this._camera = new THREE.OrthographicCamera(options.left, options.right, options.top, options.bottom, options.near, options.far);
        break;
    }
    this._camera.position.set(...eye);
    this._camera.lookAt(...target);
    this._camera.updateProjectionMatrix();
  }
  else {
    this._camera = null;
  }
  return this;
}

Output.prototype.perspective = function(eye, target = [0,0,0], options = {}) {
  options = Object.assign({type: 'perspective'}, options);
  return this.camera(eye, target, options);
}

Output.prototype.ortho = function(eye, target = [0,0,0], options = {}) {
  options = Object.assign({type: 'ortho'}, options);
  return this.camera(eye, target, options);
}

Output.prototype.render = function (passes) {
  // ensure both fbo's have last frame
  // todo: make sure needsSwap is true
  for (let i=0; i<this.composer.passes.length; i++) {
    this.composer.passes[i].dispose();
  }
  this.composer.passes = [];
  this.passes = passes;
  let clear = false;
  for (let i=0; i<passes.length; i++) {
    if (passes[i].clear) {
      clear = passes[i].clear;
      break;
    }
  }
  if (clear) {
    if (clear.amount >= 1) {
      this.composer.addPass(this.clear(false));
    }
    else {
      this.composer.addPass(this.fade({now: false, ...clear}));
    }
  }
  for (let i=0; i<passes.length; i++) {
    let pass = passes[i]
    // todo: add support vectorizeText?
    // if (geometry.positions && (geometry.edges || geometry.cells)) {
    //   attributes.position = []; // todo: should be Float32Array
    //   geometry.positions.map((v, k) => attributes.position.push(v[0], v[1], 0));
    //   elements = geometry.edges ? geometry.edges : geometry.cells;
    //   primitive = geometry.edges ? 'lines' : 'triangles';
    // }
    const uniforms = this.getUniforms(pass.uniforms);
    const blending = this.getBlend(pass.blendMode);
    const shaderPass = new ShaderPass(new THREE.ShaderMaterial({
      fragmentShader: pass.frag,
      vertexShader: pass.vert,
      glslVersion: pass.version,
      // todo: add support for viewport?
      // viewport: typeof(pass.viewport.x) !== 'undefined' ? {
      //   x: pass.viewport.x * this.fbos[0].width,
      //   y: pass.viewport.y * this.fbos[0].height,
      //   width: pass.viewport.w * this.fbos[0].width,
      //   height: pass.viewport.h * this.fbos[0].height,
      // } : {},
      // todo: add support for side parameter
      // cull: {
      //   enable: !!pass.geometry,
      //   face: 'back'
      // },
      uniforms,
      blending,
      linewidth: pass.linewidth,
      transparent: true,
    }))
    if (pass.geometry) {
      shaderPass.fsQuad._mesh.geometry = pass.geometry
    }
    this.composer.addPass(shaderPass)
  }
}

Output.prototype.clear = function(now = true) {
  const result = (() => {
    const clear = new ClearPass();
    if (now) clear.render(this.composer.renderer, this.composer.writeBuffer, this.composer.readBuffer);
    else return clear;
  })();
  if (now) return this;
  return result;
}

Output.prototype.fade = function(options) {
  let amount = options;
  let camera = false;
  let now = true;
  if (typeof(options) === 'object') {
    ({amount, camera} = options);
    now = typeof(options.now) === 'undefined' ? true : options.now;
  }
  // todo: do we need to fade also temp buffers?
  const fade = new ShaderPass(new THREE.ShaderMaterial({
    fragmentShader: `
          varying vec2 vuv;
          uniform sampler2D currentBuffer;
          void main() {
            vec4 color = mix(texture2D(currentBuffer, vuv), vec4(0), ${amount});
            gl_FragColor = color;
          }
        `,
    vertexShader: GlslSource.compileVert(this.precision, camera, { glslName: 'clear' }),
    uniforms: Object.assign({}, {
      currentBuffer: HydraUniform.get('currentBuffer', 'hydra-' + this.label),
    }, this.uniforms),
  }));
  if (now) return this;
  return fade;
}

Output.prototype.getUniforms = function(uniforms) {
  HydraUniform.destroyGroup(this.label);
  uniforms = Object.assign(uniforms, {
    prevBuffer: HydraUniform.get('prevBuffer', 'hydra-' + this.label),
  });
  const props = () => {
    return {
      time: HydraUniform.get('time', 'hydra').value,
      bpm: HydraUniform.get('bpm', 'hydra').value,
    };
  };
  return Object.keys(uniforms).reduce((acc, key) => {
    acc[key] = typeof(uniforms[key]) === 'string' ? parseFloat(uniforms[key]) : uniforms[key];
    if (typeof acc[key] === 'function') {
      const func = acc[key];
      acc[key] = new HydraUniform(key, null, ()=>func(null, props()), this.label);
    }
    else if (typeof acc[key].value === 'undefined') acc[key] = { value: acc[key] }
    return acc;
  }, {});
}

Output.prototype.getBlend = function(blendMode) {
  switch (blendMode) {
    case 'custom':
      // todo: implement CustomBlending
      return THREE.CustomBlending;
    case 'subtractive':
      return THREE.SubtractiveBlending;
    case 'multiply':
      return THREE.MultiplyBlending;
    case 'add':
      return THREE.AdditiveBlending;
    case 'alpha':
    case 'normal':
      return THREE.NormalBlending;
    default:
      return THREE.NoBlending;
  }
}

Output.prototype.tick = function () {
  this.composer.render();
}

Output.prototype.renderTexture = function(options = {}) {
  // todo: fix
  const next = this.pingPongIndex ? 0 : 1;
  const original = this.fbos;
  this.initFbos({color: options});
  this.synth._renderOut(this.id);
  const colorTex = this.fbos[this.pingPongIndex].color;
  this.fbos = original;
  return Array.isArray(colorTex) ? colorTex[0] : colorTex;
}

export default Output
