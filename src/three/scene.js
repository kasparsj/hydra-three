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
const LIVE_NAME_PREFIX = "__live";
const LIVE_CYCLE_KEY = "__hydraLiveCycle";
const LIVE_IDENTITY_KEY = "__hydraLiveKey";
const LIVE_KEY_HINT =
    "[hydra-three] Continuous live mode auto-generated names for unkeyed objects. Add { key: \"...\" } for stable identity across reruns.";

const createStore = () => ({
    scenes: Object.create(null),
    keyedScenes: Object.create(null),
    groups: Object.create(null),
    keyedGroups: Object.create(null),
    meshes: [],
    namedMeshes: Object.create(null),
    keyedMeshes: Object.create(null),
    instancedMeshes: [],
    namedInstancedMeshes: Object.create(null),
    keyedInstancedMeshes: Object.create(null),
    lines: [],
    namedLines: Object.create(null),
    keyedLines: Object.create(null),
    lineLoops: [],
    namedLineLoops: Object.create(null),
    keyedLineLoops: Object.create(null),
    lineSegments: [],
    namedLineSegments: Object.create(null),
    keyedLineSegments: Object.create(null),
    points: [],
    namedPoints: Object.create(null),
    keyedPoints: Object.create(null),
});

const createDetachedRuntime = () => Object.create(null);

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
    clearNamedStore(store.keyedMeshes);
    clearNamedStore(store.namedInstancedMeshes);
    clearNamedStore(store.keyedInstancedMeshes);
    clearNamedStore(store.namedLines);
    clearNamedStore(store.keyedLines);
    clearNamedStore(store.namedLineLoops);
    clearNamedStore(store.keyedLineLoops);
    clearNamedStore(store.namedLineSegments);
    clearNamedStore(store.keyedLineSegments);
    clearNamedStore(store.namedPoints);
    clearNamedStore(store.keyedPoints);
    clearNamedStore(store.keyedScenes);
    clearNamedStore(store.keyedGroups);
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
        return createStore();
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
        return;
    }
    const store = runtimeStores.get(runtime);
    if (!store) {
        if (runtime._liveEvalState) {
            runtime._liveEvalState = null;
        }
        return;
    }
    clearStore(store);
    runtimeStores.delete(runtime);
    if (runtime._liveEvalState) {
        runtime._liveEvalState = null;
    }
};

const getLiveEvalState = (runtime) => {
    if (!runtime) {
        return null;
    }
    if (!runtime._liveEvalState) {
        runtime._liveEvalState = {
            active: false,
            cycle: 0,
            counters: Object.create(null),
            touched: new Set(),
            touchedScenes: new Set(),
            hasGraphMutations: false,
            sawUnkeyedAutoNames: false,
            warnedUnkeyedAutoNames: false,
        };
    }
    return runtime._liveEvalState;
};

const isLiveEvalActive = (runtime) => {
    const state = getLiveEvalState(runtime);
    return !!(state && state.active);
};

const nextLiveName = (runtime, type) => {
    const state = getLiveEvalState(runtime);
    if (!state || !state.active) {
        return null;
    }
    const nextId = state.counters[type] || 0;
    state.counters[type] = nextId + 1;
    return `${LIVE_NAME_PREFIX}_${type}_${nextId}`;
};

const withLiveName = (runtime, attributes = {}, type = "object") => {
    if (!isLiveEvalActive(runtime) || attributes.name) {
        return attributes;
    }
    const state = getLiveEvalState(runtime);
    if (state && !normalizeLiveKey(attributes.key)) {
        state.sawUnkeyedAutoNames = true;
    }
    return Object.assign({}, attributes, {
        name: nextLiveName(runtime, type),
    });
};

const normalizeLiveKey = (value) => {
    if (typeof value !== "string") {
        return null;
    }
    const key = value.trim();
    return key.length > 0 ? key : null;
};

