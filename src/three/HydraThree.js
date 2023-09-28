import * as THREE from "three";
import {FullScreenQuad} from "three/examples/jsm/postprocessing/Pass.js";
import vectorizeText from "vectorize-text";

class HydraThree {
    static object(primitive, geometry, material, instanced) {
        // todo: add support vectorizeText?
        // if (geometry.positions && (geometry.edges || geometry.cells)) {
        //   attributes.position = []; // todo: should be Float32Array
        //   geometry.positions.map((v, k) => attributes.position.push(v[0], v[1], 0));
        //   elements = geometry.edges ? geometry.edges : geometry.cells;
        //   primitive = geometry.edges ? 'lines' : 'triangles';
        // }
        switch (primitive) {
            case 'points':
                return new THREE.Points(geometry, material);
            case 'line loop':
            case 'lineloop':
                return new THREE.LineLoop(geometry, material);
            case 'line strip':
            case 'linestrip':
                return new THREE.Line(geometry, material);
            case 'lines':
                return new THREE.LineSegments(geometry, material);
            default:
                if (instanced) {
                    return new THREE.InstancedMesh(geometry, material, instanced);
                }
                else {
                    const quad = new FullScreenQuad(material);
                    if (geometry) {
                        quad._mesh.geometry.dispose();
                        quad._mesh.geometry = geometry;
                    }
                    return quad._mesh;
                }
        }
    }

    static geometry(transform, input) {
        const isGeometry = (v) => (v.isBufferGeometry || (v.positions && v.edges));
        const isClass = (v) => typeof v === 'function' && /^\s*class\s+/.test(v.toString());
        if (!input) input = [];
        if (!isGeometry(input)) {
            if (!Array.isArray(input)) input = [input];
            if (isClass(transform.geometry)) {
                if (transform.geometry === GridGeometry && transform.primitive && typeof(input[0]) !== 'string') {
                    input.unshift(transform.primitive);
                }
                input = new (transform.geometry)(...input);
            }
            else if (typeof transform.geometry === 'function') {
                if (transform.geometry === vectorizeText && input.length === 1) {
                    input.push({
                        textAlign: 'center',
                        textBaseline: 'middle',
                        // font: 'arial',
                        // triangles: true, // todo: make it work
                    });
                }
                input = (transform.geometry)(...input);
            }
        }
        return input;
    }
}

export {HydraThree}