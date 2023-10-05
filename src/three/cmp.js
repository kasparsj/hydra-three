import * as THREE from "three";
import * as nse from "./noise.js";
import * as rnd from "./rnd.js";
import * as lights from "./lights.js";

const size = (object, precise = true) => {
    let box = new THREE.Box3().setFromObject(object, precise);
    return box.getSize(new THREE.Vector3());
}

const line = (object, x  = 0, gap = 0) => {
    const children = object.children;
    for ( let i = 0, l = children.length; i < l; i ++ ) {
        const obj = children[i];
        let width = size(obj).x;
        obj.position.x = width / 2 + x;
        x += width + gap;
    }
}

const stack = (object, y = 0, gap = 0) => {
    const children = object.children;
    for ( let i = 0, l = children.length; i < l; i ++ ) {
        const obj = children[i];
        let height = size(obj).y;
        obj.position.y = height / 2 + y;
        y += height + gap;
    }
}

const circle = (object, radius = 100) => {
    const children = object.children;
    for ( let i = 0, l = children.length; i < l; i ++ ) {
        const obj = children[i];
        obj.position.x = Math.cos(i * (2 * Math.PI/children.length)) * radius;
        obj.position.z = Math.sin(i * (2 * Math.PI/children.length)) * radius;
    }
}

const noise = (object, box, opts = {}) => {
    opts = Object.assign({
        type: 'improved',
        scale: 1,
        x: Math.random(10000),
        y: Math.random(10000),
        z: Math.random(10000),
    }, opts);
    box || (box = new THREE.Box3(new THREE.Vector3(-50, 0, -50), new THREE.Vector3(50, 0, 50)));
    const children = object.children;
    for ( let i = 0, l = children.length; i < l; i ++ ) {
        const obj = children[i];
        // todo: check dt is loaded?
        obj.position.set(
            (box.max.x - box.min.x) ? nse.get2(opts.x, i, box.min.x, box.max.x, opts.scale, opts.type) : obj.position.x,
            (box.max.y - box.min.y) ? nse.get2(opts.y, i, box.min.y, box.max.y, opts.scale, opts.type) : obj.position.y,
            (box.max.z - box.min.z) ? nse.get2(opts.z, i, box.min.z, box.max.z, opts.scale, opts.type) : obj.position.z,
        );
        if (children[i].userData.body) {
            children[i].userData.body.position.set(obj.position.x, obj.position.y, obj.position.z);
        }
    }
}

const random = (object, box) => {
    box || (box = new THREE.Box3(new THREE.Vector3(-50, 0, -50), new THREE.Vector3(50, 0, 50)));
    const children = object.children;
    for ( let i = 0, l = children.length; i < l; i ++ ) {
        const obj = children[i];
        obj.position.set(
            (box.max.x - box.min.x) ? rnd.num(box.min.x, box.max.x) : obj.position.x,
            (box.max.y - box.min.y) ? rnd.num(box.min.y, box.max.y) : obj.position.y,
            (box.max.z - box.min.z) ? rnd.num(box.min.z, box.max.z) : obj.position.z,
        );
        if (children[i].userData.body) {
            children[i].userData.body.position.set(obj.position.x, obj.position.y, obj.position.z);
        }
    }
}

const lookAt = (scene, object, offset) => {
    if (object instanceof THREE.Box3) {
        lookAtBox(scene, object, offset);
    }
    else {
        const box = new THREE.Box3().setFromObject(object);
        lookAtBox(scene, box, offset);
    }
}

function lookAtBox(scene, box, offset) {
    const camera = scene.getCamera();
    offset || (offset = new THREE.Vector3());
    if (camera instanceof THREE.PerspectiveCamera) {
        const size = box.getSize(new THREE.Vector3());
        const boundingSphereRadius = size.length();
        const cameraDistance = boundingSphereRadius / Math.sin((camera.fov / 2) * Math.PI / 180);
        camera.position.set(0, 0, cameraDistance);
        camera.near = boundingSphereRadius - boundingSphereRadius * 0.5;
        camera.far = boundingSphereRadius + boundingSphereRadius * 0.5;
        camera.updateProjectionMatrix();
        // todo: fix
        //camera.lookAt(object.position);
    }
    else if (camera instanceof THREE.OrthographicCamera) {
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const paddingPercent = 0.05;
        const maxSize = Math.max(size.x, size.y, size.z);
        const paddedSize = maxSize * (1 + paddingPercent);
        // todo: handle window resize
        const hRatio = width >= height ? 1 : width / height;
        const vRatio = height >= width ? 1 : height / width;
        camera.left = -paddedSize * hRatio / 2 + offset.x;
        camera.right = paddedSize * hRatio / 2 + offset.x;
        camera.top = paddedSize * vRatio / 2 + offset.y;
        camera.bottom = -paddedSize * vRatio / 2 + offset.y;
        camera.updateProjectionMatrix();
        const sunLight = lights.find(scene, lights.sunLightName);
        if (sunLight) {
            sunLight.shadow.camera.left = camera.left;
            sunLight.shadow.camera.right = camera.right;
            sunLight.shadow.camera.top = camera.top;
            sunLight.shadow.camera.bottom = camera.bottom;
            sunLight.shadow.camera.updateProjectionMatrix();
        }
        scene.lookAt(center);
    }
}

export { size, line, stack, circle, random, noise, lookAt }