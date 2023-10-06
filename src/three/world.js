import * as THREE from "three";
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import * as gm from "./gm";
import * as mt from "./mt";
import * as nse from "./noise.js";

const groupName = '__world';
const skyName = "__sky";
const sunName = "__sun";
const groundName = "__ground";

const defaults = {
    skyDome: false,
    skyDomeGeom: 'SphereGeometry',
    skyDomeMat: 'worldPosGradientY',
    skyDomeColor: 0x0077ff,
    sun: false,
    ground: true,
    groundSize: 20,
    groundColor: 0xffffff,
    groundMat: 'meshLambert',
    groundNoise: "improved",
    fog: true,
    fogColor: 0xffffff,
    near: 0.1,
    far: 10,
};

const updateSkyDome = (group, options) => {
    let sky = group.find({name: skyName})[0];
    if (sky) {
        group.remove(sky);
    }
    if (options.skyDome) {
        let geom, mat;
        if (options.skyDomeGeom && options.skyDomeGeom.isBufferGeometry) {
            geom = options.skyDomeGeom;
        }
        else {
            if (options.skyDomeGeom === 'Sky') {
                sky = new Sky();
                sky.name = skyName;
                sky.scale.setScalar(options.far);
                group.add(sky);
                if (options.sun) {
                    const sunPos = gm.posFromEleAzi(options.sunElevetion || 2, options.sunAzimuth || 180);
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
            mat = mt.worldPosGradientY(matOptions, matUniforms);
        }
        else {
            const color = new THREE.Color(options.skyDomeColor);
            const matOptions2 = Object.assign({
                color: color
            }, matOptions);
            mat = mt[options.skyDomeMat](matOptions2, {});
        }
        sky = new THREE.Mesh(geom, mat);
        sky.name = skyName;
        group.add(sky);
    }
}

const updateSun = (group, options) => {
    let sun = group.find({name: sunName})[0];
    if (options.sun) {
        if (!sun) sun = sun = new THREE.Mesh();
        if (options.skyDomeGeom !== 'Sky') {
            const geom = new THREE.SphereGeometry(100);
            const mat = new THREE.MeshBasicMaterial({color: new THREE.Color(0xffffff)});
            const sunPos = gm.posFromEleAzi(options.sunElevetion, options.sunAzimuth, options.far/2);
            sun.name = sunName;
            sun.geometry = geom;
            sun.material = mat;
            sun.position.copy(sunPos);
            group.add(sun);
        }
    }
    if (sun) {
        sun.visible = options.sun;
    }
}

const updateGround = (group, options) => {
    let ground = group.find({name: groundName})[0];
    if (options.ground) {
        if (!ground) ground = ground = new THREE.Mesh();
        const segments = (options.groundSegments || 1) + 1;
        let geom = ground.geometry;
        if (!geom || !geom.parameters || geom.parameters.width !== options.groundSize) {
            geom = new THREE.PlaneGeometry( options.groundSize, options.groundSize, segments-1, segments-1 );
            geom.rotateX(-Math.PI / 2);
        }
        let relief;
        if (options.groundRelief) {
            const vertices = geom.attributes.position.array;
            relief = generateRelief(segments, segments, options.groundNoiseF, options.groundNoiseZ, options.groundNoise);
            for ( let i = 0, j = 0, l = vertices.length; i < l; i ++, j += 3 ) {
                vertices[j + 1] = relief[i] * options.groundRelief;
            }
        }
        let mat = options.groundMat;
        if (!mat.isMaterial) {
            mat = mt[mat]({
                color: options.groundColor,
                wireframe: options.groundWireframe || false,
                map: options.groundMap || null,
            }, {});
        }
        ground.name = groundName;
        ground.geometry = geom;
        ground.material = mat;
        ground.receiveShadow = true;
        ground.userData.relief = relief;
        group.add(ground);
    }
    if (ground) {
        ground.visible = options.ground;
    }
}

function generateRelief(width, height, noiseF, noiseZ, noiseType = "improved") {
    const size = width * height, data = new Float32Array( size );
    for ( let i = 0; i < size; i++) {
        const x = i % width, y = ~~(i / width);
        // todo: check dt is loaded
        data[i] = nse.get3(x * noiseF, y * noiseF, noiseZ, noiseType);
    }
    return data;
}

function getReliefAt(scene, vec) {
    let ground = group.find({name: groundName})[0];
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
        if (gm.signedArea(new THREE.Vector2(b.x, b.z), new THREE.Vector2(d.x, d.z), new THREE.Vector2(x, z)) > 0) {
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

const updateFog = (scene, options) => {
    if (options.fog) {
        scene.fog = new THREE.Fog(options.fogColor, options.near, options.far);
    }
    else if (scene.fog) {
        scene.fog = null;
    }
}

const update = (scene, options) => {
    const group = scene.group({name: groupName});
    options = Object.assign({}, defaults, {
        fogColor: scene.background || defaults.fogColor,
        groundSize: options.far ? options.far * 2 : defaults.groundSize,
    }, options);
    updateSkyDome(group, options);
    updateSun(group, options);
    updateGround(group, options);
    updateFog(scene, options);
}

export {groupName, defaults, update, getReliefAt}