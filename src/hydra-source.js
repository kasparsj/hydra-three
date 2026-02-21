import Webcam from './lib/webcam.js'
import Screen from './lib/screenmedia.js'
import * as THREE from "three";

class HydraSource {
  constructor ({ width, height, pb, label = ""}) {
    this.label = label
    this.src = null
    this.dynamic = true
    this.width = width
    this.height = height
    this.tex = null
    this.pb = pb
  }

  init (opts, options = {}) {
    if ('src' in opts) {
      this.src = opts.src
      this.tex = new THREE.CanvasTexture(this.src, options.mapping, options.wrapS, options.wrapT, options.magFilter, options.minFilter, options.format, options.type, options.anisotropy)
    }
    if ('dynamic' in opts) this.dynamic = opts.dynamic
  }

  initCam (index, options = {}) {
    const self = this
    Webcam(index)
      .then(response => {
        self.src = response.video
        self.dynamic = true
        self.tex = new THREE.VideoTexture(self.src, options.mapping, options.wrapS, options.wrapT, options.magFilter, options.minFilter, options.format, options.type, options.anisotropy)
      })
      .catch(err => console.log('could not get camera', err))
  }

  initVideo (url = '', options = {}) {
    // const self = this
    const vid = document.createElement('video')
    vid.crossOrigin = 'anonymous'
    vid.autoplay = true
    vid.loop = true
    vid.muted = true // mute in order to load without user interaction
    vid.addEventListener('loadeddata', () => {
      this.src = vid
      vid.play()
      this.tex = new THREE.VideoTexture(this.src, options.mapping, options.wrapS, options.wrapT, options.magFilter, options.minFilter, options.format, options.type, options.anisotropy)
      this.dynamic = true
    })
    vid.src = url
  }

  initImage (url = '') {
    const loader = new THREE.TextureLoader()
    this.tex = loader.load(url);
    this.src = url
    this.dynamic = false
  }

  initStream (streamName, options = {}) {
    //  console.log("initing stream!", streamName)
    let self = this
    if (streamName && this.pb) {
      this.pb.initSource(streamName)

      this.pb.on('got video', function (nick, video) {
        if (nick === streamName) {
          self.src = video
          self.dynamic = true
          self.tex = new THREE.VideoTexture(self.src, options.mapping, options.wrapS, options.wrapT, options.magFilter, options.minFilter, options.format, options.type, options.anisotropy)
        }
      })
    }
  }

  // index only relevant in atom-hydra + desktop apps
  initScreen (index = 0, options = {}) {
    const self = this
    Screen()
      .then(function (response) {
        self.src = response.video
        self.tex = new THREE.VideoTexture(self.src, options.mapping, options.wrapS, options.wrapT, options.magFilter, options.minFilter, options.format, options.type, options.anisotropy)
        self.dynamic = true
        //  console.log("received screen input")
      })
      .catch(err => console.log('could not get screen', err))
  }

  // cache for the canvases, so we don't create them every time
  canvases = {}

  // Creates a canvas and returns the 2d context
  initCanvas (width = 1000, height = 1000) {
    if (this.canvases[this.label] == undefined) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext('2d')
      if(ctx != null)
        this.canvases[this.label] = ctx
    }

    const ctx = this.canvases[this.label]
    const canvas = ctx.canvas
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    } else {
      ctx.clearRect(0, 0, width, height)
    }
    this.init({ src: canvas })

    this.dynamic = true
    return ctx
  }

  resize (width, height) {
    this.width = width
    this.height = height
  }

  clear () {
    if (this.src && this.src.srcObject) {
      if (this.src.srcObject.getTracks) {
        this.src.srcObject.getTracks().forEach(track => track.stop())
      }
    }
    this.src = null
    if (this.tex) {
      this.tex.dispose()
    }
    this.tex = null
  }

  _sourceDimensions() {
    if (!this.src) {
      return null
    }
    const width = this.src.videoWidth || this.src.width || 0
    const height = this.src.videoHeight || this.src.height || 0
    if (!width || !height) {
      return null
    }
    return { width, height }
  }

  _syncTextureSource() {
    if (!this.tex || !this.src) {
      return
    }
    if (this.tex.image !== this.src) {
      this.tex.image = this.src
      this.tex.needsUpdate = true
    }
  }

  _updateDimensionsFromSource() {
    const dims = this._sourceDimensions()
    if (!dims) {
      return
    }
    const { width, height } = dims
    if (this.width !== width || this.height !== height) {
      this.width = width
      this.height = height
    }
  }

  tick (time) {
    if (this.src && this.dynamic === true && this.tex) {
      this._syncTextureSource()
      this._updateDimensionsFromSource()
      this.tex.needsUpdate = true
    }
  }

  getTexture () {
    return this.tex
  }
}

export default HydraSource
