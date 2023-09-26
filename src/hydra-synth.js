
import Output from './output.js'
import loop from 'raf-loop'
import Source from './hydra-source.js'
import MouseTools from './lib/mouse.js'
import Audio from './lib/audio.js'
import VidRecorder from './lib/video-recorder.js'
import ArrayUtils from './lib/array-utils.js'
// import strudel from './lib/strudel.js'
import Sandbox from './eval-sandbox.js'
import Generator from './generator-factory.js'
import * as THREE from "three";
import HydraUniform from "./three/HydraUniform.js"
import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer";
import {ShaderPass} from "three/examples/jsm/postprocessing/ShaderPass.js";



const Mouse = MouseTools()
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
    precision,
    extendTransforms = {} // add your own functions on init
  } = {}) {

    ArrayUtils.init()

    this.pb = pb

    this.width = width
    this.height = height
    this.renderAll = false
    this.detectAudio = detectAudio

    this._initCanvas(canvas)

    //global.window.test = 'hi'
    // object that contains all properties that will be made available on the global context and during local evaluation
    this.synth = {
      time: 0,
      bpm: 30,
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
      hush: this.hush.bind(this),
      tick: this.tick.bind(this)
    }

    if (makeGlobal) {
      window.loadScript = this.loadScript
      window.getCode = () => {
        const urlParams = new URLSearchParams(window.location.search);
        console.log(decodeURIComponent(urlParams.get('code')));
      }
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

    this._initThree(webgl);
    this._initOutputs(numOutputs)
    this._initSources(numSources)
    this._generateGlslTransforms()

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

    if(autoLoop) loop(this.tick.bind(this)).start()

    // final argument is properties that the user can set, all others are treated as read-only
    this.sandbox = new Sandbox(this.synth, makeGlobal, ['speed', 'update', 'bpm', 'fps'])
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
    // this.synth.update = (dt) => {}
    this.sandbox.set('update', (dt) => {})
  }

  loadScript(url = "", once = true) {
   const self = this || window;
   const p = new Promise((res, rej) => {
     if (once) {
       self.loadedScripts || (self.loadedScripts = {});
       if (self.loadedScripts[url]) {
         res();
         return;
       }
     }
     var script = document.createElement("script");
     script.onload = function () {
       console.log(`loaded script ${url}`);
       if (once) {
         self.loadedScripts[url] = true;
       }
       res();
     };
     script.onerror = (err) => {
       console.log(`error loading script ${url}`, "log-error");
       res()
     };
     script.src = url;
     document.head.appendChild(script);
   });
   return p;
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

  // create main output canvas and add to screen
  _initCanvas (canvas) {
    if (canvas) {
      this.canvas = canvas
      this.width = canvas.width
      this.height = canvas.height
    } else {
      this.canvas = document.createElement('canvas')
      this.canvas.width = this.width
      this.canvas.height = this.height
      this.canvas.style.width = '100%'
      this.canvas.style.height = '100%'
      this.canvas.style.imageRendering = 'pixelated'
      document.body.appendChild(this.canvas)
    }
  }

  _initThree (webgl) {
    window.THREE = THREE;

    const options = {
      canvas: this.canvas,
      antialias: true,
      // alpha: true,
    };

    this.renderer = webgl === 1 ? new THREE.WebGL1Renderer( options ) : new THREE.WebGLRenderer( options);
    this.renderer.clear();
    this.renderer.autoClear = false;
    this.synth.renderer = this.renderer;
    this.composer = new EffectComposer(this.renderer);

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
        vec2 st = vec2(1.0 - vUv.x, vUv.y);
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
          gl_FragColor = texture2D(tex0, vec2(1.0 - vUv.x, vUv.y));
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
    this.generator = new Generator({
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
      HydraUniform.update();
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
      this.timeSinceLastUpdate = 0
    }
    if(this.saveFrame === true) {
      this.canvasToImage()
      this.saveFrame = false
    }
  //  this.regl.poll()
  }


}

export default HydraRenderer
