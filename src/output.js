import GlslSource from "./glsl-source.js";
import * as THREE from "three";
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { ClearPass } from "three/examples/jsm/postprocessing/ClearPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { HydraUniform, HydraRenderPass } from "./lib/three.js";
import { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";

var Output = function (index, synth) {
  this.id = index;
  this.synth = synth;
  this.width = synth.width
  this.height = synth.height
  this.precision = synth.precision
  this.label = `o${index}`

  this.init()
}

Output.prototype.init = function () {
  this.composer = new EffectComposer(this.synth.renderer);
  this.composer.renderToScreen = false;

  new HydraUniform('prevBuffer', this.getTexture(), () => this.getTexture(), 'hydra-' + this.label);
  this.uniforms = {
    time: HydraUniform.get('time', 'hydra'),
    resolution: HydraUniform.get('resolution', 'hydra'),
  }

  this.temp0 = this.composer.renderTarget2.clone();
  this.temp0.texture.name = this.label + '.temp0';
  this.temp1 = this.composer.renderTarget2.clone();
  this.temp1.texture.name = this.label + '.temp1';

  this.camera();

  return this
}

Output.prototype.resize = function(width, height) {
  this.width = width;
  this.height = height;
  this.composer.setSize(width, height);
  this.temp0.setSize(width, height);
  this.temp1.setSize(width, height);
}


Output.prototype.getTexture = function () {
   return this.composer.readBuffer.texture;
}

Output.prototype.camera = function(eye = [0,0,1], target = [0,0,0], options = {}) {
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
  if (passes.length > 0) {
    for (let i=0; i<passes.length; i++) {
      let pass = passes[i];
      const scene = new THREE.Scene();
      // todo: allow change camera at pass level
      const renderPass = new HydraRenderPass(scene, this._camera, pass.renderTarget);
      if (pass.clear) {
        if (pass.clear.amount >= 1) {
          renderPass.clear = true;
        }
        else {
          this.composer.addPass(this.fade({now: false, ...pass.clear}));
        }
      }
      scene.add(this.createObject3D(pass.primitive, pass.geometry, this.createMaterial(pass)));
      this.composer.addPass(renderPass);
    }
  }
}

Output.prototype.clear = function() {
  const clear = new ClearPass();
  clear.render(this.composer.renderer, this.composer.writeBuffer, this.composer.readBuffer);
  return this;
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
          uniform sampler2D prevBuffer;
          void main() {
            vec4 color = mix(texture2D(prevBuffer, vuv), vec4(0), ${amount});
            gl_FragColor = color;
          }
        `,
    vertexShader: GlslSource.compileVert(this.precision, camera, { glslName: 'clear' }),
    uniforms: Object.assign({}, {
      prevBuffer: HydraUniform.get('prevBuffer', 'hydra-' + this.label),
    }, this.uniforms),
  }));
  if (now) return this;
  return fade;
}

Output.prototype.createMaterial = function(pass) {
  const uniforms = this.getUniforms(pass.uniforms);
  const blending = this.getBlend(pass.blendMode);
  return new THREE.ShaderMaterial({
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
  });
}

Output.prototype.createObject3D = function(primitive, geometry, material) {
  // todo: add support vectorizeText?
  // if (geometry.positions && (geometry.edges || geometry.cells)) {
  //   attributes.position = []; // todo: should be Float32Array
  //   geometry.positions.map((v, k) => attributes.position.push(v[0], v[1], 0));
  //   elements = geometry.edges ? geometry.edges : geometry.cells;
  //   primitive = geometry.edges ? 'lines' : 'triangles';
  // }
  switch (primitive) {
    case 'points':
      return new THREE.Points(geometry, material);
    case 'line loop':
    case 'lineloop':
      return new THREE.LineLoop(geometry, material);
    case 'line strip':
    case 'linestrip':
      return new THREE.Line(geometry, material);
    case 'lines':
      return new THREE.LineSegments(geometry, material);
    default:
      const quad = new FullScreenQuad(material);
      if (geometry) {
        quad._mesh.geometry.dispose();
        quad._mesh.geometry = geometry;
      }
      return quad._mesh;
  }
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
  const temp = new EffectComposer(this.synth.renderer);
  HydraUniform.update();
  for (let i=0; i<this.composer.passes.length; i++) {
    temp.addPass(this.composer.passes[i]);
  }
  temp.render();
  const tex = temp.readBuffer.texture.clone();
  temp.dispose();
  return tex;
}

export default Output