const getLiveKey = (object) => {
    if (!object || !object.userData) {
        return null;
    }
    return normalizeLiveKey(object.userData[LIVE_IDENTITY_KEY]);
};

const setLiveKey = (object, key) => {
    if (!object) {
        return null;
    }
    const normalized = normalizeLiveKey(key);
    object.userData || (object.userData = {});
    if (!normalized) {
        delete object.userData[LIVE_IDENTITY_KEY];
        return null;
    }
    object.userData[LIVE_IDENTITY_KEY] = normalized;
    return normalized;
};

const bindLiveIdentity = (object, key, keyedStore) => {
    if (!object || !keyedStore) {
        return null;
    }
    const previousKey = getLiveKey(object);
    const normalized = normalizeLiveKey(key);
    if (previousKey && previousKey !== normalized) {
        delete keyedStore[previousKey];
    }
    const stored = setLiveKey(object, normalized);
    if (stored) {
        keyedStore[stored] = object;
    }
    return stored;
};

const markLiveTouch = (runtime, object, { scene = false } = {}) => {
    const state = getLiveEvalState(runtime);
    if (!state || !state.active || !object) {
        return;
    }
    object.userData || (object.userData = {});
    object.userData[LIVE_CYCLE_KEY] = state.cycle;
    state.touched.add(object);
    if (scene) {
        state.touchedScenes.add(object);
    }
};

const markLiveGraphMutation = (runtime) => {
    const state = getLiveEvalState(runtime);
    if (!state || !state.active) {
        return;
    }
    state.hasGraphMutations = true;
};

const findSceneRoot = (object) => {
    let current = object || null;
    while (current && !current.isScene) {
        current = current.parent || null;
    }
    return current && current.isScene ? current : null;
};

const createResourceSnapshot = () => ({
    geometries: new Set(),
    materials: new Set(),
});

const isDisposable = (value) => !!value && typeof value.dispose === "function";

const toMaterialArray = (value) => {
    if (!value) {
        return [];
    }
    return Array.isArray(value) ? value : [value];
};

const visitObjectTree = (object, visit) => {
    if (!object || typeof visit !== "function") {
        return;
    }
    visit(object);
    if (Array.isArray(object.children)) {
        object.children.forEach((child) => visitObjectTree(child, visit));
    }
};

const collectObjectResources = (object, resources) => {
    if (!object || !resources) {
        return;
    }
    if (isDisposable(object.geometry)) {
        resources.geometries.add(object.geometry);
    }
    toMaterialArray(object.material).forEach((material) => {
        if (isDisposable(material)) {
            resources.materials.add(material);
        }
    });
};

const hasResourceSnapshot = (resources) =>
    !!resources &&
    ((resources.geometries && resources.geometries.size > 0) ||
        (resources.materials && resources.materials.size > 0));

const collectStoreResources = (store) => {
    const resources = createResourceSnapshot();
    if (!store) {
        return resources;
    }
    Object.keys(store.scenes).forEach((key) => {
        const scene = store.scenes[key];
        visitObjectTree(scene, (object) => {
            collectObjectResources(object, resources);
        });
    });
    return resources;
};

const collectReplacedMeshResources = (mesh, attributes = {}) => {
    const replaced = createResourceSnapshot();
    if (!mesh) {
        return replaced;
    }
    if (Object.prototype.hasOwnProperty.call(attributes, "geometry")) {
        const previousGeometry = mesh.geometry;
        const nextGeometry = attributes.geometry;
        if (isDisposable(previousGeometry) && previousGeometry !== nextGeometry) {
            replaced.geometries.add(previousGeometry);
        }
    }
    if (Object.prototype.hasOwnProperty.call(attributes, "material")) {
        const nextMaterials = toMaterialArray(attributes.material);
        toMaterialArray(mesh.material).forEach((material) => {
            if (!isDisposable(material)) {
                return;
            }
            if (nextMaterials.indexOf(material) === -1) {
                replaced.materials.add(material);
            }
        });
    }
    return replaced;
};

