import * as THREE from "three";
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import * as geoms from "./gm";
import * as mats from "./mt";

let sky, sun, ground;

const init = (scene, options = {}) => {
    options = Object.assign({
        skyDome: false,
        skyDomeGeom: 'SphereGeometry',
        skyDomeMat: 'worldPosGradientY',
        skyDomeColor: 0x0077ff,
        sun: false,
        ground: true,
        fog: true,
    }, options);
    if (options.hasOwnProperty('skyDome')) {
        createSkyDome(scene, options);
    }
    if (options.hasOwnProperty('sun')) {
        createSun(scene, options);
    }
    if (options.hasOwnProperty('ground')) {
        createGround(scene, options);
    }
    if (options.hasOwnProperty('fog') && options.fog) {
        createFog(scene, options);
    }
    return scene.api;
}

const createSkyDome = (scene, options) => {
    let geom, mat;
    if (options.skyDomeGeom && options.skyDomeGeom.isBufferGeometry) {
        geom = options.skyDomeGeom;
    }
    else {
        if (options.skyDomeGeom === 'Sky') {
            sky = new Sky();
            sky.scale.setScalar(options.far);
            scene.add(sky);
            if (options.sun) {
                const sunPos = geoms.posFromEleAzi(options.sunElevetion || 2, options.sunAzimuth || 180);
                sky.material.uniforms.sunPosition.value.copy(sunPos);
                return;
            }
        }
        switch (options.skyDomeGeom) {
            case 'BoxGeometry':
                geom = new THREE.BoxGeometry( options.far / 2, options.far / 2, options.far / 2 );
                break;
            case 'SphereGeometry':
            default:
                geom = new THREE.SphereGeometry( options.far / 3 * 2, 32, 15 );
                break;
        }
    }
    const matOptions = Object.assign({
        side: THREE.BackSide
    }, options.matOptions || {});
    if (!options.skyDomeMat || options.skyDomeMat === 'worldPosGradientY') {
        const topColor = new THREE.Color(options.skyDomeColor);
        const bottomColor = new THREE.Color(options.groundColor);
        const matUniforms = Object.assign({
            topColor: topColor,
            bottomColor: bottomColor,
        }, options.matUniforms || {});
        mat = mats.worldPosGradientY(matOptions, matUniforms);
    }
    else {
        const color = new THREE.Color(options.skyDomeColor);
        const matOptions2 = Object.assign({
            color: color
        }, matOptions);
        mat = mats[options.skyDomeMat](matOptions2, {});
    }
    sky = new THREE.Mesh(geom, mat);
    sky.visible = options.skyDome;
    scene.add(sky);
}

const createSun = (scene, options) => {
    if (options.skyDomeGeom !== 'Sky') {
        const geom = new THREE.SphereGeometry(100);
        const mat = new THREE.MeshBasicMaterial({color: new THREE.Color(0xffffff)});
        sun = new THREE.Mesh(geom, mat);
        sun.visible = options.sun;
        const sunPos = geoms.posFromEleAzi(options.sunElevetion, options.sunAzimuth, options.far/2);
        sun.position.copy(sunPos);
        scene.add(sun);
    }
}

const createGround = (scene, options) => {
    const size = options.far * 2;
    const segments = (options.groundSegments || 1) + 1;
    const geom = new THREE.PlaneGeometry( size, size, segments-1, segments-1 );
    geom.rotateX(-Math.PI / 2);
    let relief;
    if (options.groundRelief) {
        const vertices = geom.attributes.position.array;
        relief = generateRelief(segments, segments, options.groundNoise, options.groundNoiseF, options.groundNoiseZ);
        for ( let i = 0, j = 0, l = vertices.length; i < l; i ++, j += 3 ) {
            vertices[j + 1] = relief[i] * options.groundRelief;
        }
    }
    const mat = mats.meshLambert({
        color: options.groundColor,
        wireframe: options.groundWireframe || false,
        map: options.groundMap,
    }, {});
    ground = new THREE.Mesh( geom, mat );
    ground.visible = options.ground;
    ground.receiveShadow = true;
    ground.userData.relief = relief;
    scene.add(ground);
}

function generateRelief(width, height, noiseType, noiseF, noiseZ) {
    const size = width * height, data = new Float32Array( size );
    for ( let i = 0; i < size; i++) {
        const x = i % width, y = ~~(i / width);
        // todo: check dt is loaded
        data[i] = nse.get3(noiseType, x * noiseF, y * noiseF, noiseZ);
    }
    return data;
}

function getReliefAt(vec) {
    if (ground && ground.userData.relief) {
        const wSegments = ground.geometry.parameters.widthSegments;
        const hSegments = ground.geometry.parameters.heightSegments;
        const x = ((vec.x + ground.geometry.parameters.width / 2) / ground.geometry.parameters.width) * wSegments;
        const z = ((vec.y + ground.geometry.parameters.height / 2) / ground.geometry.parameters.height) * hSegments;
        const x1 = Math.floor(x);
        const z1 = Math.floor(z);
        const x2 = Math.ceil(x);
        const z2 = Math.ceil(z);
        const a = new THREE.Vector3(x1, ground.userData.relief[z1 * (wSegments+1) + x1], z1);
        const b = new THREE.Vector3(x2, ground.userData.relief[z1 * (wSegments+1) + x2], z1);
        const c = new THREE.Vector3(x2, ground.userData.relief[z2 * (wSegments+1) + x2], z2);
        const d = new THREE.Vector3(x1, ground.userData.relief[z2 * (wSegments+1) + x1], z2);
        let edge1, edge2, planeNormal, D;
        if (geoms.signedArea(new THREE.Vector2(b.x, b.z), new THREE.Vector2(d.x, d.z), new THREE.Vector2(x, z)) > 0) {
            edge1 = new THREE.Vector3().subVectors(b, a);
            edge2 = new THREE.Vector3().subVectors(d, a);
            planeNormal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
            D = -planeNormal.dot(a);
        }
        else {
            edge1 = new THREE.Vector3().subVectors(b, c);
            edge2 = new THREE.Vector3().subVectors(d, c);
            planeNormal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
            D = -planeNormal.dot(c);
        }
        return (-planeNormal.x * x - planeNormal.z * z - D) / planeNormal.y;
    }
    return 0;
}

const createFog = (scene, options) => {
    const fogColor = options.fogColor || (options.hemisphere ? options.hemisphere.groundColor : scene.background);
    scene.fog = new THREE.Fog(fogColor, options.near, options.far);
}

const update = (scene, options) => {
    if (options.hasOwnProperty('skyDome')) {
        scene.remove(sky);
        createSkyDome(scene, options);
    }
    if (options.hasOwnProperty('sun')) {
        sun.visible = options.sun;
    }
    if (options.hasOwnProperty('ground')) {
        ground.visible = options.ground;
    }
    if (options.hasOwnProperty('groundWireframe')) {
        ground.material.wireframe = options.groundWireframe;
    }
    if (options.hasOwnProperty('fog')) {
        if (options.fog) {
            createFog(scene, options);
        }
        else {
            scene.fog = null;
        }
    }
}

export {sky, sun, ground, init, update, getReliefAt}