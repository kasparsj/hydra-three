import * as THREE from "three";
import {GridGeometry} from "../lib/GridGeometry.js";
import vectorizeText from "vectorize-text";

window.GridGeometry = GridGeometry;

const box = (width = 1, height = 1, depth = 1, widthSegments = 1, heightSegments = 1, depthSegments = 1) => new THREE.BoxGeometry(width, height, depth, widthSegments, heightSegments, depthSegments);
const capsule = (radius = 1, length = 1, capSegments = 4, radialSegments = 8) => new THREE.CapsuleGeometry(radius, length, capSegments, radialSegments);
const circle = (radius = 1, segments = 32, thetaStart = 0, thetaLength = Math.PI * 2) => new THREE.CircleGeometry(radius, segments, thetaStart, thetaLength);
const cone = (radius = 1, height = 1, radialSegments = 32, heightSegments = 1, openEnded = false, thetaStart = 0, thetaLength = Math.PI * 2) => new THREE.ConeGeometry(radius, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength);
const cylinder = (radiusTop = 1, radiusBottom = 1, height = 1, radialSegments = 32, heightSegments = 1, openEnded = false, thetaStart = 0, thetaLength = Math.PI * 2) => new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength);
const dodecahedron = (...args) => new THREE.DodecahedronGeometry(...args);
const edges = (...args) => new THREE.EdgesGeometry(...args);
const extrude = (...args) => new THREE.ExtrudeGeometry(...args);
const icosahedron = (...args) => new THREE.IcosahedronGeometry(...args);
const lathe = (...args) => new THREE.LatheGeometry(...args);
const octahedron = (...args) => new THREE.OctahedronGeometry(...args);
const plane = (...args) => new THREE.PlaneGeometry(...args);
const polyhedron = (vertices = [], indices = [], radius = 1, detail = 0) => new THREE.PolyhedronGeometry(vertices, indices, radius, detail);
const ring = (...args) => new THREE.RingGeometry(...args);
const shape = (...args) => new THREE.ShapeGeometry(...args);
const sphere = (...args) => new THREE.SphereGeometry(...args);
const tetrahedron = (...args) => new THREE.TetrahedronGeometry(...args);
const torus = (...args) => new THREE.TorusGeometry(...args);
const torusKnot = (...args) => new THREE.TorusKnotGeometry(...args);
const tube = (path, ...args) => {
    if (Array.isArray(path)) {
        path = new THREE.CatmullRomCurve3(path);
    }
    return new THREE.TubeGeometry(path, ...args);
}
const wireframe = (...args) => new THREE.WireframeGeometry(...args);

const points = (num) => {
    const arr = Float32Array.from({length: num*3}, (v, k) => k);
    const attribute = new THREE.Float32BufferAttribute(arr, 3);
    const geom = new THREE.BufferGeometry();
    // todo: maybe use a different attribute?
    geom.setAttribute('position', attribute);
    return geom;
}

const line = (points) => new THREE.BufferGeometry().setFromPoints(points);

const grid = (...args) => new GridGeometry(...args);

const text = (text, options = {}) => {
    options = Object.assign({
        textAlign: 'center',
        textBaseline: 'middle',
        // font: 'arial',
        // triangles: true, // todo: make it work
    }, options);
    const info = vectorizeText(text, options);
    const geom = new THREE.BufferGeometry();
    // todo: add support vectorizeText?
    //   attributes.position = []; // todo: should be Float32Array
    //   geometry.positions.map((v, k) => attributes.position.push(v[0], v[1], 0));
    //   elements = geometry.edges ? geometry.edges : geometry.cells;
    //   primitive = geometry.edges ? 'lines' : 'triangles';
    return geom;
}

export {
    box, capsule, circle, cone, cylinder, dodecahedron, edges, extrude,
    icosahedron, lathe, octahedron, plane, polyhedron, ring, shape, sphere,
    tetrahedron, torus, torusKnot, tube, wireframe, points, line, grid, text,
};