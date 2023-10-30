import * as THREE from "three";
import {HydraOrbitControls} from "../three/HydraOrbitControls.js";

const cameraMixin = {
    camera(eye, target, options = {}) {
        if (!Array.isArray(eye)) eye = eye ? [eye] : null;
        else if (!eye.length) eye = null;
        if (!Array.isArray(target)) target = target ? [target] : [0,0,0];
        else if (!target.length) target = [0,0,0];
        options = Object.assign({
            fov: 50,
            aspect: 1,
            near: 0.1,
            far: 100,
            left: -1,
            right: 1,
            top: 1,
            bottom: -1,
        }, options);
        switch (options.type) {
            case 'perspective':
                if (!this._camera || !(this._camera instanceof THREE.PerspectiveCamera)) {
                    this._camera = new THREE.PerspectiveCamera();
                }
                eye || (eye = [0,0,3]);
                break;
            case 'ortho':
            case 'orthographic':
            default:
                if (!this._camera || !(this._camera instanceof THREE.OrthographicCamera)) {
                    this._camera = new THREE.OrthographicCamera();
                }
                eye || (eye = [0,0,1]);
                break;
        }
        this._camera.position.set(...eye);
        this._camera.lookAt(...target);
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
            if (this._camera.userData.controls) {
                this._camera.userData.controls.dispose();
            }
            this._camera.userData.controls = new HydraOrbitControls(this._camera, options.domElement);
            for (let attr in options) {
                if (this._camera.userData.controls.hasOwnProperty(attr)) {
                    this._camera.userData.controls[attr] = options[attr];
                    delete options[attr];
                }
            }
        }
        this._camera.updateProjectionMatrix();
        return this;
    },

    perspective(eye = [0,0,3], target = [0,0,0], options = {}) {
        options = Object.assign({type: 'perspective'}, options);
        return this.camera(eye, target, options);
    },

    ortho(eye = [0,0,1], target = [0,0,0], options = {}) {
        options = Object.assign({type: 'ortho'}, options);
        return this.camera(eye, target, options);
    }
};

const autoClearMixin = {
    autoClear(amount = 1.0, options = {}) {
        this._autoClear = {
            amount,
            ...options,
        };
        return this;
    },
};

const sourceMixin = {

    init(options) {
        this.defaultOutput = options.defaultOutput;
        this.output = null;
        this._fx = null;
        this._viewport = {};
    },

    out(_output, options = {}) {
        const output = _output || this.defaultOutput
        this.output = output
        const glsl = this.compile()
        try {
            output._set(glsl, options)
        } catch (error) {
            console.log('shader could not compile', error)
        }
        return this
    },

    tex(_output, options = {}) {
        if (!this.output) {
            this.out(_output);
        }
        return this.output.renderTexture(options);
    },

    texMat(_output, options = {}) {
        const params = this._material;
        this._material = {};
        const tex = this.tex(_output, options);
        let material;
        if (params.isMeshPhongMaterial) {
            material = new THREE.MeshPhongMaterial(Object.assign(params, {map: tex}));
        }
        else if (params.isMeshLambertMaterial) {
            material = new THREE.MeshLambertMaterial(Object.assign(params, {map: tex}));
        }
        else {
            material = new THREE.MeshBasicMaterial(Object.assign(params, {map: tex}));
        }
        this._material = params;
        return material;
    },

    compile(options = {}) {
        this.passes = []
        this.passes.push(this.createPass(this.createShaderInfo(), options))
        return this.passes
    },

    createShaderInfo() {
        throw "abstract SourceProto._createPass called";
    },

    createPass(shaderInfo, options = {}) {
        throw "abstract SourceProto._createPass called";
    },

    fx(options) {
        this._fx = options;
        return this;
    },

    viewport(x, y, w, h) {
        this._viewport = {x, y, w, h};
        return this;
    }

};

const mixClass = (clazz, ...mixins) => {
    const mixedMixins = Object.assign({}, ...mixins);
    for (const method of Object.getOwnPropertyNames(mixedMixins)) {
        if (!clazz.prototype.hasOwnProperty(method)) {
            clazz.prototype[method] = mixedMixins[method];
        }
    }
}

export { cameraMixin, autoClearMixin, sourceMixin, mixClass }