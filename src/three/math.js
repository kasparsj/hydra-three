const lerp = (a, b, perc) => {
    return a + (b - a) * perc;
}

const map = (n, start1, stop1, start2 = 0, stop2 = 1, withinBounds = false) => {
    const newval = (n - start1) / (stop1 - start1) * (stop2 - start2) + start2;
    if (!withinBounds) {
        return newval;
    }
    if (start2 < stop2) {
        return constrain(newval, start2, stop2);
    } else {
        return constrain(newval, stop2, start2);
    }
};

const constrain = (n, low = 0, high = 1.0) => {
    return Math.max(Math.min(n, high), low);
};

const nextPow2 = (n) => {
    return Math.pow(2, Math.ceil(Math.log(n) / Math.log(2)));
}

const rad = (deg) => {
    return deg * Math.PI / 180;
}

const deg = (rad) => {
    return rad * 180 / Math.PI;
}

export { lerp, map, constrain, nextPow2, rad, deg }