import * as lightsLib from "./three/lights.js";
import * as worldLib from "./three/world.js";
import { loadScript } from "./lib/load-script.js";

const guis = {};
const DAT_GUI_URLS = [
    "/vendor/dat.gui.min.js",
    "https://unpkg.com/dat.gui",
];

const createNoopController = () => ({
    onChange() { return this; },
    listen() { return this; },
    name() { return this; },
    min() { return this; },
    max() { return this; },
    step() { return this; },
    updateDisplay() { return this; },
});

const createNoopFolder = () => ({
    add() { return createNoopController(); },
    addColor() { return createNoopController(); },
    addFolder() { return createNoopFolder(); },
    open() { return this; },
    close() { return this; },
});

const createFallbackDatApi = () => {
    class FallbackGUI {
        constructor() {
            this.useLocalStorage = false;
        }

        remember() {}

        add() {
            return createNoopController();
        }

        addColor() {
            return createNoopController();
        }

        addFolder() {
            return createNoopFolder();
        }

        destroy() {}
    }

    return {
        GUI: FallbackGUI,
        controllers: {
            NumberControllerBox: {
                prototype: {
                    updateDisplay() {
                        return this;
                    },
                },
            },
        },
        dom: {
            dom: {
                isActive() {
                    return false;
                },
            },
        },
        __hydraFallback: true,
    };
};

const tryLoadDatScript = async (url) => {
    try {
        if (typeof window.loadScript === "function") {
            await window.loadScript(url);
        } else {
            await loadScript(url);
        }
        return !!window.dat;
    } catch (_error) {
        return false;
    }
};

const ensureDat = async () => {
    if (window.dat) {
        return window.dat;
    }
    for (let i = 0; i < DAT_GUI_URLS.length; i++) {
        const loaded = await tryLoadDatScript(DAT_GUI_URLS[i]);
        if (loaded) {
            return window.dat;
        }
    }
    if (!window.dat) {
        window.dat = createFallbackDatApi();
        console.warn(
            "[hydra-three] dat.gui script unavailable; using fallback no-op GUI.",
        );
    }
    return window.dat;
}

const init = async () => {
    const datApi = await ensureDat();
    patchDat(datApi);
}

const create = async (name = "hydra-three") => {
    if (!guis[name]) {
        const datApi = window.dat || (await ensureDat());
        patchDat(datApi);
        const gui = guis[name] || (new datApi.GUI({ name, hideable: false }));
        gui.useLocalStorage = true;
        guis[name] = gui;
    }
    return guis[name];
}

const addFolder = async (name, settings, setupFn, gui) => {
    if (!gui) {
        gui = await create();
    }
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

const lights = (scene, camera, defaults = {}) => {
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

const world = (scene, defaults = {}) => {
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

function patchDat(datApi = window.dat) {
    if (!datApi || datApi.__hydraPatched) return;
    const updateDisplay = datApi.controllers.NumberControllerBox.prototype.updateDisplay;
    datApi.controllers.NumberControllerBox.prototype.updateDisplay = function() {
        if (datApi.dom.dom.isActive(this.__input)) return this;
        return updateDisplay.call(this);
    }
    datApi.__hydraPatched = true;
}

const hideSaveRow = (nameOrGui) => {
    // todo: nameOrGui
    if (document.getElementsByClassName("save-row").length) {
        document.getElementsByClassName("save-row")[0].style = 'display:none';
    }
}

export { init, create, addFolder, lights, world, hideSaveRow }
