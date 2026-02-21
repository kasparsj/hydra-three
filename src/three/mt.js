import * as THREE from "three";
import GlslSource from "../glsl-source.js";
import {processFunction} from "../generator-factory.js";
import { getRuntime } from "./runtime.js";
import worldPosVert from "../shaders/worldPos.vert";
import worldPosGradientYFrag from "../shaders/worldPosGradientY.frag";
import pointsVert from "../shaders/points.vert";
import linesVert from "../shaders/lines.vert";
import linestripVert from "../shaders/linestrip.vert";
import lineloopVert from "../shaders/lineloop.vert";
import dotsFrag from "../shaders/dots.frag";
import squaresFrag from "../shaders/squares.frag";
import linesFrag from "../shaders/lines.frag";
import linestripFrag from "../shaders/linestrip.frag";
import lineloopFrag from "../shaders/lineloop.frag";

const basicProps = {
    isMeshBasicMaterial: true,
    color: new THREE.Color( 0xffffff ),
};

const phongProps = {
    isMeshPhongMaterial: true,
    color: new THREE.Color( 0xffffff ),
    specular: new THREE.Color( 0x111111 ),
    shininess: 30,
};

const lambertProps = {
    isMeshLambertMaterial: true,
    color: new THREE.Color( 0xffffff ),
};

const meshBasic = (options) => new THREE.MeshBasicMaterial(options);
const meshPhong = (options) => new THREE.MeshPhongMaterial(options);
const meshStandard = (options) => new THREE.MeshStandardMaterial(options);
const meshLambert = (options) => new THREE.MeshLambertMaterial(options);
const lineBasic = (options) => new THREE.LineBasicMaterial(options);
const points = (options) => new THREE.PointsMaterial(options);

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

