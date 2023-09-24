import * as THREE from "three";
import {Pass, FullScreenQuad} from "three/examples/jsm/postprocessing/Pass.js";

class HydraUniform extends THREE.Uniform
{
    static all = {};

    static update() {
        for (let group in this.all) {
            for (let key in this.all[group]) {
                this.all[group][key].update();
            }
        }
    }

    static get(name, group = 'default') {
        return this.all[group] ? this.all[group][name] : null;
    }

    static destroy(name, group = 'default') {
        if (this.all[group] && typeof(this.all[group][name]) !== 'undefined') {
            delete this.all[group][name];
        }
    }

    static destroyGroup(group) {
        delete this.all[group];
    }

    constructor(name, value, cb, group = 'default') {
        super(value);
        this.name = name;
        this.cb = cb;
        if (typeof HydraUniform.all[group] === 'undefined') HydraUniform.all[group] = {};
        HydraUniform.destroy(name, group);
        HydraUniform.all[group][name] = this;
    }

    update() {
        this.value = this.cb.call(this);
    }
}

class HydraRenderPass extends Pass {
    constructor( options ) {

        super();

        this.options = options;
        this.scene = new THREE.Scene();
        this.camera = options.camera;

        this.renderTarget = options.renderTarget || null;
        this.overrideMaterial = options.overrideMaterial || null;

        this.clearColor = options.clearColor || null;
        this.clearAlpha = options.clearAlpha || null;

        this.clearDepth = false;
        this._oldClearColor = new THREE.Color();

        this.material = this.createMaterial(options);
        this.object = this.createObject(options.primitive, options.geometry, this.material);
        this.scene.add(this.object);

        this.textureID = options.textureID || 'prevBuffer';

    }

    createMaterial(options) {
        const uniforms = Object.assign({
            prevBuffer: { value: null },
        }, this.getUniforms(options.uniforms));
        const blending = this.getBlend(options.blendMode);
        return new THREE.ShaderMaterial({
            fragmentShader: options.frag,
            vertexShader: options.vert,
            glslVersion: options.version,
            // todo: add support for viewport?
            // viewport: typeof(options.viewport.x) !== 'undefined' ? {
            //   x: options.viewport.x * this.fbos[0].width,
            //   y: options.viewport.y * this.fbos[0].height,
            //   width: options.viewport.w * this.fbos[0].width,
            //   height: options.viewport.h * this.fbos[0].height,
            // } : {},
            // todo: add support for side parameter
            // cull: {
            //   enable: !!options.geometry,
            //   face: 'back'
            // },
            uniforms,
            blending,
            linewidth: options.linewidth,
            transparent: true,
        });
    }

    createObject(primitive, geometry, material) {
        // todo: add support vectorizeText?
        // if (geometry.positions && (geometry.edges || geometry.cells)) {
        //   attributes.position = []; // todo: should be Float32Array
        //   geometry.positions.map((v, k) => attributes.position.push(v[0], v[1], 0));
        //   elements = geometry.edges ? geometry.edges : geometry.cells;
        //   primitive = geometry.edges ? 'lines' : 'triangles';
        // }
        switch (primitive) {
            case 'points':
                return new THREE.Points(geometry, material);
            case 'line loop':
            case 'lineloop':
                return new THREE.LineLoop(geometry, material);
            case 'line strip':
            case 'linestrip':
                return new THREE.Line(geometry, material);
            case 'lines':
                return new THREE.LineSegments(geometry, material);
            default:
                const quad = new FullScreenQuad(material);
                if (geometry) {
                    quad._mesh.geometry.dispose();
                    quad._mesh.geometry = geometry;
                }
                return quad._mesh;
        }
    }

    getUniforms(uniforms) {
        HydraUniform.destroyGroup(this.options.label);
        const props = () => {
            return {
                time: HydraUniform.get('time', 'hydra').value,
                bpm: HydraUniform.get('bpm', 'hydra').value,
            };
        };
        return Object.keys(uniforms).reduce((acc, key) => {
            acc[key] = typeof(uniforms[key]) === 'string' ? parseFloat(uniforms[key]) : uniforms[key];
            if (typeof acc[key] === 'function') {
                const func = acc[key];
                acc[key] = new HydraUniform(key, null, ()=>func(null, props()), this.options.label);
            }
            else if (typeof acc[key].value === 'undefined') acc[key] = { value: acc[key] }
            return acc;
        }, {});
    }

    getBlend(blendMode) {
        switch (blendMode) {
            case 'custom':
                // todo: implement CustomBlending
                return THREE.CustomBlending;
            case 'subtractive':
                return THREE.SubtractiveBlending;
            case 'multiply':
                return THREE.MultiplyBlending;
            case 'add':
                return THREE.AdditiveBlending;
            case 'alpha':
            case 'normal':
                return THREE.NormalBlending;
            default:
                return THREE.NoBlending;
        }
    }

    render( renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */ ) {

        if ( this.material.uniforms[ this.textureID ] ) {

            this.material.uniforms[ this.textureID ].value = readBuffer.texture;

        }

        const oldAutoClear = renderer.autoClear;
        renderer.autoClear = false;

        let oldClearAlpha, oldOverrideMaterial;

        if ( this.overrideMaterial !== null ) {

            oldOverrideMaterial = this.scene.overrideMaterial;

            this.scene.overrideMaterial = this.overrideMaterial;

        }

        if ( this.clearColor !== null ) {

            renderer.getClearColor( this._oldClearColor );
            renderer.setClearColor( this.clearColor );

        }

        if ( this.clearAlpha !== null ) {

            oldClearAlpha = renderer.getClearAlpha();
            renderer.setClearAlpha( this.clearAlpha );

        }

        if ( this.clearDepth == true ) {

            renderer.clearDepth();

        }

        renderer.setRenderTarget( this.renderToScreen ? null : (this.renderTarget ? this.renderTarget : writeBuffer) );

        if ( this.clear === true ) {

            // TODO: Avoid using autoClear properties, see https://github.com/mrdoob/three.js/pull/15571#issuecomment-465669600
            renderer.clear( renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil );

        }

        renderer.render( this.scene, this.camera );

        // restore

        if ( this.clearColor !== null ) {

            renderer.setClearColor( this._oldClearColor );

        }

        if ( this.clearAlpha !== null ) {

            renderer.setClearAlpha( oldClearAlpha );

        }

        if ( this.overrideMaterial !== null ) {

            this.scene.overrideMaterial = oldOverrideMaterial;

        }

        renderer.autoClear = oldAutoClear;

    }
}

export { HydraUniform, HydraRenderPass };