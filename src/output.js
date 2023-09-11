import * as mat4 from "gl-mat4";
import GlslSource from "./glsl-source.js";

var Output = function (index, synth) {
  this.id = index;
  this.synth = synth;
  this.width = synth.width
  this.height = synth.height
  this.regl = synth.regl
  this.precision = synth.precision
  this.label = `o${index}`
  this.positionBuffer = this.regl.buffer([
    [-2, 0],
    [0, -2],
    [2, 2]
  ])

  this.draw = []
  this.init()
  this.pingPongIndex = 0

  // for each output, create two fbos for pingponging
  this.fbos = (Array(2)).fill().map(() => this._initFbo())

  // for each output, create two temp buffers
  this.temp = (Array(2)).fill().map(() => this._initFbo())
}

Output.prototype._initFbo = function() {
  return this.regl.framebuffer({
    color: this.regl.texture({
      mag: 'nearest',
      width: this.width,
      height: this.height,
      format: 'rgba'
    }),
    depthStencil: false
  })
}

Output.prototype.resize = function(width, height) {
  this.width = width;
  this.height = height;
  this.fbos.forEach((fbo) => {
    fbo.resize(width, height)
  })
  this.temp.forEach((tmp) => {
    tmp.resize(width, height)
  })
}


Output.prototype.getCurrent = function () {
  return this.fbos[this.pingPongIndex]
}

Output.prototype.getTexture = function () {
   var index = this.pingPongIndex ? 0 : 1
  return this.fbos[index]
}

Output.prototype.init = function () {
  this.attributes = {
    position: this.positionBuffer
  }
  this.uniforms = {
    time: this.regl.prop('time'),
    resolution: this.regl.prop('resolution'),
  }

  this.initCamera();

  return this
}

Output.prototype.initCamera = function() {
  this._camera = this.regl({
    context: {
      projection: mat4.identity([]),
      view: mat4.identity([]),
    },
    uniforms: {
      view: this.regl.context('view'),
      projection: this.regl.context('projection')
    }
  });
}

Output.prototype.camera = function(eye, target, options = {}) {
  options = Object.assign({
    fovy: Math.PI / 4,
    near: 0.1,
    far: 1000.0,
  }, options);
  this.eye = eye;
  this.target = target;
  if (eye && target) {
    this._camera = this.regl({
      context: {
        projection: function (context) {
          if (options.type === 'perspective') {
            return mat4.perspective([],
                options.fovy,
                options.aspect || (context.viewportWidth / context.viewportHeight),
                options.near,
                options.far)
          }
          else {
            return mat4.ortho([], -1.0, 1.0, -1.0, 1.0, options.near, options.far);
          }
        },
        view: function (context, props) {
          return mat4.lookAt([],
              props.eye,
              props.target,
              [0, 1, 0])
        },
        eye: this.regl.prop('eye'),
      },
      uniforms: {
        view: this.regl.context('view'),
        projection: this.regl.context('projection'),
      }
    });
  }
  else {
    this.initCamera();
  }
  return this;
}

Output.prototype.perspective = function(eye, target, options = {}) {
  options = Object.assign({type: 'perspective'}, options);
  return this.camera(eye, target, options);
}

Output.prototype.ortho = function(eye, target, options = {}) {
  options = Object.assign({type: 'ortho'}, options);
  return this.camera(eye, target, options);
}

