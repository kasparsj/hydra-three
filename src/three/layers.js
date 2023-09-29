import * as THREE from "three";
import {ShaderPass} from "three/examples/jsm/postprocessing/ShaderPass";
import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer";
import * as fx from "./fx.js";

const darkMaterial = new THREE.MeshBasicMaterial( { color: 'black' } );
const materials = {};

class Layer {
    constructor(id, scene, renderer, options = {}) {
        this.layer = new THREE.Layers();
        this.layer.set( id );
        this.scene = scene;
        this.composer = new EffectComposer(renderer);
        this.composer.renderToScreen = false;
        this.add(options);

        options = Object.assign({
            selectFn: darkenMaterials,
            deselectFn: restoreMaterials,
        }, options);

        this.selectFn = options.selectFn;
        this.deselectFn = options.deselectFn;
    }

    add(options) {
        fx.add(Object.assign({
            composer: this.composer,
            scene: this.scene,
        }, options));
    }

    select() {
        this.selectFn(this.scene, this.layer);
    }

    deselect() {
        this.deselectFn(this.scene, this.layer);
    }

    render() {
        this.composer.render();
    }

    getMixPass() {
        const mixMat = new THREE.ShaderMaterial({
            uniforms: {
                baseTexture: { value: null },
                layerTexture: { value: this.composer.renderTarget2.texture }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                }`,
            fragmentShader: `
                uniform sampler2D baseTexture;
                uniform sampler2D layerTexture;
                varying vec2 vUv;
                void main() {
                    gl_FragColor = texture2D( layerTexture, vUv ) + texture2D( baseTexture, vUv );
                }`,
            defines: {},
            transparent: true,
        });
        const mixPass = new ShaderPass(mixMat, 'baseTexture');
        mixPass.needsSwap = true;
        return mixPass;
    }
}

const create = (id, scene, renderer, options = {}) => {
    return new Layer(id, scene, renderer, options);
}

const render = (layers) => {
    layers.map((layer) => {
        layer.select();
        layer.render();
        layer.deselect();
    });
}

const darkenMaterials = (scene, layer, enabled = false) => {
    scene.traverse( (obj) => {
        if ( obj.isMesh && layer.test( obj.layers ) === enabled) {
            materials[ obj.uuid ] = obj.material;
            obj.material = darkMaterial;
        }
    } );
}

const restoreMaterials = (scene) => {
    scene.traverse((obj) => {
        if ( materials[ obj.uuid ] ) {
            obj.material = materials[ obj.uuid ];
            delete materials[ obj.uuid ];
        }
    });
}

export { create, render, darkenMaterials, restoreMaterials }