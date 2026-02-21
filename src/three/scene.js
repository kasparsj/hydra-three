import * as THREE from "three";
import * as mt from "./mt.js";
import {GridGeometry} from "../lib/GridGeometry.js";
import GlslSource from "../glsl-source.js";
import {FullScreenQuad} from "three/examples/jsm/postprocessing/Pass.js";
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import {cameraMixin, sourceMixin, mixClass, autoClearMixin} from "../lib/mixins.js";
import * as layers from "./layers.js";
import * as lights from "./lights.js";
import * as world from "./world.js";
import * as gui from "../gui.js";
import * as gm from "./gm.js";
import { getRuntime } from "./runtime.js";

const runtimeStores = new WeakMap();

const createStore = () => ({
    scenes: Object.create(null),
    groups: Object.create(null),
    meshes: [],
    namedMeshes: Object.create(null),
    instancedMeshes: [],
    namedInstancedMeshes: Object.create(null),
    lines: [],
    namedLines: Object.create(null),
    lineLoops: [],
    namedLineLoops: Object.create(null),
    lineSegments: [],
    namedLineSegments: Object.create(null),
    points: [],
    namedPoints: Object.create(null),
});

const defaultStore = createStore();

const clearNamedStore = (namedStore) => {
    Object.keys(namedStore).forEach((key) => {
        delete namedStore[key];
    });
};

const clearStore = (store) => {
    Object.keys(store.scenes).forEach((key) => {
        const scene = store.scenes[key];
        if (scene && typeof scene.clear === 'function') {
            scene.clear();
        }
        delete store.scenes[key];
    });
    Object.keys(store.groups).forEach((key) => {
        const group = store.groups[key];
        if (group && typeof group.clear === 'function') {
            group.clear();
        }
        delete store.groups[key];
    });
    store.meshes.length = 0;
    store.instancedMeshes.length = 0;
    store.lines.length = 0;
    store.lineLoops.length = 0;
    store.lineSegments.length = 0;
    store.points.length = 0;
    clearNamedStore(store.namedMeshes);
    clearNamedStore(store.namedInstancedMeshes);
    clearNamedStore(store.namedLines);
    clearNamedStore(store.namedLineLoops);
    clearNamedStore(store.namedLineSegments);
    clearNamedStore(store.namedPoints);
};

const resolveRuntime = (runtime) => {
    if (runtime) {
        return runtime;
    }
    try {
        return getRuntime();
    } catch (_error) {
        return null;
    }
};

const getStore = (runtime) => {
    const runtimeRef = resolveRuntime(runtime);
    if (!runtimeRef) {
        return defaultStore;
    }
    let store = runtimeStores.get(runtimeRef);
    if (!store) {
        store = createStore();
        runtimeStores.set(runtimeRef, store);
    }
    return store;
};

const clearSceneRuntime = (runtime) => {
    if (!runtime) {
        clearStore(defaultStore);
        return;
    }
    const store = runtimeStores.get(runtime);
    if (!store) {
        return;
    }
    clearStore(store);
    runtimeStores.delete(runtime);
};

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
            case 'rotation':
                object[attr].copy(attributes[attr]);
                break;
            default:
                object[attr] = attributes[attr];
                break;
        }
    }
}

const setMeshAttrs = (mesh, attributes, runtime) => {
    setObject3DAttrs(mesh, attributes);
    if (attributes.geometry) {
        if (attributes.lineMat || attributes.lineWidth || attributes.lineColor) {
            createMeshEdges(mesh, attributes, runtime);
        }
    }
}

const createMeshEdges = (mesh, attributes, runtime) => {
    // todo: i don't think this will work with InstancedMesh
    const line = getOrCreateLineSegments({
        name: mesh.name,
        geometry: new THREE.EdgesGeometry(attributes.geometry),
        material: attributes.lineMat || (new THREE.LineBasicMaterial({
            color: attributes.lineColor || 0x000000,
            linewidth: attributes.lineWidth || 3
        })),
    }, runtime);
    mesh.add(line);
}

const getOrCreateScene = (options, attributes = {}) => {
    const runtime = options && options.runtime ? options.runtime : null;
    const store = getStore(runtime);
    const {name} = attributes;
    let scene = name ? store.scenes[name] : null;
    if (!name || !scene) { // always recreate default scene?
        scene = new HydraScene(options);
    } else if (runtime) {
        scene._runtime = runtime;
    }
    for (let attr in attributes) {
        if (!attributes.hasOwnProperty(attr)) continue;
        switch (attr) {
            case 'background':
                scene[attr] = new THREE.Color(attributes[attr]);
                break;
            default:
                scene[attr] = attributes[attr];
                break;
        }
    }
    if (scene.name) {
        store.scenes[scene.name] = scene;
    }
    return scene;
}