const disposeReplacedMeshResources = (runtime, replacedResources) => {
    if (!hasResourceSnapshot(replacedResources)) {
        return;
    }
    const runtimeRef = resolveRuntime(runtime);
    if (!runtimeRef) {
        return;
    }
    const store = runtimeStores.get(runtimeRef);
    if (!store) {
        return;
    }
    const retained = collectStoreResources(store);
    replacedResources.geometries.forEach((geometry) => {
        if (isDisposable(geometry) && !retained.geometries.has(geometry)) {
            try {
                geometry.dispose();
            } catch (_error) {}
        }
    });
    replacedResources.materials.forEach((material) => {
        if (isDisposable(material) && !retained.materials.has(material)) {
            try {
                material.dispose();
            } catch (_error) {}
        }
    });
};

const disposeRemovedResources = (removedRoots, retained) => {
    if (!Array.isArray(removedRoots) || removedRoots.length === 0) {
        return;
    }
    const retainedResources = retained || createResourceSnapshot();
    const disposed = createResourceSnapshot();
    const disposeResource = (resource, bucket) => {
        if (!isDisposable(resource) || bucket.has(resource)) {
            return;
        }
        try {
            resource.dispose();
        } catch (_error) {}
        bucket.add(resource);
    };

    removedRoots.forEach((root) => {
        visitObjectTree(root, (object) => {
            const geometry = object.geometry;
            if (
                isDisposable(geometry) &&
                !retainedResources.geometries.has(geometry)
            ) {
                disposeResource(geometry, disposed.geometries);
            }
            toMaterialArray(object.material).forEach((material) => {
                if (
                    isDisposable(material) &&
                    !retainedResources.materials.has(material)
                ) {
                    disposeResource(material, disposed.materials);
                }
            });
        });
    });
};

const clearRemovedRoots = (removedRoots) => {
    if (!Array.isArray(removedRoots)) {
        return;
    }
    removedRoots.forEach((root) => {
        if (root && typeof root.clear === "function") {
            try {
                root.clear();
            } catch (_error) {}
        }
    });
};

const pruneUntouchedChildren = (parent, touched, removedRoots) => {
    if (!parent || !Array.isArray(parent.children) || !touched) {
        return;
    }
    const children = parent.children.slice();
    children.forEach((child) => {
        if (!touched.has(child)) {
            parent.remove(child);
            if (Array.isArray(removedRoots)) {
                removedRoots.push(child);
            }
            return;
        }
        pruneUntouchedChildren(child, touched, removedRoots);
    });
};

