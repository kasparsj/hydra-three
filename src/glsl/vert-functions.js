import glsl from 'glslify'
import {GridGeometry} from "./geometries/GridGeometry.js";
import vectorizeText from "vectorize-text";

const pointsVert = glsl("./shaders/points.vert");
const linesVert = glsl("./shaders/lines.vert");
const linestripVert = glsl("./shaders/linestrip.vert");
const lineloopVert = glsl("./shaders/lineloop.vert");

const dotsFrag = glsl("./shaders/dots.frag");
const squaresFrag = glsl("./shaders/squares.frag");
const linesFrag = glsl("./shaders/lines.frag");
const linestripFrag = glsl("./shaders/linestrip.frag");
const lineloopFrag = glsl("./shaders/lineloop.frag");

// todo: respect makeGlobal?
Object.assign(window, {GridGeometry, vectorizeText});

export default (hy) => [
    {
        name: 'dots',
        type: 'vert',
        inputs: [
            {name: 'pos', type: 'vec3', default: hy.gradient()},
            {name: 'size', type: 'float', default: 10},
            {name: 'color', type: 'vec4', default: 1},
            {name: 'fade', type: 'float', default: 0.025},
        ],
        glsl: dotsFrag,
        vert: pointsVert,
        primitive: 'points',
        blendMode: true,
        geometry: GridGeometry,
    },
    {
        name: 'squares',
        type: 'vert',
        inputs: [
            {name: 'pos', type: 'vec3', default: hy.gradient()},
            {name: 'size', type: 'float', default: 10},
            {name: 'color', type: 'vec4', default: 1},
            {name: 'fade', type: 'float', default: 0.025},
        ],
        glsl: squaresFrag,
        vert: pointsVert,
        primitive: 'points',
        blendMode: true,
        geometry: GridGeometry,
    },
    {
        name: 'lines',
        type: 'vert',
        inputs: [
            {name: 'pos', type: 'vec3', default: hy.gradient()},
            {name: 'color', type: 'vec4', default: 1},
        ],
        glsl: linesFrag,
        vert: linesVert,
        primitive: 'lines',
        geometry: GridGeometry,
    },
    {
        name: 'linestrip',
        type: 'vert',
        inputs: [
            {name: 'pos', type: 'vec3', default: hy.solid(hy.noise(1).x, hy.noise(2).y, hy.noise(3).z).map(-1,1,0,1)},
            {name: 'color', type: 'vec4', default: 1},
        ],
        glsl: linestripFrag,
        vert: linestripVert,
        primitive: 'line strip',
        geometry: GridGeometry,
    },
    {
        name: 'lineloop',
        type: 'vert',
        inputs: [
            {name: 'pos', type: 'vec3', default: hy.solid(hy.noise(1).x, hy.noise(2).y, hy.noise(3).z).map(-1,1,0,1)},
            {name: 'color', type: 'vec4', default: 1},
        ],
        glsl: lineloopFrag,
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
