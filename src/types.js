const typeLookup = {
    'src': {
        returnType: 'vec4',
        args: ['vec2 _st']
    },
    'vert': {
        returnType: 'vec4',
        args: ['vec2 _st']
    },
    'coord': {
        returnType: 'vec2',
        args: ['vec2 _st']
    },
    'color': {
        returnType: 'vec4',
        args: ['vec4 _c0']
    },
    'combine': {
        returnType: 'vec4',
        args: ['vec4 _c0', 'vec4 _c1']
    },
    'combineCoord': {
        returnType: 'vec2',
        args: ['vec2 _st', 'vec4 _c0']
    }
}

const getLookup = {float: 'x', vec2: 'xy', vec3: 'xyz', vec4: 'xyzw'};

const getTypeLookup = {
    x: 'float', y: 'float', z: 'float',
    xy: 'vec2', yx: 'vec2',
    xyz: 'vec3', xzy: 'vec3', yzx: 'vec3', yxz: 'vec3', zxy: 'vec3', zyx: 'vec3',
    xyzw: 'vec4',
    xxx: 'vec3',
    yyy: 'vec3',
    zzz: 'vec3',
};

const castType = (func, fromType, toType, alpha = 0.0) => {
    let fromLen = fromType.substring(3);
    let toLen = toType.substring(3);
    const nonVec = {float: 1, sampler2D: 4};
    Object.keys(nonVec).map((t) => {
        if (fromType === t) fromLen = nonVec[t];
        if (toType === t) toLen = nonVec[t];
    });
    if (fromLen < toLen) {
        let diff = toLen - fromLen;
        let last = '';
        if (toType === 'vec4') {
            diff -= 1;
            last = ', '+alpha;
        }
        func = `vec${toLen}(${func}${', 0.0'.repeat(diff)}${last})`;
    }
    return func;
}

function processGlsl(obj, returnType, args = []) {
    let baseArgs = args.map((arg) => arg).join(", ")
    let customArgs = (obj.inputs || (obj.inputs = [])).map((input) => `${input.type} ${input.name}`).join(', ')
    let allArgs = `${baseArgs}${customArgs.length > 0 ? ', '+ customArgs: ''}`

    const func = `${returnType || ''} ${obj.glslName}(${allArgs}`;
    const fixOrWrap = (glsl) => {
        if (glsl.replace(/\s+/g, " ").indexOf(func) === -1) {
            if (glsl.indexOf(`${returnType} main(${allArgs}`) > -1) {
                return glsl.replace(`${returnType} main(${allArgs}`, func);
            }
            else {
                if (obj.primitive) {
                    let primitiveFn = obj.primitive.split(" ").join("");
                    if (glsl.indexOf(primitiveFn) > -1) {
                        return glsl.replace(`${returnType} ${primitiveFn}(${allArgs}`, func);
                    }
                }
                if (returnType) {
                    return `
  ${func}) {
      ${glsl}
  }
`
                }
            }
        }
        return glsl;
    }
    obj.glsl = fixOrWrap(obj.glsl);
    if (obj.glsl300) {
        obj.glsl300 = fixOrWrap(obj.glsl300);
    }
    if (obj.vert) {
        obj.vert = fixOrWrap(obj.vert);
    }

    // add extra input to beginning for backward combatibility @todo update compiler so this is no longer necessary
    if(obj.type === 'combine' || obj.type === 'combineCoord') obj.inputs.unshift({
        name: 'color',
        type: 'vec4'
    })
    return Object.assign({}, obj, { returnType })
}

function replaceGenType(transform, toType) {
    const t = typeLookup[toType];
    let result;
    if (toType === 'coord') {
        result = Object.assign({}, transform, transform.coord, {
            type: toType,
        });
    }
    else { // color
        result = Object.assign({}, transform, {
            type: toType,
        });
    }
    return processGlsl(result, t.returnType, t.args);
}

export { typeLookup, getLookup, getTypeLookup, castType, processGlsl, replaceGenType };