const hydra = (source, properties = {}) => {
    let options = source;
    if (source instanceof GlslSource) {
        // todo: compile only single pass?
        Object.assign(source._material, properties);
        options = source.compile()[0];
        properties = options.material;
    }
    const {
        isMeshBasicMaterial, isMeshLambertMaterial, isMeshPhongMaterial,
        blendMode, color, specular, shininess, map, displacementMap, displacementScale,
        ...props
    } = properties;
    const material = new THREE.ShaderMaterial(Object.assign({
        glslVersion: options.frag.version,
        //flatShading: !options.frag.useNormal,
        defines: {
            FLAT_SHADED: !options.frag.useNormal,
            USE_UV: options.frag.useUV,
            USE_ALPHAHASH: true,
            USE_DISPLACEMENTMAP: !!displacementMap,
            // USE_COLOR: !options.frag.useUV, // vColor
        },
        uniforms: options.uniforms,
        lights: typeof options.lights !== 'undefined' ? !!options.lights : !!(isMeshLambertMaterial || isMeshPhongMaterial),
        depthTest: options.frag.useNormal,
        blending: getBlend(blendMode),
        // todo: add support for viewport?
        // viewport: typeof(options.viewport.x) !== 'undefined' ? {
        //   x: options.viewport.x * this.fbos[0].width,
        //   y: options.viewport.y * this.fbos[0].height,
        //   width: options.viewport.w * this.fbos[0].width,
        //   height: options.viewport.h * this.fbos[0].height,
        // } : {},
        // todo: not sure about this
        // transparent: true,
    }, props));
    if (isMeshBasicMaterial || isMeshLambertMaterial || isMeshPhongMaterial) {
        material.color = color;
        material.map = map;
        material.displacementMap = displacementMap;
        material.displacementScale = displacementScale;
        if (isMeshBasicMaterial) {
            material.isMeshBasicMaterial = true;
            material.vertexShader = THREE.ShaderLib.basic.vertexShader;
            material.fragmentShader = THREE.ShaderLib.basic.fragmentShader;
            material.uniforms = Object.assign({}, THREE.UniformsUtils.clone(THREE.ShaderLib.basic.uniforms), material.uniforms);
            material.defines.FLAT_SHADED = true;
        }
        else {
            if (isMeshLambertMaterial) {
                material.isMeshLambertMaterial = true;
                material.vertexShader = THREE.ShaderLib.lambert.vertexShader;
                material.fragmentShader = THREE.ShaderLib.lambert.fragmentShader;
                material.uniforms = Object.assign({}, THREE.UniformsUtils.clone(THREE.ShaderLib.lambert.uniforms), material.uniforms);
            }
            else {
                material.isMeshPhongMaterial = true;
                material.vertexShader = THREE.ShaderLib.phong.vertexShader;
                material.fragmentShader = THREE.ShaderLib.phong.fragmentShader;
                material.uniforms = Object.assign({}, THREE.UniformsUtils.clone(THREE.ShaderLib.phong.uniforms), material.uniforms);
                material.specular = specular;
                material.shininess = shininess;
            }
        }
        material.vertexShader = options.vert.header[1] + options.vert.funcs + material.vertexShader;
        material.fragmentShader = options.frag.header[1] + options.frag.funcs + material.fragmentShader;
        if (isMeshBasicMaterial) {
            material.vertexShader = material.vertexShader.replace('\n\t#include <uv_vertex>\n\t#include <color_vertex>\n\t#include <morphcolor_vertex>\n\t#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )\n\t\t#include <beginnormal_vertex>\n\t\t#include <morphnormal_vertex>\n\t\t#include <skinbase_vertex>\n\t\t#include <skinnormal_vertex>\n\t\t#include <defaultnormal_vertex>\n\t#endif\n\t#include <begin_vertex>\n\t#include <morphtarget_vertex>\n\t#include <skinning_vertex>\n\t#include <project_vertex>', options.vert.main);
        }
        else {
            material.vertexShader = material.vertexShader.replace('\n\t#include <uv_vertex>\n\t#include <color_vertex>\n\t#include <morphcolor_vertex>\n\t#include <beginnormal_vertex>\n\t#include <morphnormal_vertex>\n\t#include <skinbase_vertex>\n\t#include <skinnormal_vertex>\n\t#include <defaultnormal_vertex>\n\t#include <normal_vertex>\n\t#include <begin_vertex>\n\t#include <morphtarget_vertex>\n\t#include <skinning_vertex>\n\t#include <displacementmap_vertex>\n\t#include <project_vertex>', options.vert.main);
        }
        material.fragmentShader = material.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );', options.frag.main.replace('gl_FragColor', 'vec4 diffuseColor') + 'diffuseColor *= vec4( diffuse, opacity );');
    }
    else {
        material.vertexShader = `
            ${Array.isArray(options.vert.header) ? options.vert.header.join("\n") : options.vert.header}
            ${options.vert.funcs}
            void main() {
                ${options.vert.main}
            }
            `;
        material.fragmentShader = `
            ${options.frag.header.join("\n")}
            ${options.frag.funcs}
            void main() {
                ${options.frag.main}
            }
            `;
    }
    return material;
}

const createRuntimeSource = (name, fn, args) => {
    return getRuntime().generator.createSource(name, fn, args);
}

const getGenerator = (name) => {
    const generator = getRuntime().generator && getRuntime().generator.generators
        ? getRuntime().generator.generators[name]
        : null;
    if (typeof generator !== 'function') {
        throw new Error(`Generator "${name}" is not available.`);
    }
    return generator;
}

const gradientDefault = () => getGenerator('gradient')();
const noiseDefault = (scale) => getGenerator('noise')(scale);
const solidDefault = (...args) => getGenerator('solid')(...args);

const dotsFunc = processFunction({
    name: 'dots',
    type: 'vert',
    inputs: [
        {name: 'pos', type: 'vec3', default: () => gradientDefault()},
        {name: 'size', type: 'float', default: 10},
        {name: 'color', type: 'vec4', default: 1},
        {name: 'fade', type: 'float', default: 0.025},
    ],
    glsl: dotsFrag,
    vert: pointsVert,
    primitive: 'points',
    blendMode: true,
});
const dots = (pos, size, color, fade, options = {}) => {
    return hydra(createRuntimeSource('dots', dotsFunc, [pos, size, color, fade]), Object.assign({
        transparent: true,
        blendMode: 'normal',
    }, options));
}

