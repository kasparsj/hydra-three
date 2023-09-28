import * as THREE from "three";
import {Pass, FullScreenQuad} from "three/examples/jsm/postprocessing/Pass.js";
import HydraUniform from "./HydraUniform.js";
import Output from "../output.js";
const createMaterial = (options) => {
    const uniforms = Object.assign({}, {
        prevBuffer: { value: null },
    }, getUniforms(options.uniforms, options.label));
    const properties = options.material;
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
            // USE_COLOR: !options.frag.useUV, // vColor
        },
        uniforms,
        lights: !!options.lights,
        blending: getBlend(blendMode),
        depthTest: options.useNormal,
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
            material.vertexShader = options.vert.header[1] + options.vert.funcs + THREE.ShaderLib.basic.vertexShader;
            material.fragmentShader = options.frag.header[1] + options.frag.funcs + THREE.ShaderLib.basic.fragmentShader;
            material.uniforms = Object.assign({}, THREE.UniformsUtils.clone(THREE.ShaderLib.basic.uniforms), material.uniforms);
            material.vertexShader = material.vertexShader.replace('\n\t#include <uv_vertex>\n\t#include <color_vertex>\n\t#include <morphcolor_vertex>\n\t#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )\n\t\t#include <beginnormal_vertex>\n\t\t#include <morphnormal_vertex>\n\t\t#include <skinbase_vertex>\n\t\t#include <skinnormal_vertex>\n\t\t#include <defaultnormal_vertex>\n\t#endif\n\t#include <begin_vertex>\n\t#include <morphtarget_vertex>\n\t#include <skinning_vertex>\n\t#include <project_vertex>', options.vert.main);
            material.defines.FLAT_SHADED = true;
        }
        else {
            if (!material.lights) {
                console.warn(".lights() must be called for lambert/phong lighting to work");
            }
            if (isMeshLambertMaterial) {
                material.isMeshLambertMaterial = true;
                material.vertexShader = options.vert.header[1] + options.vert.funcs + THREE.ShaderLib.lambert.vertexShader;
                material.fragmentShader = options.frag.header[1] + options.frag.funcs + THREE.ShaderLib.lambert.fragmentShader;
                material.uniforms = Object.assign({}, THREE.UniformsUtils.clone(THREE.ShaderLib.lambert.uniforms), material.uniforms);
            }
            else {
                material.isMeshPhongMaterial = true;
                material.specular = specular;
                material.shininess = shininess;
                material.vertexShader = options.vert.header[1] + options.vert.funcs + THREE.ShaderLib.phong.vertexShader;
                material.fragmentShader = options.frag.header[1] + options.frag.funcs + THREE.ShaderLib.phong.fragmentShader;
                material.uniforms = Object.assign({}, THREE.UniformsUtils.clone(THREE.ShaderLib.phong.uniforms), material.uniforms);
            }
            material.vertexShader = material.vertexShader.replace('\n\t#include <uv_vertex>\n\t#include <color_vertex>\n\t#include <morphcolor_vertex>\n\t#include <beginnormal_vertex>\n\t#include <morphnormal_vertex>\n\t#include <skinbase_vertex>\n\t#include <skinnormal_vertex>\n\t#include <defaultnormal_vertex>\n\t#include <normal_vertex>\n\t#include <begin_vertex>\n\t#include <morphtarget_vertex>\n\t#include <skinning_vertex>\n\t#include <displacementmap_vertex>\n\t#include <project_vertex>', options.vert.main);
        }
        material.fragmentShader = material.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );', options.frag.main.replace('gl_FragColor', 'vec4 diffuseColor') + 'diffuseColor.a *= opacity;');
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

