import glsl from 'glslify'
import {GridGeometry} from "./geometries/GridGeometry.js";
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

// todo: respect makeGlobal?
Object.assign(window, {GridGeometry, vectorizeText});

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
];