const rebuildStore = (store) => {
    const scenes = Object.values(store.scenes);
    store.scenes = Object.create(null);
    store.keyedScenes = Object.create(null);
    store.groups = Object.create(null);
    store.keyedGroups = Object.create(null);
    store.meshes = [];
    store.namedMeshes = Object.create(null);
    store.keyedMeshes = Object.create(null);
    store.instancedMeshes = [];
    store.namedInstancedMeshes = Object.create(null);
    store.keyedInstancedMeshes = Object.create(null);
    store.lines = [];
    store.namedLines = Object.create(null);
    store.keyedLines = Object.create(null);
    store.lineLoops = [];
    store.namedLineLoops = Object.create(null);
    store.keyedLineLoops = Object.create(null);
    store.lineSegments = [];
    store.namedLineSegments = Object.create(null);
    store.keyedLineSegments = Object.create(null);
    store.points = [];
    store.namedPoints = Object.create(null);
    store.keyedPoints = Object.create(null);

    const visit = (object) => {
        if (!object) {
            return;
        }
        const key = getLiveKey(object);
        if (object.isScene && object.name) {
            store.scenes[object.name] = object;
        }
        if (object.isScene && key) {
            store.keyedScenes[key] = object;
        }
        if (object.isGroup && object.name) {
            store.groups[object.name] = object;
        }
        if (object.isGroup && key) {
            store.keyedGroups[key] = object;
        }

        if (object.isInstancedMesh) {
            store.instancedMeshes.push(object);
            if (object.name) {
                store.namedInstancedMeshes[object.name] = object;
            }
            if (key) {
                store.keyedInstancedMeshes[key] = object;
            }
        } else if (object.isMesh) {
            store.meshes.push(object);
            if (object.name) {
                store.namedMeshes[object.name] = object;
            }
            if (key) {
                store.keyedMeshes[key] = object;
            }
        }

        if (object.isLineSegments) {
            store.lineSegments.push(object);
            if (object.name) {
                store.namedLineSegments[object.name] = object;
            }
            if (key) {
                store.keyedLineSegments[key] = object;
            }
        } else if (object.isLineLoop) {
            store.lineLoops.push(object);
            if (object.name) {
                store.namedLineLoops[object.name] = object;
            }
            if (key) {
                store.keyedLineLoops[key] = object;
            }
        } else if (object.isLine) {
            store.lines.push(object);
            if (object.name) {
                store.namedLines[object.name] = object;
            }
            if (key) {
                store.keyedLines[key] = object;
            }
        }

        if (object.isPoints) {
            store.points.push(object);
            if (object.name) {
                store.namedPoints[object.name] = object;
            }
            if (key) {
                store.keyedPoints[key] = object;
            }
        }

        if (Array.isArray(object.children)) {
            object.children.forEach((child) => visit(child));
        }
    };

    scenes.forEach((scene) => {
        visit(scene);
    });
};

const beginSceneEval = (runtime) => {
    const runtimeRef = resolveRuntime(runtime);
    if (!runtimeRef) {
        return;
    }
    const state = getLiveEvalState(runtimeRef);
    state.active = true;
    state.cycle += 1;
    state.counters = Object.create(null);
    state.touched = new Set();
    state.touchedScenes = new Set();
    state.hasGraphMutations = false;
    state.sawUnkeyedAutoNames = false;
};

const resetLiveEvalState = (state) => {
    if (!state) {
        return;
    }
    state.active = false;
    state.touched.clear();
    state.touchedScenes.clear();
    state.sawUnkeyedAutoNames = false;
};

const maybeWarnUnkeyedAutoNames = (runtime, state) => {
    if (!runtime || !state || state.warnedUnkeyedAutoNames) {
        return;
    }
    if (runtime.liveMode !== "continuous" || !state.sawUnkeyedAutoNames) {
        return;
    }
    try {
        console.warn(LIVE_KEY_HINT);
    } catch (_error) {}
    state.warnedUnkeyedAutoNames = true;
};

const endSceneEval = (runtime) => {
    const runtimeRef = resolveRuntime(runtime);
    if (!runtimeRef) {
        return;
    }
    const state = getLiveEvalState(runtimeRef);
    if (!state || !state.active) {
        return;
    }
    const shouldReconcile =
        state.hasGraphMutations || state.touchedScenes.size > 0;
    if (!shouldReconcile) {
        maybeWarnUnkeyedAutoNames(runtimeRef, state);
        resetLiveEvalState(state);
        return;
    }
    const store = runtimeStores.get(runtimeRef);
    if (store) {
        const removedRoots = [];
        Object.keys(store.scenes).forEach((key) => {
            const scene = store.scenes[key];
            if (!state.touchedScenes.has(scene)) {
                if (scene) {
                    removedRoots.push(scene);
                }
                delete store.scenes[key];
                return;
            }
            pruneUntouchedChildren(scene, state.touched, removedRoots);
        });
        if (removedRoots.length > 0) {
            const retained = collectStoreResources(store);
            disposeRemovedResources(removedRoots, retained);
            clearRemovedRoots(removedRoots);
        }
        rebuildStore(store);
    }
    maybeWarnUnkeyedAutoNames(runtimeRef, state);
    resetLiveEvalState(state);
};

