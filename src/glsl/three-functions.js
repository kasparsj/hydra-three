import * as THREE from "three";
import glsl from "glslify";

const planeVert = glsl("./shaders/plane.vert");

// todo: respect makeGlobal?
[THREE.PlaneGeometry, THREE.BoxGeometry, THREE.SphereGeometry, THREE.CylinderGeometry, THREE.ConeGeometry, THREE.EdgesGeometry].map((cl) => {
    window[cl.name] = cl;
});

export default (hy) => [
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
    }
]