const squaresFunc = processFunction({
    name: 'squares',
    type: 'vert',
    inputs: [
        {name: 'pos', type: 'vec3', default: () => gradientDefault()},
        {name: 'size', type: 'float', default: 10},
        {name: 'color', type: 'vec4', default: 1},
        {name: 'fade', type: 'float', default: 0.025},
    ],
    glsl: squaresFrag,
    vert: pointsVert,
    primitive: 'points',
    blendMode: true,
});
const squares = (pos, size, color, fade, options = {}) => {
    return hydra(createRuntimeSource('squares', squaresFunc, [pos, size, color, fade]), Object.assign({
        transparent: true,
        blendMode: 'normal',
    }, options));
}

const linesFunc = processFunction({
    name: 'lines',
    type: 'vert',
    inputs: [
        {name: 'pos', type: 'vec3', default: () => gradientDefault()},
        {name: 'color', type: 'vec4', default: 1},
    ],
    glsl: linesFrag,
    vert: linesVert,
    primitive: 'lines',
});
const lines = (pos, color, options = {}) => {
    return hydra(createRuntimeSource('lines', linesFunc, [pos, color]), Object.assign({
        transparent: true,
        blendMode: 'normal',
    }, options));
}

const linestripFunc = processFunction({
    name: 'linestrip',
    type: 'vert',
    inputs: [
        {name: 'pos', type: 'vec3', default: () => solidDefault(noiseDefault(1).x, noiseDefault(2).y, noiseDefault(3).z).map(-1,1,0,1)},
        {name: 'color', type: 'vec4', default: 1},
    ],
    glsl: linestripFrag,
    vert: linestripVert,
    primitive: 'line strip',
});
const linestrip = (pos, color, options = {}) => {
    return hydra(createRuntimeSource('linestrip', linestripFunc, [pos, color]), Object.assign({
        transparent: true,
        blendMode: 'normal',
    }, options));
}

const lineloopFunc = processFunction({
    name: 'lineloop',
    type: 'vert',
    inputs: [
        {name: 'pos', type: 'vec3', default: () => solidDefault(noiseDefault(1).x, noiseDefault(2).y, noiseDefault(3).z).map(-1,1,0,1)},
        {name: 'color', type: 'vec4', default: 1},
    ],
    glsl: lineloopFrag,
    vert: lineloopVert,
    primitive: 'line loop',
});
const lineloop = (pos, color, options = {}) => {
    return hydra(createRuntimeSource('lineloop', lineloopFunc, [pos, color]), Object.assign({
        transparent: true,
        blendMode: 'normal',
    }, options));
}

const textFunc = processFunction({
    name: 'text',
    type: 'vert',
    inputs: [
        {name: 'color', type: 'vec4', default: 1},
    ],
    glsl: `return color;`,
    useUV: false,
    useNormal: false,
});
const text = (color, options = {}) => {
    return hydra(createRuntimeSource('text', textFunc, [color]), options);
}

const meshFunc = processFunction({
    name: 'mesh',
    type: 'vert',
    inputs: [
        {name: 'color', type: 'vec4', default: 1},
    ],
    glsl: `return color;`,
    primitive: 'triangles',
});
const mesh = (color, options = {}) => {
    return hydra(createRuntimeSource('mesh', meshFunc, [color]), options);
}

const getBlend = (blendMode) => {
    switch (blendMode) {
        case 'custom':
            // todo: implement CustomBlending
            return THREE.CustomBlending;
        case 'subtractive':
            return THREE.SubtractiveBlending;
        case 'multiply':
            return THREE.MultiplyBlending;
        case 'add':
            return THREE.AdditiveBlending;
        case 'alpha':
        case 'normal':
            return THREE.NormalBlending;
        default:
            return THREE.NoBlending;
    }
}

export {
    basicProps, phongProps, lambertProps,
    meshBasic, meshPhong, meshLambert, meshStandard,
    lineBasic, points,
    worldPosGradientY,
    hydra,
    dots, squares, lines, linestrip, lineloop, text, mesh,
    getBlend,
};