Output.prototype.render = function (passes) {
  const self = this
  self.draw = [];
  for (let i=0; i<passes.length; i++) {
    let pass = passes[i]
    if (pass.clear) {
      switch (pass.clear) {
        case 'clear':
          self.draw.push(...this.clear(false));
          break;
        case 'fade': {
          const opt = typeof(pass.userArgs[0]) === 'object' ? pass.userArgs[0] : {amount: pass.userArgs[0]};
          opt.now = false;
          self.draw.push(this.fade(opt));
          break;
        }
        default:
          console.warn(`unrecognized clear: ${pass.clear}(${pass.userArgs.join(", ")})`);
          break;
      }
      continue;
    }

    const {attributes, elements} = this.getAttributes(pass.primitive, pass.userArgs[0]);
    const primitive = pass.primitive || 'triangles';
    const uniforms = this.getUniforms(pass.uniforms);
    const blend = this.getBlend(pass.blendMode);
    const draw = self.regl({
      frag: pass.frag,
      vert: pass.vert,
      viewport: typeof(pass.viewport.x) !== 'undefined' ? {
        x: pass.viewport.x * this.fbos[0].width,
        y: pass.viewport.y * this.fbos[0].height,
        width: pass.viewport.w * this.fbos[0].width,
        height: pass.viewport.h * this.fbos[0].height,
      } : {},
      // depth: {
      //   enable: false,
      // },
      attributes,
      primitive,
      uniforms,
      count: typeof(elements) === 'number' ? elements : elements.length,
      elements: typeof(elements) === 'number' ? null : elements,
      blend,
      lineWidth: pass.lineWidth,
      framebuffer: pass.framebuffer || (() => {
        self.pingPongIndex = self.pingPongIndex ? 0 : 1
        return self.fbos[self.pingPongIndex]
      }),
    })
    self.draw.push(draw)
  }
}

Output.prototype.clear = function(now = true) {
  const result = [this.fbos[this.pingPongIndex ? 0 : 1], this.temp[0], this.temp[1]].map((fbo) => {
    const clear = () => this.regl.clear({
      color: [0, 0, 0, 0],
      // next framebuffer
      framebuffer: fbo,
    });
    if (now) clear();
    else return clear;
  });
  if (now) return this;
  return result;
}

Output.prototype.fade = function(options) {
  let amount = options;
  let camera = false;
  let now = true;
  if (typeof(options) === 'object') {
    ({amount, camera} = options);
    now = typeof(options.now) === 'undefined' ? true : options.now;
  }
  const self = this;
  // todo: do we need to fade also temp buffers?
  const fade = self.regl({
    frag: `
          precision ${self.precision} float;
          varying vec2 uv;
          uniform sampler2D prevBuffer;
          void main() {
            vec4 color = mix(texture2D(prevBuffer, uv), vec4(0), ${amount});
            gl_FragColor = color;
          }
        `,
    vert: GlslSource.compileVert(this.precision, camera, { name: 'clear' }),
    attributes: self.attributes,
    primitive: 'triangles',
    uniforms: Object.assign({}, {
      prevBuffer: () =>  { return self.fbos[self.pingPongIndex] },
    }, this.uniforms),
    count: 3,
    // next framebuffer
    framebuffer: () => {
      return self.fbos[self.pingPongIndex ? 0 : 1]
    }
  });
  if (now) return this;
  return fade;
}

