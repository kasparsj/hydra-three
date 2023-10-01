import * as THREE from "three";
import Output from "../output.js";

class HydraUniform
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

    static wrapUniforms(uniforms, group) {
        HydraUniform.destroyGroup(group);
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
                acc[key] = new HydraUniform(key, null, ()=>func(null, props()), group);
            }
            else if (acc[key] instanceof Output) {
                const o = acc[key];
                acc[key] = new HydraUniform(key, null, ()=>o.getTexture(), group);
            }
            else if (typeof acc[key].value === 'undefined') acc[key] = { value: acc[key] }
            return acc;
        }, {});
    }
}
export { HydraUniform, HydraArrayTextureUniform }