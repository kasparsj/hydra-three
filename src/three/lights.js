import * as geoms from "./gm";

let camLight, sunLight, ambLight, hemiLight;

const init = (scene, camera, options = {}) => {
    options = Object.assign({
        intensityMul: 1,
    }, options);
    if (options.hasOwnProperty('camera') || options.hasOwnProperty("cam")) {
        const camOptions = Object.assign({
            color: options.camColor || 0xFFFFFF,
            intensity: options.camIntensity || 0.5,
        }, typeof options.camera === 'object' ? options.camera : {});
        camOptions.intensity = camOptions.intensity * options.intensityMul;
        initCam(scene, camera, camOptions);
    }
    if (options.hasOwnProperty('sun')) {
        const sunOptions = Object.assign({
            color: options.sunColor || 0xFFFFFF,
            intensity: options.sunIntensity || 0.7,
            elevation: options.sunEle || 45,
            azimuth: options.sunAzi || 90,
        }, typeof options.sun === 'object' ? options.sun : {});
        sunOptions.intensity = sunOptions.intensity * options.intensityMul;
        initSun(scene, camera, sunOptions);
    }
    if (options.hasOwnProperty('ambient') || options.hasOwnProperty("amb")) {
        const ambOptions = Object.assign({
            color: options.ambColor || 0x404040,
            intensity: options.ambIntensity || 0.1,
        }, typeof options.ambient === 'object' ? options.ambient : {});
        ambOptions.intensity = ambOptions.intensity * options.intensityMul;
        initAmbient(scene, ambOptions);
    }
    if (options.hasOwnProperty('hemisphere') || options.hasOwnProperty("hemi")) {
        const hemiOptions = Object.assign({
            color: options.hemiColor || 0xFFFFFF,
            intensity: options.hemiIntensity || 0.5,
        }, typeof options.hemisphere === 'object' ? options.hemisphere : {});
        hemiOptions.intensity = hemiOptions.intensity * options.intensityMul;
        initHemi(scene, hemiOptions);
    }
}

const initCam = (scene, camera, options) => {
    camLight || (camLight = new THREE.PointLight( options.color, options.intensity));
    if (options.hasOwnProperty('visible')) {
        camLight.visible = options.visible;
    }
    camera.add(camLight);
    scene.add(camera);
}

const initSun = (scene, camera, options) => {
    sunLight = new THREE.DirectionalLight(options.color, options.intensity);
    if (options.hasOwnProperty('visible')) {
        sunLight.visible = options.visible;
    }
    const sunPos = geoms.posFromEleAzi(options.elevation, options.azimuth, camera.far/2);
    sunLight.position.copy(sunPos);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 512;
    sunLight.shadow.mapSize.height = 512;
    sunLight.shadow.camera.near = camera.near; // default
    sunLight.shadow.camera.far = camera.far; // default
    sunLight.shadow.camera.left = -512;
    sunLight.shadow.camera.right = 512;
    sunLight.shadow.camera.top = 512;
    sunLight.shadow.camera.bottom = -512;
    sunLight.target.position.set(0, 0, 0);
    scene.add(sunLight);
    scene.add(sunLight.target);
}

const initAmbient = (scene, options) => {
    ambLight = new THREE.AmbientLight( options.color, options.intensity );
    if (options.hasOwnProperty('visible')) {
        ambLight.visible = options.visible;
    }
    scene.add(ambLight);
}

const initHemi = (scene, options) => {
    hemiLight = new THREE.HemisphereLight( options.skyColor, options.groundColor, options.intensity );
    if (options.hasOwnProperty('visible')) {
        hemiLight.visible = options.visible;
    }
    hemiLight.position.set( 0, 50, 0 );
    scene.add(hemiLight);
}

export {
    camLight, sunLight, ambLight, hemiLight,
    init, initAmbient, initSun, initCam, initHemi,
}