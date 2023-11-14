import * as THREE from "three";
import {GridGeometry} from "../lib/GridGeometry.js";

window.GridGeometry = GridGeometry;

const box = (width = 1, height = 1, depth = 1, widthSegments = 1, heightSegments = 1, depthSegments = 1) => new THREE.BoxGeometry(width, height, depth, widthSegments, heightSegments, depthSegments);
const capsule = (radius = 1, length = 1, capSegments = 4, radialSegments = 8) => new THREE.CapsuleGeometry(radius, length, capSegments, radialSegments);
const circle = (extent = 1, segments = 32, thetaStart = 0, thetaLength = Math.PI * 2) => new THREE.CircleGeometry(extent / 2, segments, thetaStart, thetaLength);
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

const line = (points) => {
    for (let i=0; i<points.length; i++) {
        if (Array.isArray(points[i])) {
            points[i] = new THREE.Vector3(...points[i]);
        }
    }
    return new THREE.BufferGeometry().setFromPoints(points);
}

const rect = (...args) => plane(...args);

const shape = (shapes, curveSegments = 12) => {
    return new THREE.ShapeGeometry(shapes, curveSegments);
}
const drawShape = (points) => {
    const _point = (point) => {
        if (Array.isArray(point)) {
            return (new THREE.Vector2()).fromArray(point);
        }
        return point;
    }
    const shape = new THREE.Shape();
    let point = _point(points[0]);
    shape.moveTo(point.x, point.y);
    for (let i= 1; i<points.length; i++) {
        point = _point(points[i]);
        shape.lineTo(point.x, point.y);
    }
    return new THREE.ShapeGeometry(shape);
}

const ellipse = (width = 1, height = 1, curveSegments = 24, thetaStart = 0, thetaEnd = 2 * Math.PI) => {
    const shape = new THREE.Shape();
    shape.ellipse(0, 0, width / 2, height / 2, thetaStart, thetaEnd, false, 0);
    return new THREE.ShapeGeometry(shape, curveSegments);
}

const triangle = (...args) => {
    let p0 = new THREE.Vector2(-0.5, -0.5),
        p1 = new THREE.Vector2(0, 0.5),
        p2 = new THREE.Vector2(0.5, -0.5);
    if (args.length > 3) {
        const [x0, y0, x1, y1, x2, y2] = args;
        p0 = new THREE.Vector2(x0, y0);
        p1 = new THREE.Vector2(x1, y1);
        p2 = new THREE.Vector2(x2, y2);
    }
    else if (args.length) {
        [p0, p1, p2] = args;
    }
    return drawShape([p0, p1, p2]);
}

const grid = (...args) => new GridGeometry(...args);

const text = (text, options = {}) => {
    const geom = new THREE.BufferGeometry();
    // todo: implement!
    return geom;
}

const posFromEleAzi = (elevation, azimuth, radius = 1) => {
    const phi = THREE.MathUtils.degToRad( 90 - elevation );
    const theta = THREE.MathUtils.degToRad(azimuth);
    const pos = new THREE.Vector3();
    pos.setFromSphericalCoords( radius, phi, theta );
    return pos;
}

function signedArea(A, B, C) {
    return 0.5 * ((B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x));
}

export {
    box, capsule, circle, cone, cylinder, dodecahedron, edges, extrude,
    icosahedron, lathe, octahedron, plane, polyhedron, ring, sphere,
    tetrahedron, torus, torusKnot, tube, wireframe, points,
    shape, drawShape, line, rect, ellipse, triangle,
    grid, text,
    posFromEleAzi, signedArea,
};