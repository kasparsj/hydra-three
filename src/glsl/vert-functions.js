import glsl from 'glslify'
import {GridGeometry} from "./geometries/GridGeometry.js";
import * as THREE from "three/src/geometries/Geometries.js";
import vectorizeText from "vectorize-text";

const pointsVert = glsl("./shaders/vert/points.vert");
const linesVert = glsl("./shaders/vert/lines.vert");
const linestripVert = glsl("./shaders/vert/linestrip.vert");
const lineloopVert = glsl("./shaders/vert/lineloop.vert");

const pdotsFrag = glsl("./shaders/pdots.frag");
const psquaresFrag = glsl("./shaders/psquares.frag");
const plinesFrag = glsl("./shaders/plines.frag");
const plinestripFrag = glsl("./shaders/plinestrip.frag");
const plineloopFrag = glsl("./shaders/plineloop.frag");
const planeVert = glsl("./shaders/plane.vert");
const phongFrag = glsl("./shaders/phong.frag");
const lambertFrag = glsl("./shaders/lambert.frag");

// todo: respect makeGlobal?
Object.assign(window, {GridGeometry, vectorizeText});
Object.assign(window, THREE);

export default (hy) => [
    {
        name: 'pdots',
        type: 'vert',
        inputs: [
            {name: 'pos', type: 'vec3', default: hy.gradient()},
            {name: 'size', type: 'float', default: 10},
            {name: 'color', type: 'vec4', default: 1},
            {name: 'fade', type: 'float', default: 0.025},
        ],
        glsl: pdotsFrag,
        vert: pointsVert,
        primitive: 'points',
        blendMode: true,
        geometry: GridGeometry,
    },
    {
        name: 'psquares',
        type: 'vert',
        inputs: [
            {name: 'pos', type: 'vec3', default: hy.gradient()},
            {name: 'size', type: 'float', default: 1},
            {name: 'color', type: 'vec4', default: 1},
            {name: 'fade', type: 'float', default: 0.025},
        ],
        glsl: psquaresFrag,
        vert: pointsVert,
        primitive: 'points',
        blendMode: true,
        geometry: GridGeometry,
    },
    {
        name: 'plines',
        type: 'vert',
        inputs: [
            {name: 'pos', type: 'vec3', default: hy.gradient()},
            {name: 'color', type: 'vec4', default: 1},
        ],
        glsl: plinesFrag,
        vert: linesVert,
        primitive: 'lines',
        geometry: GridGeometry,
    },
    {
        name: 'plinestrip',
        type: 'vert',
        inputs: [
            {name: 'pos', type: 'vec3', default: hy.solid(hy.noise(1).x, hy.noise(2).y, hy.noise(3).z).map(-1,1,0,1)},
            {name: 'color', type: 'vec4', default: 1},
        ],
        glsl: plinestripFrag,
        vert: linestripVert,
        primitive: 'line strip',
        geometry: GridGeometry,
    },
    {
        name: 'plineloop',
        type: 'vert',
        inputs: [
            {name: 'pos', type: 'vec3', default: hy.solid(hy.noise(1).x, hy.noise(2).y, hy.noise(3).z).map(-1,1,0,1)},
            {name: 'color', type: 'vec4', default: 1},
        ],
        glsl: plineloopFrag,
        vert: lineloopVert,
        primitive: 'line loop',
        geometry: GridGeometry,
    },
    {
        name: 'plane',
        type: 'vert',
        inputs: [
            {name: 'pos', type: 'vec3', default: hy.gradient()},
            {name: 'color', type: 'vec4', default: 1},
        ],
        glsl: `return color;`,
        vert: planeVert,
        primitive: 'triangles',
        geometry: THREE.PlaneGeometry,
    },
    {
        name: 'box',
        type: 'vert',
        inputs: [
            {name: 'color', type: 'vec4', default: 1},
        ],
        glsl: `return color;`,
        primitive: 'triangles',
        geometry: THREE.BoxGeometry,
    },
    {
        name: 'sphere',
        type: 'vert',
        inputs: [
            {name: 'color', type: 'vec4', default: 1},
        ],
        glsl: `return color;`,
        primitive: 'triangles',
        geometry: THREE.SphereGeometry,
    },
    {
        name: 'cylinder',
        type: 'vert',
        inputs: [
            {name: 'color', type: 'vec4', default: 1},
        ],
        glsl: `return color;`,
        primitive: 'triangles',
        geometry: THREE.CylinderGeometry,
    },
    {
        name: 'cone',
        type: 'vert',
        inputs: [
            {name: 'color', type: 'vec4', default: 1},
        ],
        glsl: `return color;`,
        primitive: 'triangles',
        geometry: THREE.ConeGeometry,
    },
    {
        name: 'edges',
        type: 'vert',
        inputs: [
            {name: 'color', type: 'vec4', default: 1},
        ],
        glsl: `return color;`,
        primitive: 'lines',
        geometry: THREE.EdgesGeometry,
    },
    {
        name: 'text',
        type: 'vert',
        inputs: [
            {name: 'color', type: 'vec4', default: 1},
        ],
        glsl: `return color;`,
        geometry: vectorizeText,
        useUV: false,
        useNormal: false,
    },
    // lighting related functions
    {
        name: 'lambert',
        type: 'color',
        inputs: [
            {name: 'intensity', type: 'float', default: 1},
            {name: 'lightDirection', type: 'vec3', default: [1.0, 1.0, -1.0]},
        ],
        glsl: lambertFrag,
    },
    {
        name: 'phong',
        type: 'color',
        inputs: [
            {name: 'shininess', type: 'float', default: 4},
            {name: 'lightDirection', type: 'vec3', default: [1.0, 1.0, -1.0]},
            {name: 'lightColor', type: 'vec3', default: [1.0, 1.0, 1.0]},
            {name: 'ambientColor', type: 'vec3', default: [0.1, 0.1, 0.1]},
            {name: 'specularColor', type: 'vec3', default: [1.0, 1.0, 1.0]},
        ],
        glsl: phongFrag,
    },
    {
        name: 'normal',
        type: 'src',
        glsl: `return vec4(vnormal, 1.0);`,
    },
];
