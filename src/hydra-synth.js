
import Output from './output.js'
import loop from 'raf-loop'
import Source from './hydra-source.js'
import MouseTools from './lib/mouse.js'
import Audio from './lib/audio.js'
import VidRecorder from './lib/video-recorder.js'
import ArrayUtils from './lib/array-utils.js'
import { loadScript as loadExternalScript } from './lib/load-script.js'
// import strudel from './lib/strudel.js'
import Sandbox from './eval-sandbox.js'
import {GeneratorFactory} from './generator-factory.js'
import * as THREE from "three";
import {HydraUniform} from "./three/HydraUniform.js"
import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer.js";
import {ShaderPass} from "three/examples/jsm/postprocessing/ShaderPass.js";
import * as tx from "./three/tx.js";
import * as gm from "./three/gm.js";
import * as mt from "./three/mt.js";
import * as scene from "./three/scene.js";
import * as cmp from "./three/cmp.js";
import * as rnd from "./three/rnd.js";
import * as nse from "./three/noise.js";
import * as math from "./three/math.js";
import * as arr from "./three/arr.js";
import * as gui from "./gui.js";
import * as el from "./el.js";
import * as threeGlobals from "./three/globals.js";
import {
  bindRuntimeModule,
  clearRuntime,
  setRuntime,
  withRuntime,
} from "./three/runtime.js";
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { initCanvas } from "./canvas.js";

const Mouse = MouseTools()
const MISSING_HELPER_GLOBAL = Symbol('hydra-missing-helper-global')
const helperGlobalBindings = new Map()

const installHelperGlobal = (key, owner, value) => {
  if (typeof window === 'undefined') {
    return
  }
  let state = helperGlobalBindings.get(key)
  if (!state) {
    const hasOwn = Object.prototype.hasOwnProperty.call(window, key)
    state = {
      base: hasOwn ? window[key] : MISSING_HELPER_GLOBAL,
      owners: [],
    }
    helperGlobalBindings.set(key, state)
  }
  state.owners.push({ owner, value })
  window[key] = value
}

const restoreHelperGlobal = (key, owner) => {
  if (typeof window === 'undefined') {
    return
  }
  const state = helperGlobalBindings.get(key)
  if (!state) {
    return
  }
  state.owners = state.owners.filter((entry) => entry.owner !== owner)
  if (state.owners.length > 0) {
    window[key] = state.owners[state.owners.length - 1].value
    return
  }
  if (state.base === MISSING_HELPER_GLOBAL) {
    delete window[key]
  } else {
    window[key] = state.base
  }
  helperGlobalBindings.delete(key)
}
// to do: add ability to pass in certain uniforms and transforms
class HydraRenderer {

