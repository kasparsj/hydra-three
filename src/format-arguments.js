import arrayUtils from './lib/array-utils.js'
import {getLookup} from "./types.js";
import Output from "./output.js";
import Source from "./hydra-source.js";

// [WIP] how to treat different dimensions (?)
const DEFAULT_CONVERSIONS = {
  float: {
    'vec4': { name: 'sum', args: [[1, 1, 1, 1]] },
    'vec2': { name: 'sum', args: [[1, 1]] }
  }
}

function fillArrayWithDefaults(arr, len) {
  // fill the array with default values if it's too short
  while (arr.length < len) {
    if (arr.length === 3) { // push a 1 as the default for .a in vec4
      arr.push(1.0)
    } else {
      arr.push(0.0)
    }
  }
  return arr.slice(0, len)
}

const ensure_decimal_dot = (val) => {
  val = val.toString()
  if (val.indexOf('.') < 0) {
    val += '.'
  }
  return val
}



function formatArguments(transform, startIndex) {
  const defaultArgs = transform.transform.inputs
  const userArgs = transform.userArgs
  const { generators } = transform.synth
  const { src } = generators // depends on synth having src() function
  return defaultArgs.map((input, index) => {
    const typedArg = {
      value: typeof input.default === 'function' ? input.default() : input.default,
      type: input.type,
      isUniform: !!input.isUniform,
      name: input.name,
      vecLen: 0
      //  generateGlsl: null // function for creating glsl
    }

    if (typedArg.type === 'float') typedArg.value = ensure_decimal_dot(typedArg.value)
    if (input.type.startsWith('vec')) {
      try {
        typedArg.vecLen = Number.parseInt(input.type.substr(3))
      } catch (e) {
        console.log(`Error determining length of vector input type ${input.type} (${input.name})`)
      }
    }

    // if user has input something for this argument
    if (userArgs.length > index && typeof userArgs[index] !== 'undefined') {
      typedArg.value = userArgs[index];
      if (typeof typedArg.value === 'function') {
        typedArg.value = getFunctionValue(typedArg.value, input);
        typedArg.isUniform = true
      } else if (typedArg.value.constructor === Array) { // todo: maybe check for undefined
        typedArg.value = getArrayValue(typedArg.value, input, typedArg.vecLen)
        typedArg.isUniform = true
        // }
      }
    }

    if (startIndex < 0) {
    } else {
      if (typedArg.value && typedArg.value.transforms && typedArg.value.transforms.length > 0) {
        const final_transform = typedArg.value.transforms[typedArg.value.transforms.length - 1]

        if (final_transform.transform.glsl_return_type !== input.type) {
          const defaults = DEFAULT_CONVERSIONS[input.type]
          if (typeof defaults !== 'undefined') {
            const default_def = defaults[final_transform.transform.glsl_return_type]
            if (typeof default_def !== 'undefined') {
              const { name, args } = default_def
              typedArg.value = typedArg.value[name](...args)
            }
          }
        }

        typedArg.isUniform = false
      } else if (typedArg.type === 'float' && typeof typedArg.value === 'number') {
        typedArg.value = ensure_decimal_dot(typedArg.value)
      } else if (typedArg.type.startsWith('vec') && typeof typedArg.value !== 'function' && !typedArg.value.isTexture && !typedArg.value.isRenderTarget && !(typedArg.value instanceof Output) && !(typedArg.value instanceof Source)) {
        typedArg.isUniform = false
        if (Array.isArray(typedArg.value) || typedArg.value instanceof Float32Array || typedArg.value instanceof Uint8Array) {
          // todo: accept smaller arrays?
          typedArg.value = `${typedArg.type}(${typedArg.value.map(ensure_decimal_dot).join(', ')})`
        }
        else if (typeof typedArg.value === 'number') {
          const length = parseInt(typedArg.type.substr(-1));
          const arr = Array(length).fill(typedArg.value);
          typedArg.value = `${typedArg.type}(${arr.map(ensure_decimal_dot).join(', ')})`
        }
        else if (typedArg.value.isVector2 || typedArg.value.isVector3 || typedArg.value.isVector4) {
          typedArg.isUniform = true
        }
      } else if (input.type === 'sampler2D' || input.type === 'sampler2DArray') {
        // typedArg.tex = typedArg.value
        var x = typedArg.value
        typedArg.value = x.isRenderTarget ? x.texture : x
        typedArg.isUniform = true
      } else {
        // if passing in a texture reference, when function asks for vec4, convert to vec4
        if (typedArg.value instanceof Output || typedArg.value instanceof Source || typedArg.value.isTexture || typedArg.value.isRenderTarget) {
          var x1 = typedArg.value.isRenderTarget ? typedArg.value.texture : typedArg.value
          if (input.type === 'vec4') {
            typedArg.value = src(x1)
          }
          else {
            let getter = getLookup[input.type];
            typedArg.value = src(x1)[getter];
          }
          typedArg.isUniform = false
        }
      }

      // add tp uniform array if is a function that will pass in a different value on each render frame,
      // or a texture/ external source

      if (input.isUniform) typedArg.isUniform = input.isUniform;
      if (typedArg.isUniform) {
        typedArg.name += startIndex
        //  shaderParams.uniforms.push(typedArg)
      }
    }
    return typedArg
  })
}

function getFunctionValue(value, input) {
  // if (typedArg.vecLen > 0) { // expected input is a vector, not a scalar
  //    typedArg.value = (context, props, batchId) => (fillArrayWithDefaults(userArgs[index](props), typedArg.vecLen))
  // } else {
  return (context, props, batchId) => {
    try {
      const val = value(props)
      if(typeof val === 'number') {
        return val
      } else {
        console.warn('function does not return a number', value)
      }
      return input.default
    } catch (e) {
      console.warn('ERROR', e)
      return input.default
    }
  }
  //  }
}

function getArrayValue(value, input, vecLen = 0) {
  //   if (typedArg.vecLen > 0) { // expected input is a vector, not a scalar
  //     typedArg.isUniform = true
  //     typedArg.value = fillArrayWithDefaults(typedArg.value, typedArg.vecLen)
  //  } else {
  //  console.log("is Array")
  // filter out values that are not a number
  // const filteredArray = userArgs[index].filter((val) => typeof val === 'number')
  // typedArg.value = (context, props, batchId) => arrayUtils.getValue(filteredArray)(props)
  if (vecLen) {
    return (context, props, batchId) => {
      const values = Array(vecLen);
      for (let i=0; i<vecLen; i++) {
        const v = value[i];
        const defaultValue = input.default ? input.default.constructor === Array ? input.default[i] : input.default : 0;
        if (typeof v === 'function') {
          values[i] = getFunctionValue(v, {default: defaultValue})(context, props, batchId);
        } else if (Array.isArray(v)) {
          values[i] = arrayUtils.getValue(v)(props)
        }
        else if (typeof v !== 'undefined') {
          values[i] = v;
        }
        else {
          values[i] = defaultValue;
        }
      }
      return values;
    }
  }
  else {
    return (context, props, batchId) => arrayUtils.getValue(value)(props)
  }
}

export { ensure_decimal_dot, formatArguments }