import formatArguments from './format-arguments.js'

// Add extra functionality to Array.prototype for generating sequences in time
import arrayUtils from './lib/array-utils.js'



// converts a tree of javascript functions to a shader
export default function (transforms) {
    var shaderParams = {
      uniforms: [], // list of uniforms used in shader
      glslFunctions: [], // list of functions used in shader
      fragColor: ''
    }

    var gen = generateGlsl(transforms, shaderParams)('c', 'st')
    // console.log(gen)

    shaderParams.fragColor = gen
    // remove uniforms with duplicate names
    let uniforms = {}
    shaderParams.uniforms.forEach((uniform) => uniforms[uniform.name] = uniform)
    shaderParams.uniforms = Object.values(uniforms)
    return shaderParams
}

function generateGlsl (transforms, shaderParams) {
  var generator = (c, uv) => ''

  transforms.forEach((transform,i) => {
    // Accumulate uniforms to lazily add them to the output shader
    let inputs = formatArguments(transform, shaderParams.uniforms.length)
    inputs.forEach((input) => {
      if (input.isUniform) shaderParams.uniforms.push(input)
    })

    // Lazily generate glsl function definition
    if(!contains(transform, shaderParams.glslFunctions)) shaderParams.glslFunctions.push(transform)

    var prev = generator

    if (transform.transform.type === 'src') {
      generator = (c, uv) =>
         `vec4 ${c} = ${shaderString(uv, transform.name, inputs, shaderParams)};`
    } else if (transform.transform.type === 'color') {
      generator = (c, uv) =>
         `${prev(c,uv)}
          ${c} = ${shaderString(`${c}`, transform.name, inputs, shaderParams)};`
    } else if (transform.transform.type === 'coord') {
      generator = (c, uv) =>
         `${uv} = ${shaderString(`${uv}`, transform.name, inputs, shaderParams)};
          ${prev(c, uv)}`
    } else if (transform.transform.type === 'combine') {
      generator = (c,uv) => {
        // combining two generated shader strings (i.e. for blend, mult, add funtions)
        let f1 = inputs[0].value && inputs[0].value.transforms ?
          (c, uv) => generateGlsl(inputs[0].value.transforms, shaderParams)(c, uv) :
          (inputs[0].isUniform ? () => inputs[0].name : () => inputs[0].value)

        let c1 = `${c}_${i}`
        let uv1 = `${uv}_${i}`;

        return `vec2 ${uv1} = ${uv};
          ${prev(c,uv)}
          // ${transform.name} inputs:
          ${f1(c1, uv1)}
          ${c} = ${shaderString(`${c}, ${c1}`, transform.name, inputs.slice(1), shaderParams)};`
      }
    } else if (transform.transform.type === 'combineCoord') {
      // combining two generated shader strings (i.e. for modulate functions)
      generator = (c,uv) => {
        let f1 = inputs[0].value && inputs[0].value.transforms ?
          (c, uv) => generateGlsl(inputs[0].value.transforms, shaderParams)(c, uv) :
          (inputs[0].isUniform ? () => inputs[0].name : () => inputs[0].value)

        let c1 = `${c}_m${i}`
        let uv1 = `${uv}_${i}`

        return `vec2 ${uv1} = ${uv};
          // ${transform.name} inputs:
          ${f1(c1,uv1)}
          ${uv} = ${shaderString(`${uv}, ${c1}`, transform.name, inputs.slice(1), shaderParams)};
          ${prev(c,uv)}`
      }
    }
  })

  return generator
}

// assembles a shader string containing the arguments and the function name, i.e. 'osc(uv, frequency)'
function shaderString (uv, method, inputs, shaderParams) {
  const str = inputs.map((input) => {
    if (input.isUniform) {
      return input.name
    } else if (input.value && input.value.transforms) {
      // this by definition needs to be a generator, hence we start with 'st' as the initial value for generating the glsl fragment
      return `${generateGlsl(input.value.transforms, shaderParams)('st')}`
    }
    return input.value
  }).reduce((p, c) => `${p}, ${c}`, '')

  return `${method}(${uv}${str})`
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