  constructor ({
    pb = null,
    width = 1280,
    height = 720,
    numSources = 4,
    numOutputs = 4,
    makeGlobal = true,
    autoLoop = true,
    detectAudio = true,
    enableStreamCapture = true,
    webgl = 2,
    canvas,
    css2DElement,
    css3DElement,
    precision,
    extendTransforms = {} // add your own functions on init
  } = {}) {

    ArrayUtils.init()

    this.pb = pb

    this.width = width
    this.height = height
    this.renderAll = false
    this.detectAudio = detectAudio
    this.makeGlobal = makeGlobal
    this._disposed = false
    this._loop = null
    this._globalHelpersInstalled = false

    this.canvas = initCanvas(canvas, this);
    this.width = this.canvas.width
    this.height = this.canvas.height

    //global.window.test = 'hi'
    // object that contains all properties that will be made available on the global context and during local evaluation
    this.synth = {
      time: 0,
      bpm: 30,
      canvas: this.canvas,
      width: this.width,
      height: this.height,
      fps: undefined,
      stats: {
        fps: 0
      },
      speed: 1,
      mouse: Mouse,
      render: this._render.bind(this),
      setResolution: this.setResolution.bind(this),
      update: (dt) => {},// user defined update function
      click: (event) => {},
      mousedown: (event) => {},
      mouseup: (event) => {},
      mousemove: (event) => {},
      keydown: (event) => {},
      keyup: (event) => {},
      afterUpdate: (dt) => {},// user defined function run after update
      hush: this.hush.bind(this),
      tick: this.tick.bind(this),
      shadowMap: this.shadowMap.bind(this),
      scene: this.scene.bind(this),
      ortho: (...args) => this.output.ortho.apply(this.output, args),
      perspective: (...args) => this.output.perspective.apply(this.output, args),
      screenCoords: (w, h) => this.output.screenCoords(w, h),
      normalizedCoords: () => this.output.normalizedCoords(),
      cartesianCoords: (w, h) => this.output.cartesianCoords(w, h),
    }

    nse.init();
    Object.assign(Math, math);

    this.modules = {
      tx: bindRuntimeModule(tx, this),
      gm: bindRuntimeModule(gm, this),
      mt: bindRuntimeModule(mt, this),
      cmp: bindRuntimeModule(cmp, this),
      rnd: bindRuntimeModule(rnd, this),
      nse: bindRuntimeModule(nse, this),
      gui: bindRuntimeModule(gui, this),
      arr: bindRuntimeModule(arr, this),
      el: bindRuntimeModule(el, this),
    }
    this.synth.tx = this.modules.tx
    this.synth.gm = this.modules.gm
    this.synth.mt = this.modules.mt
    this.synth.cmp = this.modules.cmp
    this.synth.rnd = this.modules.rnd
    this.synth.nse = this.modules.nse
    this.synth.gui = this.modules.gui
    this.synth.arr = this.modules.arr
    this.synth.el = this.modules.el

    if (makeGlobal) {
      this._installGlobalHelpers()
    }


    this.timeSinceLastUpdate = 0
    this._time = 0 // for internal use, only to use for deciding when to render frames

    // only allow valid precision options
    let precisionOptions = ['lowp','mediump','highp']
    if(precision && precisionOptions.includes(precision.toLowerCase())) {
      this.precision = precision.toLowerCase()
      //
      // if(!precisionValid){
      //   console.warn('[hydra-synth warning]\nConstructor was provided an invalid floating point precision value of "' + precision + '". Using default value of "mediump" instead.')
      // }
    } else {
      let isIOS =
    (/iPad|iPhone|iPod/.test(navigator.platform) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) &&
    !window.MSStream;
      this.precision = isIOS ? 'highp' : 'mediump'
    }



    this.extendTransforms = extendTransforms

    // boolean to store when to save screenshot
    this.saveFrame = false

    // if stream capture is enabled, this object contains the capture stream
    this.captureStream = null

    this.generator = undefined

    this._initThree(webgl, css2DElement, css3DElement);
    this._initOutputs(numOutputs)
    this._initSources(numSources)
    this._generateGlslTransforms()
    setRuntime(this, { active: true })

    this.synth.screencap = () => {
      this.saveFrame = true
    }

    if (enableStreamCapture) {
      try {
        this.captureStream = this.canvas.captureStream(25)
        // to do: enable capture stream of specific sources and outputs
        this.synth.vidRecorder = new VidRecorder(this.captureStream)
      } catch (e) {
        console.warn('[hydra-synth warning]\nnew MediaSource() is not currently supported on iOS.')
        console.error(e)
      }
    }

    if(detectAudio) this._initAudio()

    if(autoLoop) {
      this._loop = loop(this.tick.bind(this))
      this._loop.start()
    }

    // final argument is properties that the user can set, all others are treated as read-only
    this.sandbox = new Sandbox(this.synth, makeGlobal, ['speed', 'update', 'afterUpdate', 'click', 'mousedown', 'mouseup', 'mousemove', 'keydown', 'keyup', 'bpm', 'fps'])
  }

  eval(code) {
    this.sandbox.eval(code)
  }

  getScreenImage(callback) {
    this.imageCallback = callback
    this.saveFrame = true
  }

  hush() {
    this.s.forEach((source) => {
      source.clear()
    })
    this.o.forEach((output) => {
      this.synth.solid(0, 0, 0, 0).out(output)
    })
    this.synth.render(this.o[0])
    this.sandbox.set('update', (dt) => {})
    this.sandbox.set('click', (event) => {})
    this.sandbox.set('mousedown', (event) => {})
    this.sandbox.set('mouseup', (event) => {})
    this.sandbox.set('mousemove', (event) => {})
    this.sandbox.set('keydown', (event) => {})
    this.sandbox.set('keyup', (event) => {})
    this.sandbox.set('afterUpdate', (dt) => {})
  }

