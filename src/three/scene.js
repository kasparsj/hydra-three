import * as THREE from "three";
import * as lights from "./lights";
import * as world from "./world";
import * as geoms from "./gm";

const scenes = {}
const groups = {};
const meshes = [];
const namedMeshes = {};
const instancedMeshes = [];
const namedInstancedMeshes = {};
const lines = [];
const namedLines = {};
const lineSegments = [];
const namedLineSegments = {};
const points = [];
const namedPoints = [];

const getOrCreateScene = (attributes = {}) => {
    const {name} = attributes;
    let api = scenes[name];
    if (!name || !api) { // always recreate default scene?
        api = createScene();
    }
    for (let attr in attributes) {
        if (!attributes.hasOwnProperty(attr)) continue;
        api.scene[attr] = attributes[attr];
    }
    scenes[api.scene.name] = api;
    return api;
}

function createScene() {
    const scene = new THREE.Scene();
    const api = {};
    Object.assign(api, {
        scene,
        add: (...children) => add(scene, ...children),
        group: (attributes = {}) => getOrCreateGroup(attributes.group || scene, attributes),
        mesh: (attributes = {}) => getOrCreateMesh(attributes.group || scene, attributes),
        instancedMesh: (attributes = {}) => getOrCreateInstancedMesh(attributes.group || scene, attributes),
        line: (attributes = {}) => getOrCreateLine(attributes.group || scene, attributes),
        lineSegments: (attributes = {}) => getOrCreateLineSegments(attributes.group || scene, attributes),
        points: (attributes = {}) => getOrCreatePoints(attributes.group || scene, attributes),
        add_: (children) => {
            add(scene, children);
            return api;
        },
        group_: (attributes = {}) => {
            getOrCreateGroup(attributes.group || scene, attributes);
            return api;
        },
        mesh_: (attributes = {}) => {
            getOrCreateMesh(attributes.group || scene, attributes);
            return api;
        },
        instancedMesh_: (attributes = {}) => {
            getOrCreateInstancedMesh(attributes.group || scene, attributes);
            return api;
        },
        line_: (attributes = {}) => {
            getOrCreateLine(attributes.group || scene, attributes);
            return api;
        },
        lineSegments_: (attributes = {}) => {
            getOrCreateLineSegments(attributes.group || scene, attributes);
            return api;
        },
        points_: (attributes = {}) => {
            getOrCreatePoints(attributes.group || scene, attributes);
            return api;
        },
        lights: (camera, options) => {
            lights.init(scene, camera, options);
            return api;
        },
        lights_: () => {
            return lights;
        },
        hasLights: () => {
            return !!(scene.camLight || scene.sunLight || scene.ambLight || scene.hemiLight);
        },
        world: (options) => {
            world.init(scene, options);
            return api;
        },
        world_: () => {
            return world;
        },
        axesHelper: (size) => {
            scene.add(new THREE.AxesHelper(size || (window.innerHeight / 2)));
            return api;
        },
        child: (index = 0) => scene.children[index],
    });
    return api;
}

const getOrCreateGroup = (scene, attributes = {}) => {
    const {name} = attributes;
    let group = groups[name];
    if (!name || !group) {
        group = new THREE.Group();
    }
    addChild(scene, group);
    setObject3DAttrs(group, attributes);
    groups[group.name] = group;
    return group;
}

const getOrCreateMesh = (scene, attributes = {}) => {
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
    addChild(scene, mesh);
    setMeshAttrs(mesh, attributes);
    if (mesh.name) {
        namedMeshes[mesh.name] = mesh;
    }
    return mesh;
}

const getOrCreateInstancedMesh = (scene, attributes) => {
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
    addChild(scene, mesh);
    setMeshAttrs(mesh, attributes);
    if (mesh.name) {
        namedInstancedMeshes[mesh.name] = mesh;
    }
    return mesh;
}

const getOrCreateLine = (scene, attributes) => {
    const {name} = attributes;
    let line = namedLines[name];
    if (!name || !line) {
        line = new THREE.Line();
        lines.push(line);
    }
    addChild(scene, line);
    setObject3DAttrs(line, attributes);
    if (line.name) {
        namedLines[line.name] = line;
    }
    return line;
}

const getOrCreateLineSegments = (scene, attributes) => {
    const {name} = attributes;
    let line = namedLineSegments[name];
    if (!name || !line) {
        line = new THREE.LineSegments();
        lineSegments.push(line);
    }
    addChild(scene, line);
    setObject3DAttrs(line, attributes);
    if (line.name) {
        namedLineSegments[line.name] = line;
    }
    return line;
}

const getOrCreatePoints = (scene, attributes) => {
    const {name} = attributes;
    let point = namedPoints[name];
    if (!name || !point) {
        point = new THREE.Points();
        points.push(point);
    }
    addChild(scene, point);
    setObject3DAttrs(point, attributes);
    if (point.name) {
        namedPoints[point.name] = point;
    }
    return point;
}

const addChild = (scene, child) => {
    if (child.parent !== scene) {
        add(scene, child);
    }
}

const add = (scene, ...children) => {
    scene.add(...children);
    return children.length === 1 ? children[0] : children;
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
        if (mesh.geometry instanceof geoms.ConvexGeometryCompat && !mesh.geometry.parameters.boxUV) {
            applyBoxUV(mesh);
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

const applyBoxUV = (mesh) => {
    const transformMatrix = mesh.matrix.clone().invert();
    geoms.applyBoxUV(mesh.geometry, transformMatrix);
    mesh.geometry.parameters.boxUV = true;
}

export {
    scenes, groups, meshes, namedMeshes, instancedMeshes, namedInstancedMeshes,
    lines, namedLines, lineSegments, namedLineSegments, points, namedPoints,
    getOrCreateScene, createScene,
    getOrCreateGroup, getOrCreateMesh, getOrCreateInstancedMesh, getOrCreateLine, getOrCreateLineSegments, getOrCreatePoints,
};