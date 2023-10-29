import * as lightsLib from "./three/lights.js";
import * as worldLib from "./three/world.js";

const guis = {};

const create = async (name = "hydra") => {
    if (!dat.GUI) {
        await loadScript("https://unpkg.com/dat.gui");
        patchDat();
    }
    if (!guis[name]) {
        const gui = new dat.GUI({ name, hideable: false });
        gui.useLocalStorage = true;
        guis[name] = gui;
    }
    return guis[name];
}

const addFolder = (name, settings, setupFn, gui) => {
    const _addFolder = (gui) => {
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
    }
    if (!gui) {
        create().then(_addFolder);
    }
    else {
        _addFolder(gui);
    }
    return settings;
}

// todo: better pass scene
const lights = async (scene, camera, defaults = {}) => {
    const settings = Object.assign({}, lightsLib.defaults, defaults);
    settings.cam = !!(settings.cam || settings.all);
    settings.sun = !!(settings.sun || settings.all);
    settings.amb = !!(settings.amb || settings.all);
    settings.hemi = !!(settings.hemi || settings.all);
    delete settings.all;
    addFolder("lights",
        settings,
        (folder, settings) => {
            const update = () => { updateLights(scene, camera, settings) }
            folder.add(settings, 'intensity', 0, 10, 0.1).onChange(update);
            folder.add(settings, 'cam').onChange(update);
            folder.addColor(settings, 'camColor').onChange(update);
            folder.add(settings, 'camIntensity', 0, 1, 0.1).onChange(update);
            folder.add(settings, 'sun').onChange(update);
            folder.addColor(settings, 'sunColor').onChange(update);
            folder.add(settings, 'sunIntensity', 0, 1, 0.1).onChange(update);
            folder.add(settings, 'sunEle', 0, 90, 1).onChange(update);
            folder.add(settings, 'sunAzi', 0, 180, 1).onChange(update);
            folder.add(settings, 'sunHelper').onChange(update);
            folder.add(settings, 'amb').onChange(update);
            folder.addColor(settings, 'ambColor').onChange(update);
            folder.add(settings, 'ambIntensity', 0, 1, 0.1).onChange(update);
            folder.addColor(settings, 'groundColor').onChange(update);
            folder.addColor(settings, 'skyColor').onChange(update);
            folder.add(settings, 'hemi').onChange(update);
            folder.add(settings, 'hemiIntensity', 0, 1, 0.1).onChange(update);
        }
    );
    return settings;
}

const updateLights = (scene, camera, settings) => {
    lightsLib.update(scene, camera, settings);
}

const world = async (scene, defaults = {}) => {
    const settings = Object.assign({}, worldLib.defaults, { fogColor: scene.background || 0xffffff }, defaults);
    addFolder("world",
        settings,
        (folder, settings) => {
            const update = () => { updateWorld(scene, settings) }
            folder.add(settings, 'skyDome').onChange(update);
            folder.addColor(settings, 'skyDomeColor').onChange(update);
            folder.add(settings, 'sun').onChange(update);
            folder.add(settings, 'ground').onChange(update);
            folder.add(settings, 'groundSize', 1, 2000).onChange(update);
            folder.add(settings, 'groundMat', ['meshBasic', 'meshLambert', 'meshPhong']).onChange(update);
            folder.addColor(settings, 'groundColor').onChange(update);
            folder.add(settings, 'fog').onChange(update);
            folder.addColor(settings, 'fogColor').onChange(update);
            folder.add(settings, 'near', 0, 10, 0.1).onChange(update);
            folder.add(settings, 'far', 1, 1000, 1).onChange(update);
        }
    );
    return settings;
}

const updateWorld = (scene, settings) => {
    worldLib.update(scene, settings);
}

function patchDat() {
    const updateDisplay = dat.controllers.NumberControllerBox.prototype.updateDisplay;
    dat.controllers.NumberControllerBox.prototype.updateDisplay = function() {
        if (dat.dom.dom.isActive(this.__input)) return this;
        return updateDisplay.call(this);
    }
}

export { create, addFolder, lights, world }