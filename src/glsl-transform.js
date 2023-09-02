import generateGlsl from './generate-glsl.js'

var GlslTransform = function (obj) {
  this.transforms = []
  this.transforms.push(obj)
  this.synth = obj.synth
  this.type = 'GlslTransform'
  return this
}

GlslTransform.prototype.addTransform = function (obj)  {
    this.transforms.push(obj)
}

GlslTransform.prototype.glsl = function (output) {
  var passes = []
  if (this.transforms.length > 0) passes.push(generateGlsl(this.transforms, this.synth).fragColor)
  return passes
}

GlslTransform.prototype.getInfo = function () {
  var transforms = []
  this.transforms.forEach((transform) => {
    if(transform.transform.type === 'renderpass'){
      console.warn('no support for renderpass')
    } else {
      transforms.push(transform)
    }
  })
  if (transforms.length > 0) {
    var shaderInfo = generateGlsl(transforms, this.synth)
    var uniforms = {}
    shaderInfo.uniforms.forEach((uniform) => { uniforms[uniform.name] = uniform.value })
    return {
      shaderInfo,
      uniforms,
    };
  }
}

const glslProps = ['x', 'y', 'z', 'xy', 'xz', 'yx', 'yz', 'zx', 'zy', 'xyz', 'xyzw'];
glslProps.map((prop) => {
  Object.defineProperty(GlslTransform.prototype, prop, {
    get() {
      this.getter = prop;
      return this;
    }
  });
});

export default GlslTransform