const add = (scene, ...children) => {
    if (scene && typeof scene._addObject3D === "function") {
        scene._addObject3D(...children);
    } else if (scene && typeof scene.add === "function") {
        scene.add(...children);
    }
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
    const replacedResources = collectReplacedMeshResources(mesh, attributes);
    setObject3DAttrs(mesh, attributes);
    disposeReplacedMeshResources(runtime, replacedResources);
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
    const runtime = resolveRuntime(options && options.runtime ? options.runtime : null) || createDetachedRuntime();
    const sceneOptions = Object.assign({}, options, { runtime });
    const store = getStore(runtime);
    const sceneAttributes = withLiveName(runtime, attributes, "scene");
    const {name, key} = sceneAttributes;
    const normalizedKey = normalizeLiveKey(key);
    let scene = normalizedKey ? store.keyedScenes[normalizedKey] : null;
    if (!scene && name) {
        scene = store.scenes[name];
    }
    if (!scene) { // always recreate default scene?
        scene = new HydraScene(sceneOptions);
    } else {
        scene._runtime = runtime;
    }
    for (let attr in sceneAttributes) {
        if (!sceneAttributes.hasOwnProperty(attr)) continue;
        switch (attr) {
            case 'background':
                scene[attr] = new THREE.Color(sceneAttributes[attr]);
                break;
            default:
                scene[attr] = sceneAttributes[attr];
                break;
        }
    }
    if (scene.name) {
        store.scenes[scene.name] = scene;
    }
    bindLiveIdentity(scene, normalizedKey, store.keyedScenes);
    markLiveTouch(runtime, scene, { scene: true });
    return scene;
}

const getOrCreateMesh = (attributes = {}, runtime) => {
    const runtimeRef = resolveRuntime(runtime);
    const store = getStore(runtimeRef);
    const meshAttrs = withLiveName(runtimeRef, attributes, "mesh");
    const {name, key} = meshAttrs;
    const normalizedKey = normalizeLiveKey(key);
    let mesh = normalizedKey ? store.keyedMeshes[normalizedKey] : null;
    if (!mesh && name) {
        mesh = store.namedMeshes[name];
    }
    if (!mesh) {
        mesh = new THREE.Mesh();
        const renderer = runtimeRef && runtimeRef.renderer;
        if (renderer && renderer.shadowMap.enabled) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        }
        store.meshes.push(mesh);
    }
    setMeshAttrs(mesh, meshAttrs, runtimeRef);
    if (mesh.name) {
        store.namedMeshes[mesh.name] = mesh;
    }
    bindLiveIdentity(mesh, normalizedKey, store.keyedMeshes);
    markLiveTouch(runtimeRef, mesh);
    return mesh;
}

const getOrCreateInstancedMesh = (attributes, runtime) => {
    const runtimeRef = resolveRuntime(runtime);
    const store = getStore(runtimeRef);
    const instancedAttrs = withLiveName(runtimeRef, attributes, "instancedMesh");
    const {name, key, geometry, material, count} = instancedAttrs;
    const normalizedKey = normalizeLiveKey(key);
    let mesh = normalizedKey ? store.keyedInstancedMeshes[normalizedKey] : null;
    if (!mesh && name) {
        mesh = store.namedInstancedMeshes[name];
    }
    if (!mesh) {
        mesh = new THREE.InstancedMesh(geometry, material, count);
        const renderer = runtimeRef && runtimeRef.renderer;
        if (renderer && renderer.shadowMap.enabled) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        }
        store.instancedMeshes.push(mesh);
    }
    setMeshAttrs(mesh, instancedAttrs, runtimeRef);
    if (mesh.name) {
        store.namedInstancedMeshes[mesh.name] = mesh;
    }
    bindLiveIdentity(mesh, normalizedKey, store.keyedInstancedMeshes);
    markLiveTouch(runtimeRef, mesh);
    return mesh;
}