  loadScript(url = "", once = true) {
   const browserWindow = typeof window !== 'undefined' ? window : null
   const scope = this && browserWindow && this !== browserWindow ? this : browserWindow
   return loadExternalScript(url, once, scope).then(() => {
     console.log(`loaded script ${url}`)
   })
 }

  _installGlobalHelpers() {
    if (this._globalHelpersInstalled || typeof window === 'undefined') {
      return
    }
    const loadScriptHelper = (url = "", once = true) =>
      loadExternalScript(url, once, window).then(() => {
        console.log(`loaded script ${url}`)
      })
    const getCodeHelper = () => {
      const urlParams = new URLSearchParams(window.location.search)
      console.log(decodeURIComponent(urlParams.get('code')))
    }
    installHelperGlobal('loadScript', this, loadScriptHelper)
    installHelperGlobal('getCode', this, getCodeHelper)
    this._globalHelpersInstalled = true
  }

  _restoreGlobalHelpers() {
    if (!this._globalHelpersInstalled || typeof window === 'undefined') {
      return
    }
    restoreHelperGlobal('loadScript', this)
    restoreHelperGlobal('getCode', this)
    this._globalHelpersInstalled = false
  }

  setResolution(width, height) {
    console.log("setResolution", width, height)
    this.canvas.width = width
    this.canvas.height = height
    this.width = width // is this necessary?
    this.height = height // ?
    this.sandbox.set('width', width)
    this.sandbox.set('height', height)
    this.o.forEach((output) => {
      output.resize(width, height)
    })
    this.s.forEach((source) => {
      source.resize(width, height)
    })
    this.css2DRenderer.setSize(width, height)
    this.css3DRenderer.setSize(width, height)
  }

