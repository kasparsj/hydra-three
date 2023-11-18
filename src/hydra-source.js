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
    const onload = vid.addEventListener('loadeddata', () => {
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

  tick (time) {
    //  console.log(this.src, this.tex.width, this.tex.height)
    if (this.src !== null && this.dynamic === true) {
      if (this.src.videoWidth && this.src.videoWidth !== this.tex.width) {
        console.log(
          this.src.videoWidth,
          this.src.videoHeight,
          this.tex.width,
          this.tex.height
        )
        // todo: implement resize?
        //this.tex.resize(this.src.videoWidth, this.src.videoHeight)
      }

      if (this.src.width && this.src.width !== this.tex.width) {
        // todo: implement resize?
        //this.tex.resize(this.src.width, this.src.height)
      }

      // todo: implement resize?
      //this.tex.subimage(this.src)
    }
  }

  getTexture () {
    return this.tex
  }
}

export default HydraSource