const getOrCreateMesh = (attributes = {}, runtime) => {
    const runtimeRef = resolveRuntime(runtime);
    const store = getStore(runtimeRef);
    const {name} = attributes;
    let mesh = name ? store.namedMeshes[name] : null;
    if (!name || !mesh) {
        mesh = new THREE.Mesh();
        const renderer = runtimeRef && runtimeRef.renderer;
        if (renderer && renderer.shadowMap.enabled) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        }
        store.meshes.push(mesh);
    }
    setMeshAttrs(mesh, attributes, runtimeRef);
    if (mesh.name) {
        store.namedMeshes[mesh.name] = mesh;
    }
    return mesh;
}

const getOrCreateInstancedMesh = (attributes, runtime) => {
    const runtimeRef = resolveRuntime(runtime);
    const store = getStore(runtimeRef);
    const {name, geometry, material, count} = attributes;
    let mesh = name ? store.namedInstancedMeshes[name] : null;
    if (!name || !mesh) {
        mesh = new THREE.InstancedMesh(geometry, material, count);
        const renderer = runtimeRef && runtimeRef.renderer;
        if (renderer && renderer.shadowMap.enabled) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        }
        store.instancedMeshes.push(mesh);
    }
    setMeshAttrs(mesh, attributes, runtimeRef);
    if (mesh.name) {
        store.namedInstancedMeshes[mesh.name] = mesh;
    }
    return mesh;
}

const getOrCreateLine = (attributes, runtime) => {
    const store = getStore(runtime);
    const {name} = attributes;
    let line = name ? store.namedLines[name] : null;
    if (!name || !line) {
        line = new THREE.Line();
        store.lines.push(line);
    }
    setObject3DAttrs(line, attributes);
    if (line.name) {
        store.namedLines[line.name] = line;
    }
    return line;
}

const getOrCreateLineLoop = (attributes, runtime) => {
    const store = getStore(runtime);
    const {name} = attributes;
    let lineLoop = name ? store.namedLineLoops[name] : null;
    if (!name || !lineLoop) {
        lineLoop = new THREE.LineLoop();
        store.lineLoops.push(lineLoop);
    }
    setObject3DAttrs(lineLoop, attributes);
    if (lineLoop.name) {
        store.namedLineLoops[lineLoop.name] = lineLoop;
    }
    return lineLoop;
}

const getOrCreateLineSegments = (attributes, runtime) => {
    const store = getStore(runtime);
    const {name} = attributes;
    let line = name ? store.namedLineSegments[name] : null;
    if (!name || !line) {
        line = new THREE.LineSegments();
        store.lineSegments.push(line);
    }
    setObject3DAttrs(line, attributes);
    if (line.name) {
        store.namedLineSegments[line.name] = line;
    }
    return line;
}

const getOrCreatePoints = (attributes, runtime) => {
    const store = getStore(runtime);
    const {name} = attributes;
    let point = name ? store.namedPoints[name] : null;
    if (!name || !point) {
        point = new THREE.Points();
        store.points.push(point);
    }
    setObject3DAttrs(point, attributes);
    if (point.name) {
        store.namedPoints[point.name] = point;
    }
    return point;
}

