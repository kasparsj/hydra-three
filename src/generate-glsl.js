import {formatArguments} from './format-arguments.js'
import {typeLookup, getLookup, getTypeLookup, castType, replaceGenType} from "./types.js";
import GlslSource from "./glsl-source.js";
import {HydraScene} from "./three/scene.js";

// converts a tree of javascript functions to a shader
export default function(source) {
  return generateParams(createParams(), source, source.transforms)
}

function createParams(options = {}) {
  return Object.assign({
    // todo: make it object, so that duplicates are filtered out
    uniforms: [], // list of uniforms used in shader
    glslFunctions: [], // list of functions used in shader
    fragColor: '',
    position: '',
  }, options)
}

function generateParams(shaderParams, source, transforms) {
  if (!shaderParams.fragColor) {
    shaderParams.fragColor = generateGlsl(source, transforms, shaderParams)('st', 'vec4', 1.0)
  }
  if (!shaderParams.position && !shaderParams.combine) {
    shaderParams.position = generateGlsl(source, transforms.filter((tr) => {
      return tr.transform.type !== 'combine';
    }), shaderParams)('st', 'vec4', 1.0) // todo: should be vec3
  }
  // remove uniforms with duplicate names
  if (shaderParams.uniforms) {
    let uniforms = {}
    shaderParams.uniforms.forEach((uniform) => uniforms[uniform.name] = uniform)
    shaderParams.uniforms = Object.values(uniforms)
  }
  return shaderParams
}

// recursive function for generating shader string from object containing functions and user arguments. Order of functions in string depends on type of function
// to do: improve variable names
function generateGlsl (source, transforms, shaderParams) {
  // transform function that outputs a shader string corresponding to gl_FragColor
  const empty = () => '';
  var fragColor = empty
  transforms.map((transform, i) => {
    if (transform.transform.type === 'genType') {
      transform.transform = replaceGenType(transform.transform, i ? 'color' : 'coord');
    }
    if (transform.transform.type === 'glsl') {
      fragColor = () => transform.userArgs[0];
      return;
    }
    var inputs = transform._cachedInputs;
    if (!inputs) {
      inputs = formatArguments(transform, shaderParams.uniforms.length);
    }
    transform._cachedInputs = inputs;
    inputs.forEach((input) => {
      if(input.isUniform) shaderParams.uniforms.push(input)
    })

    // add new glsl function to running list of functions
    if(!contains(transform, shaderParams.glslFunctions)) shaderParams.glslFunctions.push(transform)

    // current function for generating frag color shader code
    var f0 = fragColor
    if (transform.transform.type === 'src' || transform.transform.type === 'vert') {
      fragColor = (uv, returnType, alpha) => `${shaderString(uv, transform, inputs, shaderParams, returnType, alpha)}`
    } else if (transform.transform.type === 'coord') {
      fragColor = f0 === empty
        ? (uv, returnType, alpha) => `${shaderString(uv, transform, inputs, shaderParams, returnType, alpha)}`
        : (uv, returnType, alpha) => `${f0(`${shaderString(uv, transform, inputs, shaderParams, 'vec2')}`, returnType, alpha)}`
    } else if (transform.transform.type === 'color') {
      fragColor = (uv, returnType, alpha) =>  `${shaderString(`${f0(uv, 'vec4')}`, transform, inputs, shaderParams, returnType, alpha)}`
    } else if (transform.transform.type === 'combine') {
      // combining two generated shader strings (i.e. for blend, mult, add funtions)
      const sourceVert = source instanceof GlslSource && (source.transforms[0].transform.vert || source.transforms[0].transform.type === 'vert') || source instanceof HydraScene;
      const input0Vert = inputs[0].value instanceof GlslSource && (inputs[0].value.transforms[0].transform.vert || inputs[0].value.transforms[0].transform.type === 'vert') || inputs[0].value instanceof HydraScene;
      if (sourceVert || input0Vert) {
        const params = Object.assign({}, shaderParams, {
          fragColor: fragColor('st', 'vec4', 1.0) || 'vec4(0)',
        });
        Object.assign(shaderParams, createParams({
          glslFunctions: [transform],
          combine: true,
        }));
        const trans = source.transforms.slice(0, source.transforms.indexOf(transform));
        source.passes.unshift(source.createPass(generateParams(params, source, trans), {renderTarget: source.output.temp0}));
        const temp0 = src(source.output.temp0.texture);
        f0 = (uv, returnType, alpha) => `${generateGlsl(temp0, temp0.transforms, shaderParams)(uv, returnType, alpha)}`
      }
      var f1;
      if (typeof inputs[0].value.compile === 'function') {
        if (input0Vert || sourceVert) {
          inputs[0].value.output = source.output;
          source.passes.unshift(...inputs[0].value.compile({renderTarget: source.output.temp1}));
          const temp1 = src(source.output.temp1.texture);
          f1 = (uv, returnType, alpha) => `${generateGlsl(temp1, temp1.transforms, shaderParams)(uv, returnType, alpha)}`
        }
        else {
          f1 = (uv, returnType, alpha) => `${generateGlsl(inputs[0].value, inputs[0].value.transforms, shaderParams)(uv, returnType, alpha)}`
        }
      }
      else {
        f1 = (inputs[0].isUniform ? () => inputs[0].name : () => inputs[0].value)
      }
      fragColor = (uv, returnType, alpha) => `${shaderString(`${f0(uv, 'vec4')}, ${f1(uv, 'vec4')}`, transform, inputs.slice(1), shaderParams, returnType, alpha)}`
    } else if (transform.transform.type === 'combineCoord') {
      // combining two generated shader strings (i.e. for modulate functions)
      var f1 = inputs[0].value && inputs[0].value.transforms
          ? (uv, returnType, alpha) => `${generateGlsl(inputs[0].value, inputs[0].value.transforms, shaderParams)(uv, returnType, alpha)}`
          : (inputs[0].isUniform ? () => inputs[0].name : () => inputs[0].value)
      fragColor = (uv, returnType, alpha) => `${f0(`${shaderString(`${uv}, ${f1(uv, 'vec4')}`, transform, inputs.slice(1), shaderParams, 'vec2')}`, returnType, alpha)}`
    }
    else {
      console.warn('no support for type: ' + transform.transform.type)
    }
  })
  if (source.getter) {
    var f2 = fragColor
    fragColor = (uv, returnType, alpha) => castType(f2(uv, returnType, alpha) + `.${source.getter}`, getTypeLookup[source.getter], returnType, 1.0)
  }
  return fragColor
}

// assembles a shader string containing the arguments and the function name, i.e. 'osc(uv, frequency)'
function shaderString (uv, transform, inputs, shaderParams, returnType, alpha = 0.0) {
  const str = inputs.map((input) => {
    if (input.isUniform) {
      return input.name
    } else if (input.value && input.value.transforms) {
      // this by definition needs to be a generator, hence we start with 'st' as the initial value for generating the glsl fragment
      if (!input.value.getter && typeLookup[input.value.transforms[0].transform.type] !== input.type) {
        // todo: add getter only if input.type is larger
        input.value.getter = getLookup[input.type];
      }
      return `${generateGlsl(input.value, input.value.transforms, shaderParams)('st', input.type)}`
    }
    return input.value
  }).reduce((p, c) => `${p}, ${c}`, '')

  var func = `${transform.transform.glslName}(${uv}${str})`
  return castType(func, typeLookup[transform.transform.type].returnType, returnType, alpha);
}

// check whether array
function contains(object, arr) {
  for(var i = 0; i < arr.length; i++){
    if(object.name == arr[i].name) return true
  }
  return false
}



