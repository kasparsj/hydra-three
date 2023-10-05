import * as THREE from "three";
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { ClearPass } from "three/examples/jsm/postprocessing/ClearPass.js";
import {HydraUniform} from "./three/HydraUniform.js";
import { HydraMaterialPass, HydraRenderPass } from "./three/HydraPass.js";
import {HydraVertexShader, HydraShader} from "./lib/HydraShader.js";
import {cameraMixin, clearMixin} from "./lib/mixins.js";
import * as fx from "./three/fx.js";
import * as layers from "./three/layers.js";
import * as tx from "./three/tx.js";

var Output = function (index, synth) {
  this.id = index;
  this.synth = synth;
  this.width = synth.width
  this.height = synth.height
  this.precision = synth.precision
  this.label = `o${index}`

  this.init()
}

Object.assign(Output.prototype, cameraMixin, clearMixin);

Output.prototype.init = function () {
  this.composer = new EffectComposer(this.synth.renderer);
  this.composer.renderToScreen = false;

  this.uniforms = {
    time: HydraUniform.get('time', 'hydra'),
    resolution: HydraUniform.get('resolution', 'hydra'),
  }

  this.initTempFbos(this.composer.renderTarget2);
  this.camera();
  this.reset();

  return this
}

Output.prototype.createFbo = function(options = {}) {
  const renderer = this.synth.renderer;
  const size = renderer.getSize( new THREE.Vector2() );
  options = Object.assign({
    width: size.width * renderer.getPixelRatio(),
    height: size.height * renderer.getPixelRatio(),
  }, options);
  return tx.fbo(options);
}

Output.prototype.initFbos = function(renderTarget) {
  if (!renderTarget.isRenderTarget) {
    renderTarget = this.createFbo(renderTarget);
  }
  this.composer.renderTarget1 = renderTarget;
  this.composer.renderTarget1.name = 'EffectComposer.rt1';
  this.composer.renderTarget2 = renderTarget.clone();
  this.composer.renderTarget2.name = 'EffectComposer.rt2';
  this.composer.writeBuffer = this.composer.renderTarget1;
  this.composer.readBuffer = this.composer.renderTarget2;
  this.initTempFbos(renderTarget);
}

Output.prototype.initTempFbos = function(renderTarget) {
  this.temp0 = renderTarget.clone();
  this.temp0.texture.name = this.label + '.temp0';
  this.temp1 = renderTarget.clone();
  this.temp1.texture.name = this.label + '.temp1';
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

Output.prototype.reset = function() {
  for (let i=0; i<this.composer.passes.length; i++) {
    this.composer.passes[i].dispose();
  }
  this.composer.passes = [];
  if (this.layers) {
    for (let i=0; i<this.layers.length; i++) {
      this.layers[i].dispose();
    }
  }
  this.layers = [];
  this.controls = [];
}

Output.prototype._set = function (passes) {
  this.reset();
  if (passes.length > 0) {
    // todo: output level clear and fade are not working properly
    if (this._clear && this._clear.amount > 0) {
      if (this._clear.amount >= 1) {
        this.composer.addPass(new ClearPass());
      }
      else {
        this.composer.addPass(this._fadePass({...this._clear}));
      }
    }
    for (let i=0; i<passes.length; i++) {
      let options = passes[i];
      let pass, fxScene, fxCamera;
      if (options.scene && !options.scene.empty()) {
        options.camera || (options.camera = this._camera);
        if (options.camera.userData.controls) {
          this.controls.push(options.camera.userData.controls);
        }
        fxScene = options.scene;
        fxCamera = options.camera;
        pass = new HydraRenderPass(fxScene, fxCamera, options);
        if (options.layers && options.layers.length) {
          options.layers.map((layer, i) => {
            layer.compile(this.synth.renderer, fxCamera);
            options.fx = (options.fx || {});
            // todo: composer does not work with 2 successive renderTarget - prevBuffer will not be prev renderTarget
            // todo: maybe make sure only last pass has renderTarget?
            options.fx[('layer' + i)] = layer.getMixPass({renderTarget: options.renderTarget});
          });
          this.layers.push(...options.layers);
        }
      }
      else {
        pass = new HydraMaterialPass(options);
      }
      if (options.clear && options.clear.amount > 0) {
        if (options.clear.amount >= 1) {
          pass.clear = true;
        }
        else {
          this.composer.addPass(this._fadePass({...options.clear}));
        }
      }
      this.composer.addPass(pass);
      if (options.fx) {
        fx.add(Object.assign({}, options.fx, {
          composer: this.composer,
          scene: fxScene,
          camera: fxCamera,
        }));
      }
    }
  }
}

Output.prototype.clearNow = function() {
  const clear = new ClearPass();
  clear.render(this.composer.renderer, this.composer.writeBuffer, this.composer.readBuffer);
  clear.render(this.composer.renderer, this.composer.readBuffer, this.composer.writeBuffer);
  return this;
}

Output.prototype._fadePass = function(options) {
  let amount = options;
  let camera = false;
  if (typeof(options) === 'object') {
    ({amount, camera} = options);
  }
  // todo: do we need to fade also temp buffers?
  const passOptions = {
    // todo: create class/struct
    frag: new HydraShader(THREE.GLSL1, ['', `
      varying vec2 vUv;
      uniform sampler2D prevBuffer;
    `], '', `
      vec4 color = mix(texture2D(prevBuffer, vUv), vec4(0), ${amount});
      gl_FragColor = color;
    `),
    vert: new HydraVertexShader({ glslName: 'clear' }, null, null, {useCamera: camera}),
    uniforms: Object.assign({
      prevBuffer: { value: null }
    }, this.uniforms),
  };
  const shaderPass = new HydraMaterialPass(passOptions);
  shaderPass.needsSwap = false;
  return shaderPass;
}

Output.prototype.tick = function () {
  for (let i=0; i<this.controls.length; i++) {
    this.controls[i].update();
  }
  this.render();
}

Output.prototype.render = function() {
  if (this.layers && this.layers.length > 0) {
    layers.render(this.layers);
  }
  this.composer.render();
}

Output.prototype.renderTexture = function(options = {}) {
  options = Object.assign({
    render: true,
    reset: true,
    disposePrev: true,
  }, options);
  const {render, reset, disposePrev, ...fboOptions} = options;
  const renderTarget = this.createFbo(fboOptions);
  const texComposer = new EffectComposer(this.synth.renderer, renderTarget);
  texComposer.renderToScreen = false;
  for (let i=0; i<this.composer.passes.length; i++) {
    texComposer.addPass(this.composer.passes[i]);
  }
  texComposer.render();
  if (render) {
    this.render();
  }
  if (reset) {
    this.reset();
  }
  if (disposePrev && this.texComposer) {
    this.texComposer.dispose();
    this.texComposer = texComposer;
  }
  return texComposer.readBuffer.texture;
}

export default Output
