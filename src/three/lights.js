import * as THREE from "three";
import * as gm from "./gm.js";

const groupName = "__lights"
const camLightName = "__camLight";
const sunLightName = "__sunLight";
const sunLightHelperName = "__sunLightHelper";
const ambLightName = "__ambLight";
const hemiLightName = "__hemiLight";

const defaults = {
    intensity: 1,
    cam: false,
    camColor: 0xFFFFFF,
    camIntensity: 0.5,
    sun: false,
    sunColor: 0xFFFFFF,
    sunIntensity: 0.7,
    sunEle: 45,
    sunAzi: 90,
    sunHelper: false,
    amb: false,
    ambColor: 0x404040,
    ambIntensity: 0.1,
    hemi: false,
    groundColor: 0xFFFFFF,
    skyColor: 0x0077ff,
    hemiIntensity: 0.5
};

const find = (scene, lightName) => {
    let group = scene;
    if (scene.isScene) {
        group = scene.group({name: groupName});
    }
    return group.find({name: lightName})[0];
}

const update = (scene, camera, options = {}) => {
    const group = scene.group({name: groupName});
    options = Object.assign({}, defaults, options);

    const camOptions = Object.assign({
        color: options.camColor,
        intensity: options.camIntensity,
        visible: !!(options.camera || options.cam || options.all),
    }, typeof options.camera === 'object' ? options.camera : {});
    camOptions.intensity = camOptions.intensity * options.intensity;
    updateCam(group, camera, camOptions);

    const sunOptions = Object.assign({
        color: options.sunColor,
        intensity: options.sunIntensity,
        elevation: options.sunEle,
        azimuth: options.sunAzi,
        helper: options.sunHelper,
        visible: !!(options.sun || options.all)
    }, typeof options.sun === 'object' ? options.sun : {});
    sunOptions.intensity = sunOptions.intensity * options.intensity;
    updateSun(group, camera, sunOptions);

    const ambOptions = Object.assign({
        color: options.ambColor,
        intensity: options.ambIntensity,
        visible: !!(options.ambient || options.amb || options.all),
    }, typeof options.ambient === 'object' ? options.ambient : {});
    ambOptions.intensity = ambOptions.intensity * options.intensity;
    updateAmbient(group, ambOptions);

    const hemiOptions = Object.assign({
        groundColor: options.groundColor,
        skyColor: options.skyColor,
        intensity: options.hemiIntensity,
        visible: !!(options.hemisphere || options.hemi || options.all),
    }, typeof options.hemisphere || options.hemi || {});
    hemiOptions.intensity = hemiOptions.intensity * options.intensity;
    updateHemi(group, hemiOptions);
}

const updateCam = (group, camera, options) => {
    // todo: store in groups userData?
    let camLight = group.find({name: camLightName})[0];
    if (options.visible) {
        if (!camLight) camLight = new THREE.PointLight();
        camLight.name = camLightName;
        if (options.color) {
            options.color = new THREE.Color(options.color);
        }
        // todo: should set only if defined
        Object.assign(camLight, options);
        // todo: fix added twice
        camera.add(camLight);
        group.add(camera);
    }
    else {
        group.remove(camera);
        camera.remove(camLight);
    }
}

const updateSun = (group, camera, options) => {
    let sunLight = group.find({name: sunLightName})[0];
    let helper = group.find({name: sunLightHelperName})[0];
    if (options.visible) {
        if (!sunLight) sunLight = new THREE.DirectionalLight();
        if (options.color) {
            sunLight.color = new THREE.Color(options.color);
        }
        ["intensity"].forEach((prop) => {
            if (options.hasOwnProperty(prop)) {
                sunLight[prop] = options[prop];
            }
        });
        const sunPos = gm.posFromEleAzi(options.elevation, options.azimuth, camera.far/2);
        sunLight.position.copy(sunPos);
        sunLight.name = sunLightName;
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 512;
        sunLight.shadow.mapSize.height = 512;
        sunLight.shadow.camera.near = camera.near; // default
        sunLight.shadow.camera.far = camera.far; // default
        if (camera.isOrthographicCamera) {
            sunLight.shadow.camera.left = camera.left;
            sunLight.shadow.camera.right = camera.right;
            sunLight.shadow.camera.top = camera.top;
            sunLight.shadow.camera.bottom = camera.bottom;
        }
        else {
            sunLight.shadow.camera.left = -1;
            sunLight.shadow.camera.right = 1;
            sunLight.shadow.camera.top = 1;
            sunLight.shadow.camera.bottom = -1;
        }
        sunLight.target.position.set(0, 0, 0);
        group.add(sunLight);
        group.add(sunLight.target);
        if (options.helper) {
            if (!helper) helper = new THREE.DirectionalLightHelper(sunLight);
            helper.name = sunLightHelperName;
            group.add(helper);
        }
        else if (helper) {
            group.remove(helper);
        }
    }
    else if (sunLight) {
        group.remove(sunLight);
        group.remove(sunLight.target);
        if (helper) {
            group.remove(helper);
        }
    }
}

const updateAmbient = (group, options) => {
    let ambLight = group.find({name: ambLightName})[0];
    if (options.visible) {
        if (!ambLight) ambLight = new THREE.AmbientLight();
        ambLight.name = ambLightName;
        if (options.color) {
            ambLight.color = new THREE.Color(options.color);
        }
        ["intensity"].forEach((prop) => {
            if (options.hasOwnProperty(prop)) {
                ambLight[prop] = options[prop];
            }
        });
        group.add(ambLight);
    }
    else if (ambLight) {
        group.remove(ambLight);
    }
}

const updateHemi = (group, options) => {
    let hemiLight = group.find({name: hemiLightName})[0];
    if (!hemiLight) hemiLight = new THREE.HemisphereLight();
    hemiLight.name = hemiLightName;
    if (options.skyColor) {
        hemiLight.color = new THREE.Color(options.skyColor);
    }
    if (options.groundColor) {
        hemiLight.groundColor = new THREE.Color(options.groundColor);
    }
    ["intensity", "visible"].forEach((prop) => {
        if (options.hasOwnProperty(prop)) {
            hemiLight[prop] = options[prop];
        }
    });
    hemiLight.position.set( 0, 50, 0 );
    group.add(hemiLight);
}

export {
    groupName, camLightName, sunLightName, sunLightHelperName, ambLightName, hemiLightName, defaults,
    find, update,
}