const getOrCreateLine = (attributes, runtime) => {
    const runtimeRef = resolveRuntime(runtime);
    const store = getStore(runtimeRef);
    const lineAttrs = withLiveName(runtimeRef, attributes, "line");
    const {name, key} = lineAttrs;
    const normalizedKey = normalizeLiveKey(key);
    let line = normalizedKey ? store.keyedLines[normalizedKey] : null;
    if (!line && name) {
        line = store.namedLines[name];
    }
    if (!line) {
        line = new THREE.Line();
        store.lines.push(line);
    }
    setObject3DAttrs(line, lineAttrs);
    if (line.name) {
        store.namedLines[line.name] = line;
    }
    bindLiveIdentity(line, normalizedKey, store.keyedLines);
    markLiveTouch(runtimeRef, line);
    return line;
}

const getOrCreateLineLoop = (attributes, runtime) => {
    const runtimeRef = resolveRuntime(runtime);
    const store = getStore(runtimeRef);
    const lineLoopAttrs = withLiveName(runtimeRef, attributes, "lineLoop");
    const {name, key} = lineLoopAttrs;
    const normalizedKey = normalizeLiveKey(key);
    let lineLoop = normalizedKey ? store.keyedLineLoops[normalizedKey] : null;
    if (!lineLoop && name) {
        lineLoop = store.namedLineLoops[name];
    }
    if (!lineLoop) {
        lineLoop = new THREE.LineLoop();
        store.lineLoops.push(lineLoop);
    }
    setObject3DAttrs(lineLoop, lineLoopAttrs);
    if (lineLoop.name) {
        store.namedLineLoops[lineLoop.name] = lineLoop;
    }
    bindLiveIdentity(lineLoop, normalizedKey, store.keyedLineLoops);
    markLiveTouch(runtimeRef, lineLoop);
    return lineLoop;
}

const getOrCreateLineSegments = (attributes, runtime) => {
    const runtimeRef = resolveRuntime(runtime);
    const store = getStore(runtimeRef);
    const lineAttrs = withLiveName(runtimeRef, attributes, "lineSegments");
    const {name, key} = lineAttrs;
    const normalizedKey = normalizeLiveKey(key);
    let line = normalizedKey ? store.keyedLineSegments[normalizedKey] : null;
    if (!line && name) {
        line = store.namedLineSegments[name];
    }
    if (!line) {
        line = new THREE.LineSegments();
        store.lineSegments.push(line);
    }
    setObject3DAttrs(line, lineAttrs);
    if (line.name) {
        store.namedLineSegments[line.name] = line;
    }
    bindLiveIdentity(line, normalizedKey, store.keyedLineSegments);
    markLiveTouch(runtimeRef, line);
    return line;
}

