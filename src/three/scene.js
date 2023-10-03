import * as THREE from "three";
import * as mt from "./mt.js";
import {GridGeometry} from "../lib/GridGeometry.js";
import GlslSource from "../glsl-source.js";
import {FullScreenQuad} from "three/examples/jsm/postprocessing/Pass.js";
import {cameraMixin, sourceMixin, mixClass} from "../lib/mixins.js";
import * as layers from "./layers.js";
import * as lights from "./lights.js";
import * as world from "./world.js";

const scenes = {}
const groups = {};
const meshes = [];
const namedMeshes = {};
const instancedMeshes = [];
const namedInstancedMeshes = {};
const lines = [];
const namedLines = {};
const lineLoops = [];
const namedLineLoops = {};
const lineSegments = [];
const namedLineSegments = {};
const points = [];
const namedPoints = [];

const add = (scene, ...children) => {
    scene.add(...children);
    return children.length === 1 ? children[0] : children;
}

const addChild = (scene, child) => {
    if (child.parent !== scene) {
        add(scene, child);
    }
}

const setObject3DAttrs = (object, attributes) => {
    for (let attr in attributes) {
        if (!object.hasOwnProperty(attr)) continue;
        switch (attr) {
            case 'position':
            case 'quaternion':
                object[attr].copy(attributes[attr]);
                break;
            default:
                object[attr] = attributes[attr];
                break;
        }
    }
}

const setMeshAttrs = (mesh, attributes) => {
    setObject3DAttrs(mesh, attributes);
    if (attributes.geometry) {
        if (attributes.lineMat || attributes.lineWidth || attributes.lineColor) {
            createMeshEdges(mesh, attributes);
        }
    }
}

const createMeshEdges = (mesh, attributes) => {
    // todo: i don't think this will work with InstancedMesh
    const line = getOrCreateLineSegments(mesh.parent, {
        name: mesh.name,
        geometry: new THREE.EdgesGeometry(attributes.geometry),
        material: attributes.lineMat || (new THREE.LineBasicMaterial({
            color: attributes.lineColor || 0x000000,
            linewidth: attributes.lineWidth || 3
        })),
    });
    mesh.add(line);
}

const getOrCreateScene = (options, attributes = {}) => {
    const {name} = attributes;
    let scene = scenes[name];
    if (!name || !scene) { // always recreate default scene?
        scene = new HydraScene(options);
    }
    for (let attr in attributes) {
        if (!attributes.hasOwnProperty(attr)) continue;
        scene[attr] = attributes[attr];
    }
    scenes[scene.name] = scene;
    return scene;
}

const getOrCreateMesh = (attributes = {}) => {
    const {name} = attributes;
    let mesh = meshes[name];
    if (!name || !mesh) {
        mesh = new THREE.Mesh();
        const renderer = hydraSynth.renderer;
        if (renderer.shadowMap.enabled) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        }
        meshes.push(mesh);
    }
    setMeshAttrs(mesh, attributes);
    if (mesh.name) {
        namedMeshes[mesh.name] = mesh;
    }
    return mesh;
}

const getOrCreateInstancedMesh = (attributes) => {
    const {name, geometry, material, count} = attributes;
    let mesh = instancedMeshes[name];
    if (!name || !mesh) {
        mesh = new THREE.InstancedMesh(geometry, material, count);
        const renderer = hydraSynth.renderer;
        if (renderer.shadowMap.enabled) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        }
        instancedMeshes.push(mesh);
    }
    setMeshAttrs(mesh, attributes);
    if (mesh.name) {
        namedInstancedMeshes[mesh.name] = mesh;
    }
    return mesh;
}

const getOrCreateLine = (attributes) => {
    const {name} = attributes;
    let line = namedLines[name];
    if (!name || !line) {
        line = new THREE.Line();
        lines.push(line);
    }
    setObject3DAttrs(line, attributes);
    if (line.name) {
        namedLines[line.name] = line;
    }
    return line;
}

const getOrCreateLineLoop = (attributes) => {
    const {name} = attributes;
    let lineLoop = namedLineLoops[name];
    if (!name || !lineLoop) {
        lineLoop = new THREE.LineLoop();
        lineLoops.push(lineLoop);
    }
    setObject3DAttrs(lineLoop, attributes);
    if (lineLoop.name) {
        namedLineLoops[lineLoop.name] = lineLoop;
    }
    return lineLoop;
}

const getOrCreateLineSegments = (attributes) => {
    const {name} = attributes;
    let line = namedLineSegments[name];
    if (!name || !line) {
        line = new THREE.LineSegments();
        lineSegments.push(line);
    }
    setObject3DAttrs(line, attributes);
    if (line.name) {
        namedLineSegments[line.name] = line;
    }
    return line;
}

const getOrCreatePoints = (attributes) => {
    const {name} = attributes;
    let point = namedPoints[name];
    if (!name || !point) {
        point = new THREE.Points();
        points.push(point);
    }
    setObject3DAttrs(point, attributes);
    if (point.name) {
        namedPoints[point.name] = point;
    }
    return point;
}

