import formatArguments from './format-arguments.js'
import {typeLookup, getLookup, getTypeLookup, castType} from "./types.js";

// converts a tree of javascript functions to a shader
export default function(source, transforms) {
    var shaderParams = {
      uniforms: [], // list of uniforms used in shader
      glslFunctions: [], // list of functions used in shader
      fragColor: '',
      position: '',
    }

    shaderParams.fragColor = generateGlsl(source, transforms, shaderParams, typeLookup['src'].returnType)('st', 'vec4', 1.0)
    shaderParams.position = generateGlsl(source, transforms.filter((tr) => {
      return tr.transform.type !== 'combine';
    }), shaderParams, typeLookup['src'].returnType)('st', 'vec4', 1.0)
    // remove uniforms with duplicate names
    let uniforms = {}
    shaderParams.uniforms.forEach((uniform) => uniforms[uniform.name] = uniform)
    shaderParams.uniforms = Object.values(uniforms)
    return shaderParams
}

// recursive function for generating shader string from object containing functions and user arguments. Order of functions in string depends on type of function
// to do: improve variable names
function generateGlsl (source, transforms, shaderParams) {
  // transform function that outputs a shader string corresponding to gl_FragColor
  var fragColor = () => ''
  // var uniforms = []
  // var glslFunctions = []
  transforms.map((transform, i) => {
    var inputs = formatArguments(transform, shaderParams.uniforms.length)
    inputs.forEach((input) => {
      if(input.isUniform) shaderParams.uniforms.push(input)
    })

    // add new glsl function to running list of functions
    if(!contains(transform, shaderParams.glslFunctions)) shaderParams.glslFunctions.push(transform)

    // current function for generating frag color shader code
    var f0 = fragColor
    if (transform.transform.type === 'src') {
      fragColor = (uv, returnType, alpha) => `${shaderString(uv, transform, inputs, shaderParams, returnType, alpha)}`
    } else if (transform.transform.type === 'coord') {
      fragColor = f0('', 'vec2')
          ? (uv, returnType, alpha) => `${f0(`${shaderString(uv, transform, inputs, shaderParams, 'vec2')}`, returnType, alpha)}`
          : (uv, returnType, alpha) => `${shaderString(uv, transform, inputs, shaderParams, returnType, alpha)}`
    } else if (transform.transform.type === 'color') {
      fragColor = (uv, returnType, alpha) =>  `${shaderString(`${f0(uv, 'vec4')}`, transform, inputs, shaderParams, returnType, alpha)}`
    } else if (transform.transform.type === 'combine') {
      // combining two generated shader strings (i.e. for blend, mult, add funtions)
      var f1 = inputs[0].value && inputs[0].value.transforms ?
      (uv, returnType, alpha) => `${generateGlsl(inputs[0].value, inputs[0].value.transforms, shaderParams)(uv, returnType, alpha)}` :
      (inputs[0].isUniform ? () => inputs[0].name : () => inputs[0].value)
      fragColor = (uv, returnType, alpha) => `${shaderString(`${f0(uv, 'vec4')}, ${f1(uv, 'vec4')}`, transform, inputs.slice(1), shaderParams, returnType, alpha)}`
    } else if (transform.transform.type === 'combineCoord') {
      // combining two generated shader strings (i.e. for modulate functions)
      var f1 = inputs[0].value && inputs[0].value.transforms ?
      (uv, returnType, alpha) => `${generateGlsl(inputs[0].value, inputs[0].value.transforms, shaderParams)(uv, returnType, alpha)}` :
      (inputs[0].isUniform ? () => inputs[0].name : () => inputs[0].value)
      fragColor = (uv, returnType, alpha) => `${f0(`${shaderString(`${uv}, ${f1(uv, 'vec4')}`, transform, inputs.slice(1), shaderParams, 'vec2')}`, returnType, alpha)}`


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



