import * as THREE from "three";

const color = (...args) => new THREE.Color(...args);
const vec2 = (x, y) => {
    x || (x = 0);
    if (x.isVector2) return x.clone();
    Array.isArray(x) && (y = x[1], x = x[0]);
    return new THREE.Vector2(x, typeof y === 'undefined' ? x : y);
}
const vec3 = (x, y, z) => {
    x || (x = 0);
    if (x.isVector3) return x.clone();
    Array.isArray(x) && (z = x[2], y = x[1], x = x[0]);
    return new THREE.Vector3(x, typeof y === 'undefined' ? (y = x) : y, typeof z === 'undefined' ? y : z);
}
const vec4 = (x, y, z, w) => {
    if (x.isVector4) return x.clone();
    Array.isArray(x) && (w = x[3], z = x[2], y = x[1], x = x[0]);
    return new THREE.Vector4(x, typeof y === 'undefined' ? (y = x) : y, typeof z === 'undefined' ? (z = y) : z, typeof w === 'undefined' ? z : w);
}
const box3 = (min, max) => new THREE.Box3(min, max);
const quat = (...args) => new THREE.Quaternion(...args);
const mat4 = (...args) => new THREE.Matrix4(...args);

const euler = (x = 0, y = 0, z = 0, order = THREE.Euler.DEFAULT_ORDER) => new THREE.Euler(x, y, z, order);
const sx = (x, w = window.innerWidth) => x/w * 2;
const sy = (y, h = window.innerHeight) => y/h * 2;
const xy = (x, y, w = window.innerWidth, h = window.innerHeight) => {
    if (x.isVector2) {
        y = x.y;
        x = x.x;
    }
    return vec2(-1 + x/w * 2, 1 - y/h * 2);
}
const xyz = (x, y, z, w = window.innerWidth, h = window.innerHeight) => {
    if (x.isVector3) {
        z = x.z;
        y = x.y;
        x = x.x;
    }
    return vec3(-1 + x/w * 2, 1 - y/h * 2, z);
}

export { color, vec2, vec3, vec4, box3, quat, mat4, euler, sx, sy, xy, xyz }