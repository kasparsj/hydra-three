import formatArguments from './format-arguments.js'
import {typeLookup, getLookup} from "./types.js";

// converts a tree of javascript functions to a shader
export default function(transforms) {
    var shaderParams = {
      uniforms: [], // list of uniforms used in shader
      glslFunctions: [], // list of functions used in shader
      fragColor: '',
      position: '',
    }

    var gen = generateGlsl(transforms, shaderParams, typeLookup['src'].returnType)('st')
    shaderParams.fragColor = gen
    shaderParams.position = generateGlsl(transforms.filter((tr) => {
      return tr.transform.type !== 'combine';
    }), shaderParams, typeLookup['src'].returnType)('st')
    // remove uniforms with duplicate names
    let uniforms = {}
    shaderParams.uniforms.forEach((uniform) => uniforms[uniform.name] = uniform)
    shaderParams.uniforms = Object.values(uniforms)
    return shaderParams
}

// recursive function for generating shader string from object containing functions and user arguments. Order of functions in string depends on type of function
// to do: improve variable names
function generateGlsl (transforms, shaderParams, returnType) {
  // transform function that outputs a shader string corresponding to gl_FragColor
  var fragColor = () => ''
  // var uniforms = []
  // var glslFunctions = []
  transforms.map((transform, i) => {
    var nextTransform = transforms[i+1];
    var expectedReturn = nextTransform ? typeLookup[nextTransform.transform.type].returnType : returnType

    var inputs = formatArguments(transform, shaderParams.uniforms.length)
    inputs.forEach((input) => {
      if(input.isUniform) shaderParams.uniforms.push(input)
    })

    // add new glsl function to running list of functions
    if(!contains(transform, shaderParams.glslFunctions)) shaderParams.glslFunctions.push(transform)

    // current function for generating frag color shader code
    var f0 = fragColor
    if (transform.transform.type === 'src') {
      fragColor = (uv) => `${shaderString(uv, transform, inputs, shaderParams, expectedReturn)}`
    } else if (transform.transform.type === 'coord') {
      fragColor = (uv) => f0() ?
        `${f0(`${shaderString(uv, transform, inputs, shaderParams, 'vec2')}`)}` :
        `${shaderString(uv, transform, inputs, shaderParams, expectedReturn)}`
    } else if (transform.transform.type === 'color') {
      fragColor = (uv) =>  `${shaderString(`${f0(uv)}`, transform, inputs, shaderParams, expectedReturn)}`
    } else if (transform.transform.type === 'combine') {
      // combining two generated shader strings (i.e. for blend, mult, add funtions)
      var f1 = inputs[0].value && inputs[0].value.transforms ?
      (uv) => `${generateGlsl(inputs[0].value.transforms, shaderParams, 'vec4')(uv)}` :
      (inputs[0].isUniform ? () => inputs[0].name : () => inputs[0].value)
      fragColor = (uv) => `${shaderString(`${f0(uv)}, ${f1(uv)}`, transform, inputs.slice(1), shaderParams, expectedReturn)}`
    } else if (transform.transform.type === 'combineCoord') {
      // combining two generated shader strings (i.e. for modulate functions)
      var f1 = inputs[0].value && inputs[0].value.transforms ?
      (uv) => `${generateGlsl(inputs[0].value.transforms, shaderParams, expectedReturn)(uv)}` :
      (inputs[0].isUniform ? () => inputs[0].name : () => inputs[0].value)
      fragColor = (uv) => `${f0(`${shaderString(`${uv}, ${f1(uv)}`, transform, inputs.slice(1), shaderParams, 'vec2')}`)}`


    }
  })
//  console.log(fragColor)
  //  break;
  return fragColor
}

// assembles a shader string containing the arguments and the function name, i.e. 'osc(uv, frequency)'
function shaderString (uv, transform, inputs, shaderParams, returnType) {
  const str = inputs.map((input) => {
    if (input.isUniform) {
      return input.name
    } else if (input.value && input.value.transforms) {
      // this by definition needs to be a generator, hence we start with 'st' as the initial value for generating the glsl fragment
      let getter = input.value.getter;
      if (!getter && typeLookup[input.value.transforms[0].transform.type] !== input.type) {
        getter = getLookup[input.type];
      }
      return `${generateGlsl(input.value.transforms, shaderParams, input.type)('st')}` + (getter ? '.' + getter : '')
    }
    return input.value
  }).reduce((p, c) => `${p}, ${c}`, '')

  var func = `${transform.transform.glslName}(${uv}${str})`
  if (typeLookup[transform.transform.type].returnType.substring(3) < (returnType === 'float' ? 1 : returnType.substring(3))) {
    var diff = returnType.substring(3) - typeLookup[transform.transform.type].returnType.substring(3);
    func = `vec${returnType.substring(3)}(${func}${', 0.0'.repeat(diff)})`;
  }
  return func;
}

// merge two arrays and remove duplicates
function mergeArrays (a, b) {
  return a.concat(b.filter(function (item) {
    return a.indexOf(item) < 0;
  }))
}

// check whether array
function contains(object, arr) {
  for(var i = 0; i < arr.length; i++){
    if(object.name == arr[i].name) return true
  }
  return false
}



