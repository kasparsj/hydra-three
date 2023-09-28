import * as THREE from "three";
import glsl from "glslify";

const worldPosVert = glsl("./shaders/worldPos.vert");
const worldPosGradientYFrag = glsl("./shaders/worldPosGradientY.frag");
const meshBasic = (options) => new THREE.MeshBasicMaterial(options);
const meshPhong = (options) => new THREE.MeshPhongMaterial(options);
const meshStandard = (options) => new THREE.MeshStandardMaterial(options);
const meshLambert = (options) => new THREE.MeshLambertMaterial(options);
const lineBasic = (options) => new THREE.LineBasicMaterial(options);

const worldPosGradientY = (options, uniOptions) => {
    const uniforms = {
        topColor: { value: uniOptions.topColor },
        bottomColor: { value: uniOptions.bottomColor },
        offset: { value: uniOptions.offset || 33 },
        exponent: { value: uniOptions.exponent || 0.6 }
    };
    const parameters = Object.assign({
        uniforms: uniforms,
        vertexShader: worldPosVert,
        fragmentShader: worldPosGradientYFrag,
    }, options);
    return new THREE.ShaderMaterial(parameters);
}

export {
    meshBasic, meshPhong, meshLambert, meshStandard,
    lineBasic,
    worldPosGradientY,
};
