import {Pass} from "three/examples/jsm/postprocessing/Pass.js";
import {ShaderPass} from "three/examples/jsm/postprocessing/ShaderPass";
import {HorizontalBlurShader} from "three/examples/jsm/shaders/HorizontalBlurShader";
import {VerticalBlurShader} from "three/examples/jsm/shaders/VerticalBlurShader";
import {DotScreenShader} from "three/examples/jsm/shaders/DotScreenShader";
import {RGBShiftShader} from "three/examples/jsm/shaders/RGBShiftShader";
import {SepiaShader} from "three/examples/jsm/shaders/SepiaShader";
import {ColorifyShader} from "three/examples/jsm/shaders/ColorifyShader";
import {FXAAShader} from "three/examples/jsm/shaders/FXAAShader";
import {RenderPixelatedPass} from "three/examples/jsm/postprocessing/RenderPixelatedPass";
import {FilmPass} from "three/examples/jsm/postprocessing/FilmPass";
import { BloomPass } from "three/examples/jsm/postprocessing/BloomPass";
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {GammaCorrectionShader} from "three/examples/jsm/shaders/GammaCorrectionShader";
import {BleachBypassShader} from "three/examples/jsm/shaders/BleachBypassShader";
import { SSAARenderPass } from 'three/examples/jsm/postprocessing/SSAARenderPass.js';
import { SAOPass } from 'three/examples/jsm/postprocessing/SAOPass.js';
//import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import glsl from "glslify";
import {HydraUniform} from "./HydraUniform.js";
import {ShaderMaterial} from "three";

const uvVert = glsl("../shaders/uv.vert");
const filmFrag = glsl("../shaders/film.frag");

const add = (options) => {
    const { composer } = options;
    if (options instanceof Pass) {
        composer.addPass(options);
    }
    else {
        for (let prop in options) {
            switch (prop) {
                // case 'dotScale':
                //     addPass('dotScreen', options);
                //     break;
                // case 'noiseType':
                // case 'noiseIntensity':
                // case 'scanlinesIntensity':
                // case 'scanlinesCount':
                // case 'grayscale':
                // case 'grainSize':
                //     addPass('film', options);
                //     break;
                case 'dotScreen':
                case 'film':
                case 'filmGrain':
                case 'hBlur':
                case 'vBlur':
                case 'rgbShift':
                case 'sepia':
                case 'colorify':
                case 'fxaa':
                case 'pixelate':
                case 'bloom':
                case 'unrealBloom':
                case 'bleach':
                case 'ssaa':
                case 'sao':
                case 'output':
                    addPass(prop, options);
                    break;
                default:
                    if (options[prop] instanceof Pass) {
                        composer.addPass(options[prop]);
                    }
                    break;
            }
        }
    }
}

const addPass = (type, options) => {
    const { scene, composer, camera } = options;
    const time = HydraUniform.get('time', 'hydra');
    const resolution = HydraUniform.get('resolution', 'hydra');
    let pass;
    switch (type) {
        case 'hBlur':
            pass = new ShaderPass(HorizontalBlurShader);
            pass.enabled = options.hBlur > 0;
            pass.uniforms.h.value = options.hBlur;
            break;
        case 'vBlur':
            pass = new ShaderPass(VerticalBlurShader);
            pass.enabled = options.vBlur > 0;
            pass.uniforms.v.value = options.vBlur;
            break;
        case 'dotScreen':
            pass = new ShaderPass(DotScreenShader);
            pass.enabled = options.dotScreen;
            pass.uniforms.scale.value = options.dotScale;
            break;
        case 'rgbShift':
            pass = new ShaderPass( RGBShiftShader );
            pass.uniforms.amount.value = options.rgbShift;
            break;
        case 'film':
            pass = new FilmPass(options.filmIntensity, options.grayscale);
            pass.enabled = !!options.film;
            break;
        case 'filmGrain':
            const material = new ShaderMaterial( {
                name: 'filmGrain',
                uniforms: {
                    uResolution: resolution,
                    nIntensity: { value: options.noiseIntensity || 1 },
                    sIntensity: { value: options.scanlinesIntensity },
                    sCount: { value: options.scanlinesCount },
                    grayscale: { value: options.grayscale || false },
                    time: time,
                    uGrainSize: { value: options.grainSize || 2 },
                    tDiffuse: { value: null },
                },
                fragmentShader: filmFrag,
                vertexShader: uvVert,
            } );
            pass = new ShaderPass(material);
            pass.enabled = !!options.filmGrain;
            break;
        case 'sepia':
            pass = new ShaderPass(SepiaShader);
            pass.uniforms.amount.value = options.sepia;
            break;
        case 'colorify':
            pass = new ShaderPass(ColorifyShader);
            pass.uniforms.color.value = options.colorifyColor;
            pass.enabled = options.colorify;
            break;
        case 'fxaa':
            pass = new ShaderPass(FXAAShader);
            pass.enabled = options.fxaa;
            break;
        case 'bloom':
            pass = new BloomPass(options.bloom);
            pass.enabled = options.bloom > 0;
            break;
        case 'unrealBloom':
            pass = new UnrealBloomPass(resolution.value, options.unrealBloom, options.bloomRadius || 0.4, options.bloomThresh || 0);
            pass.enabled = options.unrealBloom > 0;
            break;
        case 'bleach':
            pass = new ShaderPass(BleachBypassShader);
            pass.enabled = options.bleach > 0;
            break;
        case 'gammaCorrection':
            pass = new ShaderPass(GammaCorrectionShader);
            pass.enabled = options.gammaCorrection;
            break;
        // case 'output':
        //     pass = new OutputPass();
        //     break;
        default: {
            if (scene && camera) {
                switch (type) {
                    case 'ssaa':
                        pass = new SSAARenderPass(scene, camera);
                        pass.enabled = options.ssaa;
                        break;
                    case 'sao':
                        pass = new SAOPass(scene, camera);
                        pass.enabled = options.sao;
                        break;
                    case 'pixelate':
                        pass = new RenderPixelatedPass(6, scene, camera);
                        pass.enabled = options.pixelate;
                        break;
                }
            }
        }
    }
    if (pass) {
        composer.addPass(pass);
    }
    return pass;
}

export {add};