const sceneMixin = {
    translate(x = 0, y = 0, z = 0) {
        if (x.isVector4 || x.isVector3 || x.isVector2) {
            if (!x.isVector2) z = x.z;
            y = x.y;
            x = x.x;
        }
        this.translateX(x);
        this.translateY(y);
        this.translateZ(z);
        return this;
    },

    _add(geometry, material, options) {
        let object;
        if (geometry instanceof THREE.Object3D) {
            object = geometry;
            return this._addObject3D(object);
        }
        else {
            if (geometry instanceof GlslSource || (material && material.type === 'quad')) {
                options = material;
                material = geometry;
                geometry = null;
            }
            const {type} = options || {};
            geometry = this._handleGeometry(geometry, options);
            material = this._handleMaterial(geometry, material, options);
            switch (type) {
                case 'points':
                    object = getOrCreatePoints(Object.assign({geometry, material}, options), this._runtime);
                    break;
                case 'line loop':
                case 'lineloop':
                    object = getOrCreateLineLoop(Object.assign({geometry, material}, options), this._runtime);
                    break;
                case 'line strip':
                case 'linestrip':
                    object = getOrCreateLine(Object.assign({geometry, material}, options), this._runtime)
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
                    object = getOrCreateLineSegments(Object.assign({geometry, material}, options), this._runtime);
                    break;
                case 'quad':
                default:
                    object = this._createMesh(geometry, material, options);
                    break;
            }
        }
        addChild(this, object);
        return object;
    },

    _handleGeometry(geometry, options) {
        if (!geometry) geometry = [];
        if (!geometry.isBufferGeometry) {
            if (!Array.isArray(geometry)) geometry = [geometry];
            if (typeof(geometry[0]) !== 'string') {
                const {type} = options || {};
                geometry.unshift(type);
            }
            geometry = new GridGeometry(...geometry);
        }
        return geometry;
    },

    _handleMaterial(geometry, material, options) {
        const {type} = options || {};
        if (material === null || typeof material === 'undefined') {
            material = this._defaultMaterial(geometry, material, options);
        }
        else {
            if (typeof material === 'number' || material.isColor) {
                const color = material.isColor ? material : new THREE.Color(material);
                material = this._defaultMaterial(geometry, material, options);
                material.color = color;
            }
            else if (material instanceof GlslSource) {
                material = this._hydraMaterial(geometry, material, options);
            }
        }
        material.transparent = type !== 'quad';
        return material;
    },

    _defaultMaterial(geometry, material, options) {
        const {type} = options || {};
        switch (type) {
            case 'points':
                return geometry instanceof GridGeometry ? mt.squares() : mt.points();
            case 'line loop':
            case 'lineloop':
                return geometry instanceof GridGeometry ? mt.lineloop() : mt.lineBasic();
            case 'line strip':
            case 'linestrip':
                return geometry instanceof GridGeometry ? mt.linestrip() : mt.lineBasic();
            case 'lines':
                return geometry instanceof GridGeometry ? mt.lines() : mt.lineBasic();
            default:
                return mt.meshBasic();
        }
    },

    _hydraMaterial(geometry, material, options) {
        const {type} = options || {};
        switch (type) {
            case 'points':
            case 'line loop':
            case 'lineloop':
            case 'line strip':
            case 'linestrip':
            case 'lines':
                return mt.hydra(material, options.material);
            default:
                return mt.mesh(material, options.material);
        }
    },

    _createMesh(geometry, material, options = {}) {
        // todo: text
        // todo: plane
        let mesh;
        if (options.type === 'quad') {
            const quad = new FullScreenQuad(material);
            mesh = quad._mesh;
        }
        else if (options.instanced) {
            mesh = getOrCreateInstancedMesh(
                Object.assign({geometry, material, count: options.instanced}, options),
                this._runtime
            );
        }
        else {
            mesh = getOrCreateMesh(Object.assign({geometry, material}, options), this._runtime);
        }
        return mesh;
    },

    _mesh(geometry, material, options) {
        options = Object.assign(options || {}, { type: 'triangles' });
        return this._add(geometry, material, options);
    },

    _quad(material, options) {
        options = Object.assign(options || {}, { type: 'quad' });
        return this._add(material, options);
    },

    _points(geometry, material, options) {
        options = Object.assign(options || {}, { type: 'points' });
        return this._add(geometry, material, options);
    },

    _lines(geometry, material, options) {
        geometry = geometry || [1, 1];
        options = Object.assign(options || {}, { type: 'lines' });
        return this._add(geometry, material, options);
    },

    _linestrip(geometry, material, options) {
        options = Object.assign(options || {}, { type: 'linestrip' });
        return this._add(geometry, material, options);
    },

    _lineloop(geometry, material, options) {
        options = Object.assign(options || {}, { type: 'lineloop' });
        return this._add(geometry, material, options);
    },

    _line(geometry, material, options) {
        if (!geometry.isBufferGeometry) {
            geometry = gm.line(geometry);
        }
        return this._lines(geometry, material, options);
    },

    _circle(geometry, material, options) {
        if (typeof geometry === 'undefined') {
            geometry = gm.circle();
        }
        else if (!geometry.isBufferGeometry) {
            if (!Array.isArray(geometry)) {
                geometry = [geometry];
            }
            geometry = gm.circle(...geometry);
        }
        return this._mesh(geometry, material, options)
    },

    _ellipse(geometry, material, options) {
        if (typeof geometry === 'undefined') {
            geometry = gm.ellipse();
        }
        else if (!geometry.isBufferGeometry) {
            if (!Array.isArray(geometry)) {
                geometry = [geometry];
            }
            geometry = gm.ellipse(...geometry);
        }
        return this._mesh(geometry, material, options);
    },

    _triangle(geometry, material, options) {
        if (typeof geometry === 'undefined') {
            geometry = gm.triangle();
        }
        else if (!geometry.isBufferGeometry) {
            if (!Array.isArray(geometry)) {
                geometry = [geometry];
            }
            geometry = gm.triangle(...geometry);
        }
        return this._mesh(geometry, material, options);
    },

    add(geometry, material, options) {
        this._add(...arguments);
        return this;
    },

    mesh(geometry, material, options) {
        this._mesh(geometry, material, options);
        return this;
    },

    quad(material, options) {
        this._quad(material, options);
        return this;
    },

    points(geometry, material, options) {
        this._points(geometry, material, options);
        return this;
    },

    lines(geometry, material, options) {
        this._lines(geometry, material, options);
        return this;
    },

    linestrip(geometry, material, options) {
        this._linestrip(geometry, material, options);
        return this;
    },

    lineloop(geometry, material, options) {
        this._lineloop(geometry, material, options);
        return this;
    },

    line(geometry, material, options) {
        this._line(geometry, material, options);
        return this;
    },

    circle(geometry, material, options) {
        this._circle(geometry, material, options);
        return this;
    },

    ellipse(geometry, material, options) {
        this._ellipse(geometry, material, options);
        return this;
    },

    triangle(geometry, material, options) {
        this._triangle(geometry, material, options);
        return this;
    },

    group(attributes = {}) {
        const store = getStore(this._runtime);
        const {name} = attributes;
        let group = name ? store.groups[name] : null;
        if (!name || !group) {
            group = new HydraGroup(this._runtime);
        }
        addChild(this, group);
        setObject3DAttrs(group, attributes);
        group._runtime = this._runtime;
        if (group.name) {
            store.groups[group.name] = group;
        }
        return group;
    },

    css2d(element, attributes = {}) {
        const obj = new CSS2DObject(element);
        setObject3DAttrs(obj, attributes);
        return this._addObject3D(obj);
    },

    css3d(element, attributes = {}) {
        const obj = new CSS3DObject(element);
        setObject3DAttrs(obj, attributes);
        return this._addObject3D(obj);
    },

    // todo: does having just lights count as empty?
    empty() {
        return this.children.length === 0;
    },

    at(index = 0) {
        return this.children.filter((o) => o.name !== lights.groupName && o.name !== world.groupName)[index];
    },

    find(filter = {isMesh: true}) {
        const props = Object.keys(filter);
        return this.children.filter((o) => {
            return props.find((p) => o[p] !== filter[p]) === undefined;
        });
    }
}

