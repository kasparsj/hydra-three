//const transforms = require('./glsl-transforms.js')

import GlslSource from "./glsl-source.js";

var Output = function ({ regl, precision, label = "", width, height}) {
  this.regl = regl
  this.precision = precision
  this.label = label
  this.positionBuffer = this.regl.buffer([
    [-2, 0],
    [0, -2],
    [2, 2]
  ])

  this.draw = []
  this.init()
  this.pingPongIndex = 0

  // for each output, create two fbos for pingponging
  this.fbos = (Array(2)).fill().map(() => this.regl.framebuffer({
    color: this.regl.texture({
      mag: 'nearest',
      width: width,
      height: height,
      format: 'rgba'
    }),
    depthStencil: false
  }))

  // array containing render passes
//  this.passes = []
}

Output.prototype.resize = function(width, height) {
  this.fbos.forEach((fbo) => {
    fbo.resize(width, height)
  })
//  console.log(this)
}


Output.prototype.getCurrent = function () {
  return this.fbos[this.pingPongIndex]
}

Output.prototype.getTexture = function () {
   var index = this.pingPongIndex ? 0 : 1
  return this.fbos[index]
}

Output.prototype.init = function () {
//  console.log('clearing')
  this.transformIndex = 0
  this.fragHeader = `
  precision ${this.precision} float;

  uniform float time;
  varying vec2 uv;
  `

  this.fragBody = ``

  this.attributes = {
    position: this.positionBuffer
  }
  this.uniforms = {
    time: this.regl.prop('time'),
    resolution: this.regl.prop('resolution')
  }

  this.frag = `
       ${this.fragHeader}

      void main () {
        vec4 c = vec4(0, 0, 0, 0);
        vec2 st = uv;
        ${this.fragBody}
        gl_FragColor = c;
      }
  `
  return this
}


Output.prototype.render = function (passes) {
  const self = this
  self.draw = [];
  for (let i=0; i<passes.length; i++) {
    let pass = passes[i]
    if (pass.clear) {
      this.pushClear(pass.clear);
    }

    const primitive = pass.primitive || 'triangles';
    const {attributes, count} = this.getAttributes(primitive, pass.userArgs[0]);
    const uniforms = this.getUniforms(pass.uniforms);
    const blend = this.getBlend(pass.blendMode);
    const draw = self.regl({
      frag: pass.frag,
      vert: pass.vert,
      attributes,
      primitive,
      uniforms,
      count,
      blend,
      framebuffer: () => {
        self.pingPongIndex = self.pingPongIndex ? 0 : 1
        return self.fbos[self.pingPongIndex]
      }
    })
    self.draw.push(draw)
  }
}

Output.prototype.pushClear = function(clearAmount) {
  const self = this;
  if (clearAmount >= 1) {
    const clear = () => self.regl.clear({
      color: [0, 0, 0, 0],
      // next framebuffer
      framebuffer: self.fbos[self.pingPongIndex ? 0 : 1]
    });
    self.draw.push(clear);
  }
  else {
    const fade = self.regl({
      frag: `
          precision ${self.precision} float;
          varying vec2 uv;
          uniform sampler2D prevBuffer;
          void main() {
            vec4 color = mix(texture2D(prevBuffer, uv), vec4(0), ${clearAmount});
            gl_FragColor = color;
          }
        `,
      vert: GlslSource.compileVert(this.precision, { name: 'clear' }),
      attributes: self.attributes,
      primitive: 'triangles',
      uniforms: {
        prevBuffer: () =>  { return self.fbos[self.pingPongIndex] },
      },
      count: 3,
      // next framebuffer
      framebuffer: () => {
        return self.fbos[self.pingPongIndex ? 0 : 1]
      }
    });
    self.draw.push(fade);
  }
}

Output.prototype.getAttributes = function(primitive, num) {
  let count = 3;
  let attributes = this.attributes;
  switch (primitive) {
    case 'points': {
      // todo: userArgs need to be merged with defaults
      let points = num;
      if (!Array.isArray(points)) points = [points, points];
      count = 2 * points[0] * points[1];
      attributes = {
        position: Float32Array.from({length: count * 2}, (v, k) => {
          return k % 2 ? ((Math.floor((k-1) / 2 / points[0])+0.5) / points[1]) : ((k+1) / 2 % points[0] / points[0]);
        }),
      };
      break;
    }
    case 'line strip': {
      // todo: userArgs need to be merged with defaults
      let points = num;
      if (!Array.isArray(points)) points = [points, 1];
      count = points[0] * points[1];
      attributes = {
        position: Float32Array.from({length: count * 2}, (v, k) => {
          // todo: make this an argument
          let closed = true;
          return k % 2 ? Math.floor((k-1) / 2 / points[0]) : (k / 2 % points[0] / (points[0]-closed));
        }),
      };
      break;
    }
    case 'line loop': {
      // todo: userArgs need to be merged with defaults
      let points = num;
      if (!Array.isArray(points)) points = [points, 1];
      count = points[0] * points[1];
      attributes = {
        position: Float32Array.from({length: count * 2}, (v, k) => {
          return k % 2 ? Math.floor((k-1) / 2 / points[0]) : (k / 2 % points[0] / (points[0]));
        }),
      };
      break;
    }
    case 'lines': {
      // todo: userArgs need to be merged with defaults
      let lines = num;
      if (!Array.isArray(lines)) lines = [lines, 0];
      count = 4 * (lines[0] + lines[1]);
      attributes = {
        position: Float32Array.from({length: count * 2}, (v, k) => {
          if (k < (lines[0] * 4)) {
            switch (k%4) {
              case 0:
                return ((k+2) / 4 % lines[0] / lines[0]);
              case 2:
                return ((k) / 4 % lines[0] / lines[0]);
              case 1:
                return 0;
              case 3:
                return 1;
            }
          }
          else {
            switch (k%4) {
              case 0:
                return 0;
              case 2:
                return 1;
              case 1:
                return ((k+1) / 4 % lines[1] / lines[1]);
              case 3:
                return ((k-1) / 4 % lines[1] / lines[1]);
            }
          }
        }),
      };
      break;
    }
      // todo: triangles
  }
  return {attributes, count};
}

Output.prototype.getUniforms = function(uniforms) {
  const self = this;
  uniforms = Object.assign(uniforms, { prevBuffer:  () =>  {
      //var index = this.pingPongIndex ? 0 : 1
      //   var index = self.pingPong[(passIndex+1)%2]
      //  console.log('ping pong', self.pingPongIndex)
      return self.fbos[self.pingPongIndex]
    }
  })
  return Object.keys(uniforms).reduce((acc, key) => {
    acc[key] = typeof(uniforms[key]) === 'string' ? parseFloat(uniforms[key]) : uniforms[key];
    return acc;
  }, {});
}

Output.prototype.getBlend = function(blendMode) {
  // todo: implement other blendModes
  return {
    enable: typeof(blendMode) === 'boolean' ? blendMode : blendMode !== 'disabled',
    func: {
      srcRGB: 'src alpha',
      srcAlpha: 1,
      dstRGB: 'one minus src alpha',
      dstAlpha: 1
    },
  };
}

Output.prototype.tick = function (props) {
//  console.log(props)
  this.draw.map((fn) => fn(props))
}

export default Output
