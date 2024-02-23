import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise';
import { map } from "./math";

const IMPROVED = "improved";
const PINK = "pink";
const BROWN = "brown";
const YELLOW = "yellow";

const types = {};
const options = {};
let pink, brown, yellow, improved;

const init = (opts = {}) => {
    Object.assign(options, {
        seedFn: Math.random,
        scale: 0.06,
        octaves: 6,
        lacunarity: 2.0,
        // redistribution: 1,
    }, opts);
    initFBM(options);
    initImproved(options);
    Object.assign(types, {pink, brown, yellow, improved});
    if (options.init) {
        options.init(options);
    }
}

const initFBM = () => {
    pink = {
        get2: function(x, y, scale = 1, options = {}) {
            return fbm((f) => { return improved.get2(x * scale * f, y * scale * f) }, 0, options);
        },
        get3: function(x, y, z, scale = 1, options = {}) {
            return fbm((f) => { return improved.get3(x * scale * f, y * scale * f, z * scale * f) }, 0, options);
        },
    };
    brown = {
        get2: function(x, y, scale = 1, options = {}) {
            return fbm((f) => { return improved.get2(x * scale * f, y * scale * f) }, 0.5, options);
        },
        get3: function(x, y, z, scale = 1, options = {}) {
            return fbm((f) => { return improved.get3(x * scale * f, y * scale * f, z * scale * f) }, 0.5, options);
        },
    };
    yellow = {
        get2: function(x, y, scale = 1, options = {}) {
            return fbm((f) => { return improved.get2(x * scale * f, y * scale * f) }, 1.0, options);
        },
        get3: function(x, y, z, scale = 1, options = {}) {
            return fbm((f) => { return improved.get3(x * scale * f, y * scale * f, z * scale * f) }, 1.0, options);
        },
    };
}

const initImproved = ({scale}) => {
    const improvedNoise = new ImprovedNoise();
    improved = {
        get2: function(x, y, scale2 = 1) {
            return improvedNoise.noise(x * scale * scale2, y * scale * scale2, 0);
        },
        get3: function(x, y, z, scale2 = 1) {
            return improvedNoise.noise(x * scale * scale2, y * scale * scale2, z * scale * scale2);
        },
    };
}

function get2(x, y, min = 0, max = 1, scale = 1, type = IMPROVED) {
    if (!types[type]) throw "nse.get2: invalid noise type " + type;
    if (!types[type].get2) throw "nse.get2: not supported noise type " + type;
    return map(types[type].get2(x, y, scale), -1, 1, min, max);
}

function get3(x, y, z, min = 0, max = 1, scale = 1, type = IMPROVED) {
    if (!types[type]) throw "nse.get3: invalid noise type " + type;
    if (!types[type].get3) throw "nse.get3: not supported noise type " + type;
    return map(types[type].get3(x, y, z, scale), -1, 1, min, max);
}

function get4(x, y, z, w, min = 0, max = 1, scale = 1, type = IMPROVED) {
    if (!types[type]) throw "nse.get4: invalid noise type " + type;
    if (!types[type].get4) throw "nse.get4: not supported noise type " + type;
    return map(types[type].get4(x, y, z, w, scale), -1, 1, min, max);
}

function fbm(noiseFn, H, opts = {}) {
    opts = Object.assign({}, options, opts);
    const G = Math.pow(2, -H);
    let frequency = 1.0;
    let amplitude = 1.0;
    // let max = amplitude;
    let result = 0.0;
    for (let i=0; i<opts.octaves; i++ ) {
        result += amplitude * noiseFn(frequency);
        frequency *= opts.lacunarity;
        amplitude *= G;
        // max += amplitude;
    }
    return result;
    // const redistributed = Math.pow(result, opts.redistribution);
    // return redistributed / max;
}

export {
    types, options,
    pink, brown, yellow, improved,
    init, fbm, get2, get3, get4,
    PINK, BROWN, YELLOW
};