Output.prototype.getAttributes = function(primitive, num) {
  let elements = 3;
  let attributes = this.attributes;
  switch (primitive) {
    case 'points': {
      // todo: userArgs need to be merged with defaults
      let points = num;
      if (!Array.isArray(points)) points = [points, points];
      elements = 2 * points[0] * points[1];
      attributes = {
        position: Float32Array.from({length: elements * 2}, (v, k) => {
          return k % 2 ? ((Math.floor((k-1) / 2 / points[0])+0.5) / points[1]) : ((k+1) / 2 % points[0] / points[0]);
        }),
      };
      break;
    }
    case 'line strip': {
      // todo: userArgs need to be merged with defaults
      let points = num;
      if (!Array.isArray(points)) points = [points, 1];
      elements = points[0] * points[1];
      attributes = {
        position: Float32Array.from({length: elements * 2}, (v, k) => {
          // todo: make this an argument
          let closed = true;
          // todo: will be NaN when points[0] == 1
          return k % 2 ? Math.floor((k-1) / 2 / points[0]) : (k / 2 % points[0] / (points[0]-closed));
        }),
      };
      break;
    }
    case 'line loop': {
      // todo: userArgs need to be merged with defaults
      let points = num;
      if (!Array.isArray(points)) points = [points, 1];
      elements = points[0] * points[1];
      attributes = {
        position: Float32Array.from({length: elements * 2}, (v, k) => {
          return k % 2 ? Math.floor((k-1) / 2 / points[0]) : (k / 2 % points[0] / points[0]);
        }),
      };
      break;
    }
    case 'lines': {
      // todo: userArgs need to be merged with defaults
      let lines = num;
      if (!Array.isArray(lines)) lines = [lines, 0];
      elements = 4 * (lines[0] + lines[1]);
      attributes = {
        position: Float32Array.from({length: elements * 2}, (v, k) => {
          if (k < (lines[0] * 4)) {
            switch (k%4) {
              case 0:
                return ((k+2) / 4 % lines[0] / lines[0]);
              case 2:
                return ((k) / 4 % lines[0] / lines[0]);
              case 1:
                return 0.0001;
              case 3:
                return 0.9999;
            }
          }
          else {
            switch (k%4) {
              case 0:
                return 0.0001;
              case 2:
                return 0.9999;
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
    case 'triangles': {
      // todo: userArgs need to be merged with defaults
      let triangles = num;
      if (!Array.isArray(triangles)) triangles = [triangles, triangles];
      elements = 6 * (triangles[0] * triangles[1]);
      const position = [];
      elements = [];
      for (let row = 0; row <= triangles[1]; row++) {
        for (let col = 0; col <= triangles[0]; col++) {
          const x = col / triangles[0];
          const y = row / triangles[1];
          position.push(x, y);
          if (row < triangles[1] && col < triangles[0]) {
            const topLeft = row * (triangles[0]+1) + col;
            const topRight = topLeft + 1;
            const bottomLeft = (row + 1) * (triangles[0]+1) + col;
            const bottomRight = bottomLeft + 1;
            elements.push(topLeft, topRight, bottomLeft);
            elements.push(topRight, bottomRight, bottomLeft);
          }
        }
      }
      attributes = { position: Float32Array.from(position) };
      break;
    }
  }
  return {attributes, elements};
}

Output.prototype.getUniforms = function(uniforms) {
  const self = this;
  uniforms = Object.assign(uniforms, { prevBuffer:  () =>  {
    // todo: changed, originally:
    // return self.fbos[self.pingPongIndex]
    return self.fbos[self.pingPongIndex ? 0 : 1]
    }
  })
  return Object.keys(uniforms).reduce((acc, key) => {
    acc[key] = typeof(uniforms[key]) === 'string' ? parseFloat(uniforms[key]) : uniforms[key];
    return acc;
  }, {});
}

Output.prototype.getBlend = function(blendMode) {
  let func;
  switch (blendMode) {
    case 'custom':
      func = {
        srcRGB: 'custom',  // Define your custom blending function here
        dstRGB: 'custom',
        srcAlpha: 'custom',
        dstAlpha: 'custom',
      };
      break;
    case 'overlay':
      func = {
        srcRGB: 'dst color',
        dstRGB: 'one minus src color',
        srcAlpha: 'dst alpha',
        dstAlpha: 'one minus src alpha',
      };
      break;
    case 'screen':
      func = {
        srcRGB: 'one minus dst color',
        dstRGB: 'one',
        srcAlpha: 'one minus dst alpha',
        dstAlpha: 'one',
      };
      break;
    case 'multiply':
      func = {
        srcRGB: 'dst color',
        dstRGB: 'zero',
        srcAlpha: 'dst alpha',
        dstAlpha: 'zero',
      };
      break;
    case 'add':
      func = {
        srcRGB: 'one',
        dstRGB: 'one',
        srcAlpha: 'one',
        dstAlpha: 'one',
      };
      break;
    case 'alpha':
    default:
      func = {
        srcRGB: 'src alpha',
        srcAlpha: 1,
        dstRGB: 'one minus src alpha',
        dstAlpha: 1
      };
      break;
  }
  return {
    enable: blendMode ? (typeof(blendMode) === 'string' ? blendMode !== 'disabled' : blendMode) : false,
    func,
  };
}

Output.prototype.tick = function (props) {
  const doDraw = () => this.draw.map((fn) => fn(props));
  this._camera({
    eye: this.eye,
    target: this.target,
  }, function() {
    doDraw();
  });
}

Output.prototype.renderTexture = function() {
  this.synth._renderOut(this.id);
  const colorTex = this.fbos[this.pingPongIndex].color;
  this.fbos[this.pingPongIndex] = this._initFbo();
  return colorTex;
}

export default Output
