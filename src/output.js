import * as THREE from "three";
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { ClearPass } from "three/examples/jsm/postprocessing/ClearPass.js";
import {HydraUniform} from "./three/HydraUniform.js";
import { HydraMaterialPass, HydraRenderPass, HydraFadePass } from "./three/HydraPass.js";
import {cameraMixin, autoClearMixin} from "./lib/mixins.js";
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

Output.prototype = {
  get pixelRatio() {
    return this._pixelRatio || this.synth.renderer.getPixelRatio();
  },
  set pixelRatio(value) {
    if (this.pixelRatio !== value) {
      this._pixelRatio = value;
      this.initFbos();
    }
  }
};

Object.assign(Output.prototype, cameraMixin, autoClearMixin);

Output.prototype.init = function () {
  this.composer = new EffectComposer(this.synth.renderer);
  this.composer.renderToScreen = false;

  this.uniforms = {
    time: HydraUniform.get('time', 'hydra'),
    resolution: HydraUniform.get('resolution', 'hydra'),
  }

  this.initTempFbos(this.composer.renderTarget2);
  this.camera();
  this.stop();

  return this
}

Output.prototype.createFbo = function(options = {}) {
  const renderer = this.synth.renderer;
  const size = renderer.getSize( new THREE.Vector2() );
  options = Object.assign({
    width: size.width * this.pixelRatio,
    height: size.height * this.pixelRatio,
  }, options);
  return tx.fbo(options);
}

Output.prototype.initFbos = function(renderTarget) {
  if (!renderTarget.isRenderTarget) {
    const options = renderTarget;
    if (options.pixelRatio) {
      this._pixelRatio = options.pixelRatio;
    }
    renderTarget = this.createFbo(options);
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

Output.prototype.stop = function() {
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

Output.prototype._set = function (passes, {cssRenderer = false}) {
  this.stop();
  if (passes.length > 0) {
    // todo: output level clear and fade are not working properly
    if (this._autoClear && this._autoClear.amount > 0) {
      if (this._autoClear.amount >= 1) {
        this.composer.addPass(new ClearPass());
      }
      else {
        this.composer.addPass(new HydraFadePass(this._autoClear, this.uniforms));
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
      if (options.autoClear && options.autoClear.amount > 0) {
        if (options.autoClear.amount >= 1) {
          pass.clear = true;
        }
        else {
          this.composer.addPass(new HydraFadePass(options.autoClear, this.uniforms));
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
  this.cssRenderer = typeof cssRenderer === 'string'
      ? {'2d': 'css2DRenderer', 'css2drenderer': 'css2DRenderer', '3d': 'css3DRenderer', 'css3drenderer': 'css3DRenderer'}[cssRenderer.toLowerCase()]
      : null;
}

Output.prototype.clearNow = function() {
  const clear = new ClearPass();
  clear.render(this.composer.renderer, this.composer.writeBuffer, this.composer.readBuffer);
  clear.render(this.composer.renderer, this.composer.readBuffer, this.composer.writeBuffer);
  return this;
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
  if (this.cssRenderer && this.synth[this.cssRenderer]) {
    for (let i=0; i<this.composer.passes.length; i++) {
      if (this.composer.passes[i].scene && this.composer.passes[i].camera) {
        this.synth[this.cssRenderer].render(this.composer.passes[i].scene, this.composer.passes[i].camera);
      }
    }
  }
}

Output.prototype.renderTexture = function(options = {}) {
  options = Object.assign({
    render: true,
    stop: true,
    disposePrev: true,
  }, options);
  const {render, stop, disposePrev, ...fboOptions} = options;
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
  if (stop) {
    this.stop();
  }
  if (disposePrev && this.texComposer) {
    this.texComposer.dispose();
    this.texComposer = texComposer;
  }
  return texComposer.readBuffer.texture;
}

export default Output
