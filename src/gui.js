import * as lightsLib from "./three/lights.js";
import * as worldLib from "./three/world.js";

const guis = {};

const create = async (name = "hydra") => {
    await loadScript("https://unpkg.com/dat.gui");
    patchDat();
    if (!guis[name]) {
        const gui = new dat.GUI({ name, hideable: false });
        gui.useLocalStorage = true;
        guis[name] = gui;
    }
    return guis[name];
}

const addFolder = (gui, name, settings, setupFn) => {
    gui.remember(settings);
    try {
        const folder = gui.addFolder(name);
        if (setupFn) {
            setupFn(folder, settings);
        }
    }
    catch (e) {
        console.log(e.message);
    }
    return settings;
}

const lights = async (scene, defaults = {}) => {
    const group = scene.getLights();
    return addFolder(await create(), "lights",
        Object.assign({}, lightsLib.defaults, defaults),
        (folder, settings) => {
            const update = () => { updateLights(scene, settings) }
            folder.add(settings, 'intensity', 0, 10, 0.1).onChange(update);
            folder.addColor(settings, 'camColor').onChange(update);
            folder.add(settings, 'camIntensity', 0, 1, 0.1).onChange(update);
            folder.addColor(settings, 'sunColor').onChange(update);
            folder.add(settings, 'sunIntensity', 0, 1, 0.1).onChange(update);
            folder.add(settings, 'sunEle', 0, 90, 1);
            folder.add(settings, 'sunAzi', 0, 180, 1);
            folder.addColor(settings, 'ambColor').onChange(update);
            folder.add(settings, 'ambIntensity', 0, 1, 0.1).onChange(update);
            folder.addColor(settings, 'groundColor').onChange(update);
            folder.addColor(settings, 'skyColor').onChange(update);
            folder.add(settings, 'hemiIntensity', 0, 1, 0.1).onChange(update);
        }
    );
}

const updateLights = (scene, settings) => {
    lightsLib.update(scene, scene.getLights(), settings);
}

const world = async (scene, defaults = {}) => {
    const group = scene.getWorld();
    const settings = addFolder(await create(), "world",
        Object.assign({}, worldLib.defaults, { fogColor: scene.background || 0xffffff }, defaults),
        (folder, settings) => {
            const update = () => { updateWorld(scene, settings) }
            folder.add(settings, 'skyDome').onChange(update);
            folder.addColor(settings, 'skyDomeColor').onChange(update);
            folder.add(settings, 'sun').onChange(update);
            folder.add(settings, 'ground').onChange(update);
            folder.addColor(settings, 'groundColor').onChange(update);
            folder.add(settings, 'fog').onChange(update);
            folder.addColor(settings, 'fogColor').onChange(update);
        }
    );
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

export { create, addFolder, lights, world }