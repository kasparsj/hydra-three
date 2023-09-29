import * as THREE from "three";
import * as mt from "./mt.js";
import {GridGeometry} from "../lib/GridGeometry.js";
import GlslSource from "../glsl-source.js";
import * as scene from "./scene.js";
import {FullScreenQuad} from "three/examples/jsm/postprocessing/Pass.js";
import {cameraMixin, sourceMixin} from "../lib/mixins.js";

class SourceMixins {

}
Object.assign(SourceMixins.prototype, cameraMixin, sourceMixin);

class HydraScene extends SourceMixins {

    constructor(options, attributes = {}) {
        super();

        this.init(options);
        this.scene = scene.getOrCreateScene(attributes);
    }

    createShaderInfo() {
        return null;
    }

    createPass(shaderInfo, options = {}) {
        return Object.assign({
            scene: this.scene,
            camera: this._camera,
            // todo: viewport
            viewport: this._viewport,
            clear: this._autoClear,
        }, options);
    }

    add(...args) {
        let object;
        if (args[0] instanceof THREE.Object3D) {
            object = args[0];
        }
        else if (args[0] instanceof GlslSource || (args[1] && args[1].type === 'quad')) {
            let [material, options] = args;
            options = Object.assign(options || {}, {type: 'quad'});
            object = this._createMesh(null, material, options)
        }
        else {
            let [geometry, material, options] = args;
            const {type} = options || {};
            if (material instanceof GlslSource) {
                material = mt.hydra(material, options.material);
            }
            if (!geometry) geometry = [];
            if (!geometry.isBufferGeometry) {
                if (!Array.isArray(geometry)) geometry = [geometry];
                if (typeof(geometry[0]) !== 'string') {
                    geometry.unshift(type);
                }
                geometry = new GridGeometry(...geometry);
            }
            switch (type) {
                case 'points':
                case 'line loop':
                case 'lineloop':
                case 'line strip':
                case 'linestrip':
                case 'lines':
                    switch (options.type) {
                        case 'points':
                            object = new THREE.Points(geometry, material || mt.squares());
                            break;
                        case 'line loop':
                        case 'lineloop':
                            object = new THREE.LineLoop(geometry, material || mt.lineloop());
                            break;
                        case 'line strip':
                        case 'linestrip':
                            object = new THREE.Line(geometry, material || mt.linestrip());
                            break;
                        case 'lines':
                            object = new THREE.LineSegments(geometry, material || mt.lines());
                            break;
                    }
                    break;
                default:
                    object = this._createMesh(geometry, material, options);
                    break;
            }
        }
        this.scene.add(object);
        return this;
    }

    _createMesh(geometry, material, options = {}) {
        // todo: text
        // todo: plane
        let mesh;
        if (typeof material === 'undefined' || !(material instanceof THREE.Material)) {
            material = mt.mesh(material);
        }
        if (options.type === 'quad') {
            const quad = new FullScreenQuad(material);
            mesh = quad._mesh;
        }
        else if (options.instanced) {
            mesh = new THREE.InstancedMesh(geometry, material, options.instanced);
        }
        else {
            mesh = new THREE.Mesh(geometry, material);
        }
        return mesh;
    }

    quad(...args) {
        args[1] = Object.assign(args[1] || {}, { type: 'quad' });
        return this.add(...args);
    }

    mesh(...args) {
        args[1] = args[1] || null;
        args[2] = Object.assign(args[2] || {}, { type: 'triangles' });
        return this.add(...args);
    }

    points(...args) {
        args[1] = args[1] || null;
        args[2] = Object.assign(args[2] || {}, { type: 'points' });
        return this.add(...args);
    }

    linestrip(...args) {
        args[1] = args[1] || null;
        args[2] = Object.assign(args[2] || {}, { type: 'linestrip' });
        return this.add(...args);
    }

    lines(...args) {
        args[0] = args[0] || [1, 1];
        args[1] = args[1] || null;
        args[2] = Object.assign(args[2] || {}, { type: 'lines' });
        return this.add(...args);
    }

    lineloop(...args) {
        args[1] = args[1] || null;
        args[2] = Object.assign(args[2] || {}, { type: 'lineloop' });
        return this.add(...args);
    }

    lights(options) {
        const camera = this._camera || (options && options.out || this.defaultOutput)._camera;
        this.scene.lights(camera, options || {cam: true, amb: true, sun: true, hemi: true});
        return this;
    }

    world(options = {}) {
        if (!options.near || !options.far) {
            const camera = this._camera || (options.out || this.defaultOutput)._camera;
            options = Object.assign({
                near: camera.near,
                far: camera.far,
            }, options);
        }
        this.scene.world(options);
        return this;
    }

}

export {HydraScene}