const getOrCreatePoints = (attributes, runtime) => {
    const runtimeRef = resolveRuntime(runtime);
    const store = getStore(runtimeRef);
    const pointAttrs = withLiveName(runtimeRef, attributes, "points");
    const {name, key} = pointAttrs;
    const normalizedKey = normalizeLiveKey(key);
    let point = normalizedKey ? store.keyedPoints[normalizedKey] : null;
    if (!point && name) {
        point = store.namedPoints[name];
    }
    if (!point) {
        point = new THREE.Points();
        store.points.push(point);
    }
    setObject3DAttrs(point, pointAttrs);
    if (point.name) {
        store.namedPoints[point.name] = point;
    }
    bindLiveIdentity(point, normalizedKey, store.keyedPoints);
    markLiveTouch(runtimeRef, point);
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
            addChild(this, object);
            markLiveGraphMutation(this._runtime);
            markLiveTouch(this._runtime, object);
            markLiveTouch(this._runtime, this, { scene: !!this.isScene });
            const sceneRoot = findSceneRoot(this);
            if (sceneRoot) {
                markLiveTouch(this._runtime, sceneRoot, { scene: true });
            }
            return object;
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
        markLiveGraphMutation(this._runtime);
        markLiveTouch(this._runtime, object);
        markLiveTouch(this._runtime, this, { scene: !!this.isScene });
        const sceneRoot = findSceneRoot(this);
        if (sceneRoot) {
            markLiveTouch(this._runtime, sceneRoot, { scene: true });
        }
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
        const groupAttributes = withLiveName(this._runtime, attributes, "group");
        const store = getStore(this._runtime);
        const {name, key} = groupAttributes;
        const normalizedKey = normalizeLiveKey(key);
        let group = normalizedKey ? store.keyedGroups[normalizedKey] : null;
        if (!group && name) {
            group = store.groups[name];
        }
        const hasExistingGroup = !!group;
        if (!group) {
            group = new HydraGroup(this._runtime);
        }
        const previousParent = group.parent;
        addChild(this, group);
        if (!hasExistingGroup || group.parent !== previousParent) {
            markLiveGraphMutation(this._runtime);
        }
        setObject3DAttrs(group, groupAttributes);
        group._runtime = this._runtime;
        if (group.name) {
            store.groups[group.name] = group;
        }
        bindLiveIdentity(group, normalizedKey, store.keyedGroups);
        markLiveTouch(this._runtime, group);
        markLiveTouch(this._runtime, this, { scene: !!this.isScene });
        const sceneRoot = findSceneRoot(this);
        if (sceneRoot) {
            markLiveTouch(this._runtime, sceneRoot, { scene: true });
        }
        return group;
    },

    css2d(element, attributes = {}) {
        const obj = new CSS2DObject(element);
        setObject3DAttrs(obj, attributes);
        addChild(this, obj);
        markLiveGraphMutation(this._runtime);
        markLiveTouch(this._runtime, obj);
        markLiveTouch(this._runtime, this, { scene: !!this.isScene });
        const sceneRoot = findSceneRoot(this);
        if (sceneRoot) {
            markLiveTouch(this._runtime, sceneRoot, { scene: true });
        }
        return obj;
    },

    css3d(element, attributes = {}) {
        const obj = new CSS3DObject(element);
        setObject3DAttrs(obj, attributes);
        addChild(this, obj);
        markLiveGraphMutation(this._runtime);
        markLiveTouch(this._runtime, obj);
        markLiveTouch(this._runtime, this, { scene: !!this.isScene });
        const sceneRoot = findSceneRoot(this);
        if (sceneRoot) {
            markLiveTouch(this._runtime, sceneRoot, { scene: true });
        }
        return obj;
    },

    // todo: does having just lights count as empty?
    empty() {
        return this.children.length === 0;
    },

    at(index = 0) {
        const object = this.children.filter((o) => o.name !== lights.groupName && o.name !== world.groupName)[index];
        markLiveTouch(this._runtime, object);
        markLiveTouch(this._runtime, this, { scene: !!this.isScene });
        const sceneRoot = findSceneRoot(this);
        if (sceneRoot) {
            markLiveTouch(this._runtime, sceneRoot, { scene: true });
        }
        return object;
    },

    find(filter = {isMesh: true}) {
        const props = Object.keys(filter);
        const objects = this.children.filter((o) => {
            return props.find((p) => o[p] !== filter[p]) === undefined;
        });
        objects.forEach((object) => {
            markLiveTouch(this._runtime, object);
        });
        markLiveTouch(this._runtime, this, { scene: !!this.isScene });
        const sceneRoot = findSceneRoot(this);
        if (sceneRoot) {
            markLiveTouch(this._runtime, sceneRoot, { scene: true });
        }
        return objects;
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

export {
    HydraScene,
    HydraGroup,
    getOrCreateScene,
    clearSceneRuntime,
    beginSceneEval,
    endSceneEval,
}
