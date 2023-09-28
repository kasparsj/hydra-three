import * as THREE from "three";
import {HydraOrbitControls} from "../three/HydraOrbitControls.js";

const camera = function(eye, target, options = {}) {
    if (!Array.isArray(eye)) eye = eye ? [eye] : null;
    else if (!eye.length) eye = null;
    if (!Array.isArray(target)) target = target ? [target] : [0,0,0];
    else if (!target.length) target = [0,0,0];
    options = Object.assign({
        fov: 50,
        aspect: 1,
        near: 0.1,
        far: 10,
        left: -1,
        right: 1,
        top: 1,
        bottom: -1,
    }, options);
    switch (options.type) {
        case 'perspective':
            this._camera = new THREE.PerspectiveCamera( options.fov, options.aspect, options.near, options.far);
            eye || (eye = [0,0,3]);
            break;
        case 'ortho':
        case 'orthographic':
        default:
            this._camera = new THREE.OrthographicCamera(options.left, options.right, options.top, options.bottom, options.near, options.far);
            eye || (eye = [0,0,1]);
            break;
    }
    this._camera.position.set(...eye);
    this._camera.lookAt(...target);
    this._camera.updateProjectionMatrix();
    for (let attr in options) {
        if (this._camera.hasOwnProperty(attr)) {
            this._camera[attr] = options[attr];
            delete options[attr];
        }
    }
    if (options.controls) {
        options = Object.assign({
            domElement: document.body,
            enableZoom: true,
        }, options || {});
        if (this._controls) {
            this._controls.dispose();
        }
        this._controls = new HydraOrbitControls(this._camera, options.domElement);
        for (let attr in options) {
            if (this._controls.hasOwnProperty(attr)) {
                this._controls[attr] = options[attr];
                delete options[attr];
            }
        }
    }
    return this;
}

const perspective = function(eye = [0,0,3], target = [0,0,0], options = {}) {
    options = Object.assign({type: 'perspective'}, options);
    return this.camera(eye, target, options);
}

const ortho = function(eye = [0,0,1], target = [0,0,0], options = {}) {
    options = Object.assign({type: 'ortho'}, options);
    return this.camera(eye, target, options);
}

export { camera, perspective, ortho }