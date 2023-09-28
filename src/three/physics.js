import * as CANNON from "cannon-es";
import * as THREE from "three";
import {Cylinder2Geometry} from "./gm";
import {size} from "./cm";

const clock = new THREE.Clock();
let world;

const init = (options = {}) => {
    world = new CANNON.World()
    world.gravity.set(0, options.gravity || -9.82, 0)
    world.solver.iterations = options.iterations || 10;
    if (options.broadphase) {
        world.broadphase = new CANNON.NaiveBroadphase();
    }
    if (options.allowSleep) {
        world.allowSleep = true
    }
    createGround(options);
}

const createGround = (options = {}) => {
    const planeShape = new CANNON.Plane()
    const planeBody = new CANNON.Body({ type: CANNON.BODY_TYPES.STATIC })
    planeBody.addShape(planeShape)
    planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2)
    return world.addBody(planeBody)
}

const add = (mesh, options = {}) => {
    options = Object.assign({mass: 1}, options);
    let shape;
    if (mesh.geometry instanceof THREE.BoxGeometry) {
        const boxSize = size(mesh);
        shape = new CANNON.Box(new CANNON.Vec3(boxSize.x / 2, boxSize.y / 2, boxSize.z / 2));
    }
    else if (mesh.geometry instanceof THREE.CylinderGeometry || mesh.geometry instanceof Cylinder2Geometry) {
        const segments = mesh.geometry instanceof THREE.CylinderGeometry
            ? mesh.geometry.parameters.radialSegments
            : Math.max(mesh.geometry.parameters.topSegments, mesh.geometry.parameters.bottomSegments);
        shape = new CANNON.Cylinder(
            mesh.geometry.parameters.radiusTop,
            mesh.geometry.parameters.radiusBottom,
            mesh.geometry.parameters.height,
            segments
        );
    }
    else {
        shape = createTrimesh(mesh.geometry)
    }
    const body = new CANNON.Body(options);
    body.addShape(shape)
    body.position.copy(mesh.position);
    body.quaternion.copy(mesh.quaternion);
    body.mesh = mesh;
    mesh.userData.body = body;
    return world.addBody(body);
}

const update = () => {
    if (world) {
        //world.fixedStep();
        const delta = Math.min(clock.getDelta(), 0.1)
        world.step(delta);
        for (let i=0; i<world.bodies.length; i++) {
            const body = world.bodies[i];
            if (body.mesh) {
                body.mesh.position.copy(body.position);
                body.mesh.quaternion.copy(body.quaternion);
            }
        }
    }
}

function createTrimesh(geometry) {
    const vertices = geometry.attributes.position.array
    const indices = Object.keys(vertices).map(Number)
    return new CANNON.Trimesh(vertices, indices)
}

export {init, add, update};