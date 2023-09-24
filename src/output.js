import GlslSource from "./glsl-source.js";
import * as THREE from "three";
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { ClearPass } from "three/examples/jsm/postprocessing/ClearPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { HydraUniform, HydraRenderPass } from "./lib/three.js";

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
      let options = passes[i];
      options.label = this.label;
      options.camera || (options.camera = this._camera);
      const renderPass = new HydraRenderPass(options);
      if (options.clear) {
        if (options.clear.amount >= 1) {
          renderPass.clear = true;
        }
        else {
          this.composer.addPass(this.fade({now: false, ...options.clear}));
        }
      }
      this.composer.addPass(renderPass);
    }
  }
}

Output.prototype.clear = function() {
  const clear = new ClearPass();
  clear.render(this.composer.renderer, this.composer.writeBuffer, this.composer.readBuffer);
  clear.render(this.composer.renderer, this.composer.readBuffer, this.composer.writeBuffer);
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
  const shaderPass = new ShaderPass(new THREE.ShaderMaterial({
    fragmentShader: `
          varying vec2 vuv;
          uniform sampler2D prevBuffer;
          void main() {
            vec4 color = mix(texture2D(prevBuffer, vuv), vec4(0), ${amount});
            gl_FragColor = color;
          }
        `,
    vertexShader: GlslSource.compileVert(this.precision, camera, { glslName: 'clear' }),
    uniforms: Object.assign({
      prevBuffer: { value: null }
    }, this.uniforms),
    depthTest: false,
  }), 'prevBuffer');
  shaderPass.needsSwap = false;
  if (now) {
    shaderPass.render(this.composer.renderer, this.composer.writeBuffer, this.composer.readBuffer);
    return this;
  }
  return shaderPass;
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
