import * as THREE from "three";
import {Pass} from "three/examples/jsm/postprocessing/Pass.js";
import {Color} from "three";

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
    constructor( scene, camera, renderTarget = null, overrideMaterial = null, clearColor = null, clearAlpha = null ) {

        super();

        this.scene = scene;
        this.camera = camera;

        this.renderTarget = renderTarget;
        this.overrideMaterial = overrideMaterial;

        this.clearColor = clearColor;
        this.clearAlpha = clearAlpha;

        this.clearDepth = false;
        this.needsSwap = true;
        this._oldClearColor = new Color();

    }

    render( renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */ ) {

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

        renderer.setRenderTarget( this.renderToScreen ? null : (this.renderTarget ? this.renderTarget : readBuffer) );

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