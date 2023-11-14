import Output from "../output.js";
import Source from "../hydra-source.js";

class HydraUniform
{
    static all = {};

    static get(name, group = 'default') {
        return this.all[group] ? this.all[group][name] : null;
    }

    constructor(name, value, cb, group) {
        this._value = value;
        this.name = name;
        this.cb = cb;
        if (group) {
            if (typeof HydraUniform.all[group] === 'undefined') HydraUniform.all[group] = {};
            if (typeof(HydraUniform.all[group][name]) !== 'undefined') {
                delete HydraUniform.all[group][name];
            }
            HydraUniform.all[group][name] = this;
        }
    }

    get value() {
        if (this.cb) {
            this._value = this.cb.call(this);
        }
        return this._value;
    }

    static wrapUniforms(uniforms) {
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
                acc[key] = new HydraUniform(key, null, ()=>func(null, props()));
            }
            else if (acc[key] instanceof Output || acc[key] instanceof Source) {
                const o = acc[key];
                acc[key] = new HydraUniform(key, null, ()=>o.getTexture());
            }
            else if (typeof acc[key].value === 'undefined') acc[key] = { value: acc[key] }
            return acc;
        }, {});
    }
}

export { HydraUniform };