  canvasToImage (callback) {
    const a = document.createElement('a')
    a.style.display = 'none'

    let d = new Date()
    a.download = `hydra-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}-${d.getHours()}.${d.getMinutes()}.${d.getSeconds()}.png`
    document.body.appendChild(a)
    var self = this
    this.canvas.toBlob( (blob) => {
        if(self.imageCallback){
          self.imageCallback(blob)
          delete self.imageCallback
        } else {
          a.href = URL.createObjectURL(blob)
          console.log(a.href)
          a.click()
        }
    }, 'image/png')
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(a.href);
    }, 300);
  }

  _initAudio () {
    const that = this
    this.synth.a = new Audio({
      numBins: 4,
      parentEl: this.canvas.parentNode
      // changeListener: ({audio}) => {
      //   that.a = audio.bins.map((_, index) =>
      //     (scale = 1, offset = 0) => () => (audio.fft[index] * scale + offset)
      //   )
      //
      //   if (that.makeGlobal) {
      //     that.a.forEach((a, index) => {
      //       const aname = `a${index}`
      //       window[aname] = a
      //     })
      //   }
      // }
    })
  }

  _initThree (webgl, css2DElement, css3DElement) {
    this.synth.THREE = THREE;
    Object.assign(this.synth, threeGlobals);

    const options = {
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    };

    this.renderer = webgl === 1 ? new THREE.WebGL1Renderer( options ) : new THREE.WebGLRenderer(options);
    this.renderer.clear();
    this.renderer.autoClear = false;
    this.synth.renderer = this.renderer;
    this.composer = new EffectComposer(this.renderer);

    this.css2DRenderer = new CSS2DRenderer({element:css2DElement});
    this.css2DRenderer.setSize(this.width, this.height);
    this.css2DRenderer.domElement.style.position = 'absolute';
    this.css2DRenderer.domElement.style.top = '0px';
    this.css2DRenderer.domElement.style.pointerEvents = 'none';
    document.body.appendChild( this.css2DRenderer.domElement );
    this.synth.css2DRenderer = this.css2DRenderer;

    this.css3DRenderer = new CSS3DRenderer({element:css3DElement});
    this.css3DRenderer.setSize(this.width, this.height);
    this.css3DRenderer.domElement.style.position = 'absolute';
    this.css3DRenderer.domElement.style.top = '0px';
    this.css3DRenderer.domElement.style.pointerEvents = 'none';
    document.body.appendChild( this.css3DRenderer.domElement );
    this.synth.css3DRenderer = this.css3DRenderer;

    new HydraUniform('tex', null, () => this.output.getTexture(), 'hydra');
    new HydraUniform('tex0', null, () => this.o[0].getTexture(), 'hydra');
    new HydraUniform('tex1', null, () => this.o[1].getTexture(), 'hydra');
    new HydraUniform('tex2', null, () => this.o[2].getTexture(), 'hydra');
    new HydraUniform('tex3', null, () => this.o[3].getTexture(), 'hydra');
    new HydraUniform('resolution', null, () => [this.canvas.width, this.canvas.height], 'hydra');
    new HydraUniform('time', this.synth.time, () => this.synth.time, 'hydra');
    new HydraUniform('mouse', this.synth.mouse, () => this.synth.mouse, 'hydra');
    new HydraUniform('bpm', this.synth.bpm, () => this.synth.bpm, 'hydra');

    this.renderAll = new ShaderPass(new THREE.ShaderMaterial({
      vertexShader: `
      varying vec2 vUv;
      
      void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
      `,
      fragmentShader: `
      uniform sampler2D tex0;
      uniform sampler2D tex1;
      uniform sampler2D tex2;
      uniform sampler2D tex3;
      
      varying vec2 vUv;

      void main () {
        vec2 st = vUv;
        st*= vec2(2);
        vec2 q = floor(st).xy*(vec2(2.0, 1.0));
        int quad = int(q.x) + int(q.y);
        st.x += step(1., mod(st.y,2.0));
        st.y += step(1., mod(st.x,2.0));
        st = fract(st);
        if(quad==0){
          gl_FragColor = texture2D(tex0, st);
        } else if(quad==1){
          gl_FragColor = texture2D(tex1, st);
        } else if (quad==2){
          gl_FragColor = texture2D(tex2, st);
        } else {
          gl_FragColor = texture2D(tex3, st);
        }

      }
      `,
      uniforms: {
        tex0: HydraUniform.get('tex0', 'hydra'),
        tex1: HydraUniform.get('tex1', 'hydra'),
        tex2: HydraUniform.get('tex2', 'hydra'),
        tex3: HydraUniform.get('tex3', 'hydra')
      },
      depthTest: false
    }));

    this.renderFbo = new ShaderPass(new THREE.ShaderMaterial({
      vertexShader: `
      varying vec2 vUv;
      
      void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
      `,
      fragmentShader: `
      uniform vec2 resolution;
      uniform sampler2D tex0;
      
      varying vec2 vUv;

      void main () {
          gl_FragColor = texture2D(tex0, vUv);
      }
      `,
      uniforms: {
        tex0: HydraUniform.get('tex', 'hydra'),
        resolution: HydraUniform.get('resolution', 'hydra'),
      },
      depthTest: false
    }));

    this.composer.addPass(this.renderAll);
    this.composer.addPass(this.renderFbo);
  }

  _initOutputs (numOutputs) {
    const self = this
    this.o = (Array(numOutputs)).fill().map((el, index) => {
      var o = new Output(index, this)
      self.synth['o'+index] = o
      return o
    })

    // set default output
    this.output = this.o[0]
  }

  _initSources (numSources) {
    this.s = []
    for(var i = 0; i < numSources; i++) {
      this.createSource(i)
    }
  }

  createSource (i) {
    let s = new Source({regl: this.regl, pb: this.pb, width: this.width, height: this.height, label: `s${i}`})
    this.synth['s' + this.s.length] = s
    this.s.push(s)
    return s
  }

  _generateGlslTransforms () {
    var self = this
    this.generator = new GeneratorFactory({
      defaultOutput: this.o[0],
      defaultUniforms: this.o[0].uniforms,
      extendTransforms: this.extendTransforms,
      changeListener: ({type, method, synth}) => {
          if (type === 'add') {
            self.synth[method] = synth.generators[method]
            if(self.sandbox) self.sandbox.add(method)
          } else if (type === 'remove') {
            // what to do here? dangerously deleting window methods
            //delete window[method]
          }
      //  }
      }
    })
    this.synth.setFunction = this.generator.setFunction.bind(this.generator)
  }

  _render (output) {
    if (output) {
      this.output = output
      this.isRenderingAll = false
    } else {
      this.isRenderingAll = true
    }
  }

  // dt in ms
  tick (dt, uniforms) {
    if (this._disposed) {
      return
    }
    try {
    this.sandbox.tick()
    if(this.detectAudio === true) this.synth.a.tick()
  //  let updateInterval = 1000/this.synth.fps // ms
    this.sandbox.set('time', this.synth.time += dt * 0.001 * this.synth.speed)
    this.timeSinceLastUpdate += dt
    if(!this.synth.fps || this.timeSinceLastUpdate >= 1000/this.synth.fps) {
    //  console.log(1000/this.timeSinceLastUpdate)
      this.synth.stats.fps = Math.ceil(1000/this.timeSinceLastUpdate)
      if(this.synth.update) {
        try { this.synth.update(this.timeSinceLastUpdate) } catch (e) { console.log(e) }
      }
      for (let i = 0; i < this.s.length; i++) {
        this.s[i].tick(this.synth.time)
      }
      for (let i = 0; i < this.o.length; i++) {
        this.o[i].tick()
      }
      if (this.isRenderingAll) {
        this.renderAll.enabled = true;
        this.renderFbo.enabled = false;
      } else {
        this.renderFbo.enabled = true;
        this.renderAll.enabled = false;
      }
      this.composer.render();
      if(this.synth.afterUpdate) {
        try { this.synth.afterUpdate(this.timeSinceLastUpdate) } catch (e) { console.log(e) }
      }
      this.timeSinceLastUpdate = 0
    }
    if(this.saveFrame === true) {
      this.canvasToImage()
      this.saveFrame = false
    }
  } catch(e) {
    console.warn('Error during tick():', e)
  //  this.regl.poll()
  }
  }

  dispose() {
    if (this._disposed) {
      return
    }
    this._disposed = true

    if (this._loop && typeof this._loop.stop === 'function') {
      this._loop.stop()
      this._loop = null
    }

    if (this.synth && this.synth.vidRecorder && this.synth.vidRecorder.mediaRecorder) {
      const recorder = this.synth.vidRecorder.mediaRecorder
      if (recorder.state && recorder.state !== 'inactive') {
        try {
          recorder.stop()
        } catch (_error) {}
      }
    }

    if (this.captureStream && typeof this.captureStream.getTracks === 'function') {
      this.captureStream.getTracks().forEach((track) => {
        if (track && typeof track.stop === 'function') {
          track.stop()
        }
      })
    }

    if (this.s) {
      this.s.forEach((source) => {
        if (source && typeof source.clear === 'function') {
          source.clear()
        }
      })
    }

    if (this.o) {
      this.o.forEach((output) => {
        if (output && typeof output.dispose === 'function') {
          output.dispose()
        } else if (output && typeof output.stop === 'function') {
          output.stop()
        }
      })
    }

    if (this.composer && typeof this.composer.dispose === 'function') {
      this.composer.dispose()
    }

    if (this.renderer && typeof this.renderer.dispose === 'function') {
      this.renderer.dispose()
    }

    if (
      this.css2DRenderer &&
      this.css2DRenderer.domElement &&
      this.css2DRenderer.domElement.parentNode
    ) {
      this.css2DRenderer.domElement.parentNode.removeChild(
        this.css2DRenderer.domElement
      )
    }

    if (
      this.css3DRenderer &&
      this.css3DRenderer.domElement &&
      this.css3DRenderer.domElement.parentNode
    ) {
      this.css3DRenderer.domElement.parentNode.removeChild(
        this.css3DRenderer.domElement
      )
    }

    if (this.sandbox && typeof this.sandbox.destroy === 'function') {
      this.sandbox.destroy()
    }

    this._restoreGlobalHelpers()
    scene.clearSceneRuntime(this)
    clearRuntime(this)
  }

  shadowMap(options) {
    options = options || {
      enabled: true,
      type: THREE.PCFSoftShadowMap,
    };
    Object.keys(options).forEach((prop) => {
      this.renderer.shadowMap[prop] = options[prop];
    })
  }

  // todo: scene2d and scene3d
  scene(attributes) {
    return withRuntime(this, () =>
      scene.getOrCreateScene(
        {
          runtime: this,
          defaultOutput: this.generator.defaultOutput,
          defaultUniforms: this.generator.defaultUniforms,
          utils: this.generator.utils,
        },
        attributes
      )
    )
  }

}

export default HydraRenderer