const sceneMixin = {
    add(...args) {
        let object;
        if (args[0] instanceof THREE.Object3D) {
            return this._add(...args);
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
                            material = material || mt.squares();
                            object = getOrCreatePoints(Object.assign({geometry, material}, options));
                            break;
                        case 'line loop':
                        case 'lineloop':
                            material = material || mt.lineloop();
                            object = getOrCreateLineLoop(Object.assign({geometry, material}, options));
                            break;
                        case 'line strip':
                        case 'linestrip':
                            material = material || mt.linestrip();
                            object = getOrCreateLine(Object.assign({geometry, material}, options))
                            break;
                        case 'lines':
                            // todo: support instanced
                            // if (options.instanced) {
                            //     const instanceCount = 10;
                            //     const instancedGeometry = new THREE.InstancedBufferGeometry();
                            //     instancedGeometry.attributes.position = geometry.attributes.position;
                            //
                            //     const instancePositions = new Float32Array(instanceCount * 3);
                            //     for (let i = 0; i < instanceCount; i++) {
                            //         instancePositions[i * 3] = Math.random() * 2 - 1;
                            //         instancePositions[i * 3 + 1] = Math.random() * 2 - 1;
                            //         instancePositions[i * 3 + 2] = Math.random() * 2 - 1;
                            //     }
                            //     instancedGeometry.setAttribute('instancePosition', new THREE.InstancedBufferAttribute(instancePositions, 3));
                            // }
                            material = material || mt.lines();
                            object = getOrCreateLineSegments(Object.assign({geometry, material}, options));
                            break;
                    }
                    break;
                default:
                    object = this._createMesh(geometry, material, options);
                    break;
            }
        }
        addChild(this, object);
        return this;
    },

    _createMesh(geometry, material, options = {}) {
        // todo: text
        // todo: plane
        let mesh;
        if (typeof material === 'undefined' || !material.isMaterial) {
            material = mt.mesh(material);
        }
        if (options.type === 'quad') {
            const quad = new FullScreenQuad(material);
            mesh = quad._mesh;
        }
        else if (options.instanced) {
            mesh = getOrCreateInstancedMesh(Object.assign({geometry, material, count: options.instanced}, options));
        }
        else {
            mesh = getOrCreateMesh(Object.assign({geometry, material}, options));
        }
        return mesh;
    },

    quad(...args) {
        args[1] = Object.assign(args[1] || {}, { type: 'quad' });
        return this.add(...args);
    },

    mesh(...args) {
        args[1] = args[1] || null;
        args[2] = Object.assign(args[2] || {}, { type: 'triangles' });
        return this.add(...args);
    },

    points(...args) {
        args[1] = args[1] || null;
        args[2] = Object.assign(args[2] || {}, { type: 'points' });
        return this.add(...args);
    },

    linestrip(...args) {
        args[1] = args[1] || null;
        args[2] = Object.assign(args[2] || {}, { type: 'linestrip' });
        return this.add(...args);
    },

    lines(...args) {
        args[0] = args[0] || [1, 1];
        args[1] = args[1] || null;
        args[2] = Object.assign(args[2] || {}, { type: 'lines' });
        return this.add(...args);
    },

    lineloop(...args) {
        args[1] = args[1] || null;
        args[2] = Object.assign(args[2] || {}, { type: 'lineloop' });
        return this.add(...args);
    },

    group(attributes = {}) {
        const {name} = attributes;
        let group = groups[name];
        if (!name || !group) {
            group = new HydraGroup();
        }
        addChild(this, group);
        setObject3DAttrs(group, attributes);
        groups[group.name] = group;
        return group;
    },

    // todo: does having just lights count as empty?
    empty() {
        return this.children.length === 0;
    },

    at(index = 0) {
        return this.children.filter((o) => o.name !== '__lights')[index];
    },

    find(filter = {isMesh: true}) {
        const props = Object.keys(filter);
        return this.children.filter((o) => {
            return props.find((p) => o[p] !== filter[p]) === undefined;
        });
    }
}

class HydraGroup extends THREE.Group {
    _add(...args) {
        return super.add(...args);
    }
}

mixClass(HydraGroup, sceneMixin);

class HydraScene extends THREE.Scene {

    constructor(options) {
        super();

        this.init(options);
        this._clear = {amount: 1};
        this._layers = [];
    }

    _add(...args) {
        return super.add(...args);
    }

    createShaderInfo() {
        return null;
    }

    createPass(shaderInfo, options = {}) {
        return Object.assign({
            scene: this,
            camera: this._camera,
            // todo: viewport
            viewport: this._viewport,
            clear: this._clear,
            layers: this._layers,
            fx: this._fx,
        }, options);
    }

    lights(options) {
        const camera = this._camera || (options && options.out || this.defaultOutput)._camera;
        // todo: cannot remove lights
        lights.init(this.group({name: '__lights'}), camera, options || {cam: true, amb: true, sun: true, hemi: true});
        return this;
    }

    light() {
        // todo: getOrCreate light
    }

    hasLights() {
        return !!this.find({name: '__lights'}).length;
    }

    world(options = {}) {
        if (!options.near || !options.far) {
            const camera = this._camera || (options.out || this.defaultOutput)._camera;
            options = Object.assign({
                near: camera.near,
                far: camera.far,
            }, options);
        }
        // todo: cannot remove world
        world.init(this, options);
        return this;
    }

    layer(id, options = {}) {
        const layer = layers.create(id, this, options);
        this._layers.push(layer);
        return layer;
    }

    axesHelper(size) {
        return this.add(new THREE.AxesHelper(size || (window.innerHeight / 2)));
    }
}

mixClass(HydraScene, cameraMixin, sourceMixin, sceneMixin);

export {HydraScene, HydraGroup, getOrCreateScene}