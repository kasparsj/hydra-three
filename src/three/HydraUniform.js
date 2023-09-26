import * as THREE from "three";

export default class HydraUniform extends THREE.Uniform
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