class HydraGroup extends THREE.Group {
    constructor(runtime) {
        super();

        this._matrixStack = [];
        this._runtime = runtime || null;
    }

    _addObject3D(...args) {
        return super.add(...args);
    }
}

mixClass(HydraGroup, sceneMixin);

class HydraScene extends THREE.Scene {

    constructor(options) {
        super();

        this._runtime = options && options.runtime ? options.runtime : null;
        this.init(options);
        this._autoClear = {amount: 1};
        this._layers = [];
        this._matrixStack = [];
    }

    _addObject3D(...args) {
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
            autoClear: this._autoClear,
            layers: this._layers,
            fx: this._fx,
        }, options);
    }

    lights(options) {
        options || (options = {all: true});
        const camera = this.getCamera(options);
        lights.update(this, camera, options);
        if (options && options.gui) {
            gui.lights(this, camera, options);
        }
        return this;
    }

    getCamera(options) {
        return this._camera || (options && options.out || this.defaultOutput)._camera;
    }

    world(options = {}) {
        if (!options.near || !options.far) {
            const camera = this.getCamera(options);
            options = Object.assign({
                near: camera.near,
                far: camera.far,
            }, options);
        }
        world.update(this, options);
        if (options.gui) {
            gui.world(this, options);
        }
        return this;
    }

    layer(id, options = {}) {
        const layer = layers.create(id, this, options);
        this._layers.push(layer);
        return layer;
    }

    lookAt(target, options = {}) {
        const camera = this.getCamera(options);
        camera.userData.target = target;
        camera.lookAt(camera.userData.target);
        if (camera.userData.controls) {
            camera.userData.controls.target = camera.userData.target;
        }
        return this;
    }

    axesHelper(size) {
        return this.add(new THREE.AxesHelper(size || (window.innerHeight / 2)));
    }
}

mixClass(HydraScene, cameraMixin, autoClearMixin, sourceMixin, sceneMixin);

export { HydraScene, HydraGroup, getOrCreateScene, clearSceneRuntime }
