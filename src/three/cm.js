import * as THREE from "three";

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
        type: 'simplex',
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
            (box.max.x - box.min.x) ? nse.get2(opts.type, opts.x, i, box.min.x, box.max.x, opts.scale) : obj.position.x,
            (box.max.y - box.min.y) ? nse.get2(opts.type, opts.y, i, box.min.y, box.max.y, opts.scale) : obj.position.y,
            (box.max.z - box.min.z) ? nse.get2(opts.type, opts.z, i, box.min.z, box.max.z, opts.scale) : obj.position.z,
        );
        if (children[i].userData.body) {
            children[i].userData.body.position.set(obj.position.x, obj.position.y, obj.position.z);
        }
    }
}

const random = (rnd, object, box) => {
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
const lookAt = (object, offset) => {
    if (object instanceof THREE.Box3) {
        lookAtBox(object, offset);
    }
    else {
        console.error("lookAt object not implemented");
        // const box = new THREE.Box3().setFromObject(object);
        // lookAtBox(box, offset);
    }
}

// const lookAtBox = (box, offset) => {
//     offset || (offset = new THREE.Vector3());
//     if (three.camera instanceof THREE.PerspectiveCamera) {
//         const size = box.getSize(new THREE.Vector3());
//         const boundingSphereRadius = size.length();
//         const cameraDistance = boundingSphereRadius / Math.sin((three.camera.fov / 2) * Math.PI / 180);
//         three.camera.position.set(0, 0, cameraDistance);
//         three.camera.near = boundingSphereRadius - boundingSphereRadius * 0.5;
//         three.camera.far = boundingSphereRadius + boundingSphereRadius * 0.5;
//         three.camera.updateProjectionMatrix();
//         three.camera.lookAt(object.position);
//     }
//     else if (three.camera instanceof THREE.OrthographicCamera) {
//         const size = box.getSize(new THREE.Vector3());
//         const center = box.getCenter(new THREE.Vector3());
//         const paddingPercent = 0.05;
//         const maxSize = Math.max(size.x, size.y, size.z);
//         const paddedSize = maxSize * (1 + paddingPercent);
//         // todo: handle window resize
//         const hRatio = width >= height ? 1 : width / height;
//         const vRatio = height >= width ? 1 : height / width;
//         three.camera.left = -paddedSize * hRatio / 2 + offset.x;
//         three.camera.right = paddedSize * hRatio / 2 + offset.x;
//         three.camera.top = paddedSize * vRatio / 2 + offset.y;
//         three.camera.bottom = -paddedSize * vRatio / 2 + offset.y;
//         three.camera.updateProjectionMatrix();
//         // todo: quickfix
//         if (lights.sunLight) {
//             lights.sunLight.shadow.camera.left = three.camera.left;
//             lights.sunLight.shadow.camera.right = three.camera.right;
//             lights.sunLight.shadow.camera.top = three.camera.top;
//             lights.sunLight.shadow.camera.bottom = three.camera.bottom;
//             lights.sunLight.shadow.camera.updateProjectionMatrix();
//         }
//         three.lookAt(center);
//     }
// }

export { size, line, stack, circle, random, noise, lookAt }