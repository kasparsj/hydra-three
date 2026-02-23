// based on: https://hydra-extensions.glitch.me/hydra-canvas.js

const initCanvas = (canvas, synth) => {
  const setResolution = (width, height) => synth.setResolution(width, height)

  const setResolutionWithRatio = (width, height, aspectRatio) => {
    if (aspectRatio > 1) { // horizontal
      const scaledHeight = width * (1 / aspectRatio)
      setResolution(width, scaledHeight)
    } else if (aspectRatio < 1) { // vertical
      const scaledWidth = height * aspectRatio
      setResolution(scaledWidth, height)
    } else { // square
      const size = Math.min(width, height)
      setResolution(size, size)
    }
  }

  const resizeHandler = () => {
    let ratio = 1
    if (canvas.style.width && canvas.style.width !== '100%') {
      ratio = canvas.width / parseFloat(canvas.style.width)
      canvas.setHiDPI(ratio)
    } else if (canvas.aspectRatio) {
      canvas.setHiDPI(1.0)
    } else {
      setResolution(window.innerWidth, window.innerHeight)
    }
  }

  if (!canvas) {
    // create main output canvas and add to screen
    canvas = document.createElement('canvas')
    canvas.width = synth.width
    canvas.height = synth.height
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.imageRendering = 'pixelated'
    document.body.appendChild(canvas)
  }

  canvas._hydraInputRuntime = synth
  if (!canvas._hydraInputListenersBound) {
    const forwardInput = (name) => (event) => {
      const runtime = canvas._hydraInputRuntime
      if (!runtime || runtime._disposed || !runtime.synth) {
        return
      }
      const handler = runtime.synth[name]
      if (typeof handler === 'function') {
        handler(event)
      }
    }
    canvas.addEventListener('click', forwardInput('click'))
    canvas.addEventListener('mousedown', forwardInput('mousedown'))
    canvas.addEventListener('mouseup', forwardInput('mouseup'))
    canvas.addEventListener('mousemove', forwardInput('mousemove'))
    document.addEventListener('keydown', forwardInput('keydown'))
    document.addEventListener('keyup', forwardInput('keyup'))
    canvas._hydraInputListenersBound = true
  }

  canvas.setAutoResize = function (enable = true) {
    if (enable) {
      window.addEventListener('resize', resizeHandler)
      resizeHandler()
    } else {
      window.removeEventListener('resize', resizeHandler)
    }
  }
  canvas.setLinear = function () {
    this.style.imageRendering = 'auto'
  }
  canvas.setNearest = function () {
    this.style.imageRendering = 'pixelated'
  }
  canvas.setHiDPI = function (ratio) {
    if (canvas.aspectRatio) {
      setResolutionWithRatio(window.innerWidth * ratio, window.innerHeight * ratio, canvas.aspectRatio)
    } else {
      setResolution(window.innerWidth * ratio, window.innerHeight * ratio)
    }
    const rec = 1 / ratio
    this.style.width = '' + canvas.width * rec + 'px'
    this.style.height = '' + canvas.height * rec + 'px'
  }
  canvas.setAspectRatio = function (ratio) {
    canvas.aspectRatio = ratio
    resizeHandler()
  }
  canvas.setAlign = function (align = 'right') {
    if (this.parentElement && this.parentElement.style) {
      this.parentElement.style['text-align'] = align
    }
    this.style.position = 'relative'
  }

  return canvas
}

export {initCanvas}
