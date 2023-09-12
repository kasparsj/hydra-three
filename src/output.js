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
    [-5, -1, 0],
    [-1, -5, 0],
    [3, 3, 0]
  ])
  this.uvBuffer = this.regl.buffer([
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

  this.copyPass = this.regl({
    frag: `
      precision ${this.precision} float;
      varying vec2 uv;
      uniform sampler2D tex0;

      void main () {
        gl_FragColor = texture2D(tex0, uv);
      }
      `,
    vert: `
      precision ${this.precision} float;
      attribute vec2 position;
      varying vec2 uv;

      void main () {
        uv = position;
        gl_Position = vec4(2.0 * position - 1.0, 0, 1);
      }`,
    attributes: {
      position: [
        [-2, 0],
        [0, -2],
        [2, 2]
      ]
    },
    uniforms: {
      tex0: this.regl.prop('tex0'),
    },
    count: 3,
    depth: { enable: false },
    framebuffer: () => this.getTexture(),
  })
}

Output.prototype._initFbo = function(options = {}) {
  let {color, ...fbOptions} = options;
  color = Object.assign({
    mag: 'nearest',
    width: this.width,
    height: this.height,
    format: 'rgba'
  }, color);
  fbOptions = Object.assign({
    depthStencil: false,
  }, fbOptions);
  return this.regl.framebuffer({
    color: this.regl.texture(color),
    ...fbOptions,
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
    position: this.positionBuffer,
    uv: this.uvBuffer,
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

Output.prototype.camera = function(eye, target = [0,0,0], options = {}) {
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

Output.prototype.perspective = function(eye, target = [0,0,0], options = {}) {
  options = Object.assign({type: 'perspective'}, options);
  return this.camera(eye, target, options);
}

Output.prototype.ortho = function(eye, target = [0,0,0], options = {}) {
  options = Object.assign({type: 'ortho'}, options);
  return this.camera(eye, target, options);
}

Output.prototype.render = function (passes) {
  const self = this
  // ensure both fbo's have last frame
  this.copyPass({
    tex0: this.getCurrent(),
  });
  self.draw = [];
  self.passes = passes;
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

    const {attributes, elements, primitive} = this.getAttributes(pass.primitive, pass.geometry);
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
      cull: {
        enable: !!pass.geometry,
        face: 'back'
      },
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
  const result = [this.fbos[0], this.fbos[1], this.temp[0], this.temp[1]].map((fbo) => {
    const clear = () => this.regl.clear({
      color: [0, 0, 0, 0],
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
          varying vec2 vuv;
          uniform sampler2D prevBuffer;
          void main() {
            vec4 color = mix(texture2D(prevBuffer, vuv), vec4(0), ${amount});
            gl_FragColor = color;
          }
        `,
    vert: GlslSource.compileVert(this.precision, camera, { glslName: 'clear' }),
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

Output.prototype.getAttributes = function(primitive, geometry) {
  let elements = 3;
  let attributes = this.attributes;
  if (geometry) {
    attributes = {};
    if (geometry.isBufferGeometry) {
      Object.keys(geometry.attributes).forEach((key) => attributes[key] = geometry.attributes[key].array);
      elements = geometry.index ? geometry.index.array : geometry.attributes.position.count;
      primitive || (primitive = geometry.parameters.primitive);
    }
    else if (geometry.positions && (geometry.edges || geometry.cells)) {
      attributes.position = []; // todo: should be Float32Array
      geometry.positions.map((v, k) => attributes.position.push(v[0], v[1], 0));
      elements = geometry.edges ? geometry.edges : geometry.cells;
      primitive = geometry.edges ? 'lines' : 'triangles';
    }
  }
  primitive || (primitive = 'triangles');
  return {attributes, elements, primitive};
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

Output.prototype.renderTexture = function(options = {}) {
  const next = this.pingPongIndex ? 0 : 1;
  const original = this.fbos;
  this.fbos.map(() => this._initFbo({color: options}))
  this.synth._renderOut(this.id);
  const colorTex = this.fbos[this.pingPongIndex].color;
  this.fbos = original;
  return Array.isArray(colorTex) ? colorTex[0] : colorTex;
}

export default Output