const getUniforms = (uniforms, group) => {
    HydraUniform.destroyGroup(group);
    const props = () => {
        return {
            time: HydraUniform.get('time', 'hydra').value,
            bpm: HydraUniform.get('bpm', 'hydra').value,
        };
    };
    return Object.keys(uniforms).reduce((acc, key) => {
        acc[key] = typeof(uniforms[key]) === 'string' ? parseFloat(uniforms[key]) : uniforms[key];
        if (typeof acc[key] === 'function') {
            const func = acc[key];
            acc[key] = new HydraUniform(key, null, ()=>func(null, props()), group);
        }
        else if (acc[key] instanceof Output) {
            const o = acc[key];
            acc[key] = new HydraUniform(key, null, ()=>o.getTexture(), group);
        }
        else if (typeof acc[key].value === 'undefined') acc[key] = { value: acc[key] }
        return acc;
    }, {});
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

const createLights = (scene, camera, options) => {
    options = Object.assign({
        intensityMul: 1,
    }, options);
    if (options.hasOwnProperty('camera') || options.hasOwnProperty("cam")) {
        const camOptions = Object.assign({
            color: options.camColor || 0xFFFFFF,
            intensity: options.camIntensity || 0.5,
        }, typeof options.camera === 'object' ? options.camera : {});
        camOptions.intensity = camOptions.intensity * options.intensityMul;
        createCamLight(scene, camera, camOptions);
    }
    if (options.hasOwnProperty('sun')) {
        const sunOptions = Object.assign({
            color: options.sunColor || 0xFFFFFF,
            intensity: options.sunIntensity || 0.7,
            elevation: options.sunEle || 45,
            azimuth: options.sunAzi || 90,
        }, typeof options.sun === 'object' ? options.sun : {});
        sunOptions.intensity = sunOptions.intensity * options.intensityMul;
        createSunLight(scene, camera, sunOptions);
    }
    if (options.hasOwnProperty('ambient') || options.hasOwnProperty("amb")) {
        const ambOptions = Object.assign({
            color: options.ambColor || 0x404040,
            intensity: options.ambIntensity || 0.1,
        }, typeof options.ambient === 'object' ? options.ambient : {});
        ambOptions.intensity = ambOptions.intensity * options.intensityMul;
        createAmbientLight(scene, ambOptions);
    }
    if (options.hasOwnProperty('hemisphere') || options.hasOwnProperty("hemi")) {
        const hemiOptions = Object.assign({
            color: options.hemiColor || 0xFFFFFF,
            intensity: options.hemiIntensity || 0.5,
        }, typeof options.hemisphere === 'object' ? options.hemisphere : {});
        hemiOptions.intensity = hemiOptions.intensity * options.intensityMul;
        createHemiLight(scene, hemiOptions);
    }
}

const createCamLight = (scene, camera, options) => {
    const camLight = new THREE.PointLight( options.color, options.intensity);
    if (options.hasOwnProperty('visible')) {
        camLight.visible = options.visible;
    }
    camera.add(camLight);
    scene.add(camera);
}

const createSunLight = (scene, camera, options) => {
    const sunLight = new THREE.DirectionalLight(options.color, options.intensity);
    if (options.hasOwnProperty('visible')) {
        sunLight.visible = options.visible;
    }
    const sunPos = posFromEleAzi(options.elevation, options.azimuth, camera.far/2);
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

const posFromEleAzi = (elevation, azimuth, radius = 1) => {
    const phi = THREE.MathUtils.degToRad( 90 - elevation );
    const theta = THREE.MathUtils.degToRad(azimuth);
    const pos = new THREE.Vector3();
    pos.setFromSphericalCoords( radius, phi, theta );
    return pos;
}

const createAmbientLight = (scene, options) => {
    const ambLight = new THREE.AmbientLight( options.color, options.intensity );
    if (options.hasOwnProperty('visible')) {
        ambLight.visible = options.visible;
    }
    scene.add(ambLight);
}

const createHemiLight = (scene, options) => {
    const hemiLight = new THREE.HemisphereLight( options.skyColor, options.groundColor, options.intensity );
    if (options.hasOwnProperty('visible')) {
        hemiLight.visible = options.visible;
    }
    hemiLight.position.set( 0, 50, 0 );
    scene.add(hemiLight);
}

class HydraPass extends Pass {

    constructor(options) {

        super();

        this.options = options;
        this.renderTarget = options.renderTarget || null;

        this.textureID = options.textureID || 'prevBuffer';

    }

}

class HydraShaderPass extends HydraPass {

    constructor(options) {

        super(options);

        options.material || (options.material = {});
        options.material.depthTest = false;
        this.material = createMaterial(options);

        this.fsQuad = new FullScreenQuad( this.material );
    }

    render( renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */ ) {

        if ( this.material.uniforms[ this.textureID ] ) {

            this.material.uniforms[ this.textureID ].value = readBuffer.texture;

        }

        this.fsQuad.material = this.material;

        if ( this.renderToScreen ) {

            renderer.setRenderTarget( null );
            this.fsQuad.render( renderer );

        } else {

            renderer.setRenderTarget( this.renderTarget ? this.renderTarget : writeBuffer );
            // TODO: Avoid using autoClear properties, see https://github.com/mrdoob/three.js/pull/15571#issuecomment-465669600
            if ( this.clear ) renderer.clear( renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil );
            this.fsQuad.render( renderer );

        }

    }

    dispose() {

        this.material.dispose();

        this.fsQuad.dispose();

    }
}

class HydraRenderPass extends HydraPass {

    constructor( options ) {

        super(options);

        this.material = createMaterial(options);
        this.object = this.createObject(options.primitive, options.geometry, this.material, options.instanced);
        this.camera = options.camera;

        this.scene = new THREE.Scene()
        this.scene.add(this.object);

        if (options.lights) {
            createLights(this.scene, this.camera, options.lights);
        }

        this.overrideMaterial = options.overrideMaterial || null;

        this.clearColor = options.clearColor || null;
        this.clearAlpha = options.clearAlpha || null;

        this.clearDepth = false;
        this._oldClearColor = new THREE.Color();

    }

    createObject(primitive, geometry, material, instanced) {
        // todo: add support vectorizeText?
        // if (geometry.positions && (geometry.edges || geometry.cells)) {
        //   attributes.position = []; // todo: should be Float32Array
        //   geometry.positions.map((v, k) => attributes.position.push(v[0], v[1], 0));
        //   elements = geometry.edges ? geometry.edges : geometry.cells;
        //   primitive = geometry.edges ? 'lines' : 'triangles';
        // }
        switch (primitive) {
            case 'points':
                return new THREE.Points(geometry, material);
            case 'line loop':
            case 'lineloop':
                return new THREE.LineLoop(geometry, material);
            case 'line strip':
            case 'linestrip':
                return new THREE.Line(geometry, material);
            case 'lines':
                return new THREE.LineSegments(geometry, material);
            default:
                if (instanced) {
                    return new THREE.InstancedMesh(geometry, material, instanced);
                }
                else {
                    const quad = new FullScreenQuad(material);
                    if (geometry) {
                        quad._mesh.geometry.dispose();
                        quad._mesh.geometry = geometry;
                    }
                    return quad._mesh;
                }
        }
    }

    render( renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */ ) {

        if ( this.material.uniforms[ this.textureID ] ) {

            this.material.uniforms[ this.textureID ].value = readBuffer.texture;

        }

        const oldAutoClear = renderer.autoClear;
        renderer.autoClear = false;

        let oldClearAlpha, oldOverrideMaterial;

        if ( this.overrideMaterial !== null ) {

            oldOverrideMaterial = this.scene.overrideMaterial;

            this.scene.overrideMaterial = this.overrideMaterial;

        }

        if ( this.clearColor !== null ) {

            renderer.getClearColor( this._oldClearColor );
            renderer.setClearColor( this.clearColor );

        }

        if ( this.clearAlpha !== null ) {

            oldClearAlpha = renderer.getClearAlpha();
            renderer.setClearAlpha( this.clearAlpha );

        }

        if ( this.clearDepth == true ) {

            renderer.clearDepth();

        }

        renderer.setRenderTarget( this.renderToScreen ? null : (this.renderTarget ? this.renderTarget : writeBuffer) );

        if ( this.clear === true ) {

            // TODO: Avoid using autoClear properties, see https://github.com/mrdoob/three.js/pull/15571#issuecomment-465669600
            renderer.clear( renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil );

        }

        renderer.render( this.scene, this.camera );

        // restore

        if ( this.clearColor !== null ) {

            renderer.setClearColor( this._oldClearColor );

        }

        if ( this.clearAlpha !== null ) {

            renderer.setClearAlpha( oldClearAlpha );

        }

        if ( this.overrideMaterial !== null ) {

            this.scene.overrideMaterial = oldOverrideMaterial;

        }

        renderer.autoClear = oldAutoClear;

    }
}

export { HydraShaderPass, HydraRenderPass };