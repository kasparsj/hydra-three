import * as THREE from "three";
import {lerp} from "./math";

let rndFn = Math.random;
const _cache = {};
const gaussPrev = {};

const setfn = (func) => {
    rndFn = func;
}

const num = (a = 0.0, b = 1.0) => {
    if (typeof(b) === 'undefined') {
        b = a;
        a = 0;
    }
    return lerp(a, b, rndFn());
}

// random integer between a and b (b is included)
// requires a < b
const int = (a, b) => {
    if (typeof(b) === 'undefined') {
        b = a;
        a = 0;
    }
    return Math.floor(num(a, b + 1));
}

// random boolean with p as percent likelihood of true
const bool = (p = 0.5) => {
    return rndFn() < p;
}

// choose a random item in an array of items
const choice = (list) => {
    return list[int(0, list.length - 1)];
}

const exp = (a, b, n = 2) => {
    return a + rndFn() ** n * (b - a);
}

const gauss = (mean, sd = 1, y1 = false, prevKey = 'gauss') => {
    let x1, x2, w;
    if (y1 === false) {
        if (gaussPrev[prevKey]) {
            y1 = gaussPrev[prevKey];
            delete gaussPrev[prevKey];
        } else {
            do {
                x1 = num(0, 2) - 1;
                x2 = num(0, 2) - 1;
                w = x1 * x1 + x2 * x2;
            } while (w >= 1);
            w = Math.sqrt(-2 * Math.log(w) / w);
            y1 = x1 * w;
            gaussPrev[prevKey] = x2 * w;
        }
    }
    const m = mean || 0;
    return y1 * sd + m;
}

const gaussMinMax = (a = 0, b = 1, y1 = false, prevKey = 'gaussMinMax') => {
    return gauss(a + ((b-a) / 2), (b-a) / 2, y1, prevKey);
}

const cache = (name, gen) => {
    if (!_cache[name]) {
        _cache[name] = (gen || rndFn)();
    }
    return _cache[name];
}

const cacheNum = (name, a = 0.0, b = 1.0) => {
    return lerp(a, b, cache(name));
}

const cacheGauss = (name, mean, sd = 1, prevKey = 'cacheGauss') => {
    return cache(name, () => {
        return gauss(mean, sd, false, prevKey);
    });
}

const cacheGaussMinMax = (name, a = 0, b = 1, prevKey = 'cacheGaussMinMax') => {
    return cache(name, () => {
        return gaussMinMax(a, b, false, prevKey);
    });
}

const cacheBool = (name, p = 0.5) => {
    return cache(name) < p;
}

const arr = (len) => {
    return Array.from({length: len}, num);
}

const color = () => {
    return new THREE.Color(num(), num(), num());
}

export { setfn, num, int, bool, choice, exp, gauss, gaussMinMax, cache, cacheNum, cacheGauss, cacheGaussMinMax, cacheBool, arr, color }