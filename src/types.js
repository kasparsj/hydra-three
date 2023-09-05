const typeLookup = {
    'src': {
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
};

const castType = (func, fromType, toType, alpha = 0.0) => {
    const fromLen = fromType === 'float' ? 1 : fromType.substring(3);
    const toLen = (toType === 'float' ? 1 : toType.substring(3));
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

export { typeLookup, getLookup, getTypeLookup, castType };