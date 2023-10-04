import * as worldLib from "./three/world.js";

const all = {};

const create = async (name, settings, setupFn) => {
    await loadScript("https://unpkg.com/dat.gui");
    patchDat();
    if (!all[name]) {
        const gui = new dat.GUI({ name, hideable: false });
        gui.useLocalStorage = true;
        gui.remember(settings);
        if (setupFn) {
            setupFn(gui, settings);
        }
        all[name] = gui;
    }
    return settings;
}

const lights = (scene) => {
    return create("lights", {

    }, (gui, settings) => {

    });
}

const updateLights = (scene, group) => {

}

const world = (scene, defaults = {}) => {
    const group = scene.getWorld();
    const settings = create("world", Object.assign({
        skyDome: false,
        skyDomeColor: 0x0077ff,
        sun: false,
        ground: true,
        groundColor: 0xffffff,
        fog: true,
        fogColor: scene.background || 0xffffff,
    }, defaults), (gui, settings) => {
        const update = () => { updateWorld(scene, settings) }
        gui.add(settings, 'skyDome').onChange(update);
        gui.addColor(settings, 'skyDomeColor').onChange(update);
        gui.add(settings, 'sun').onChange(update);
        gui.add(settings, 'ground').onChange(update);
        gui.addColor(settings, 'groundColor').onChange(update);
        gui.add(settings, 'fog').onChange(update);
        gui.addColor(settings, 'fogColor').onChange(update);
    });
    if (!group) {
        updateWorld(scene, settings);
    }
    return settings;
}

const updateWorld = (scene, settings) => {
    worldLib.update(scene, scene.getWorld(), settings);
}

function patchDat() {
    const updateDisplay = dat.controllers.NumberControllerBox.prototype.updateDisplay;
    dat.controllers.NumberControllerBox.prototype.updateDisplay = function() {
        if (dat.dom.dom.isActive(this.__input)) return this;
        return updateDisplay.call(this);
    }
}

export { all, create, lights, world }