import * as THREE from "three";
import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer";
import * as fx from "./fx.js";
import {HydraUniform} from "./HydraUniform.js";
import {HydraShaderPass, HydraRenderPass} from "./HydraPass.js";

const darkMaterial = new THREE.MeshBasicMaterial( { color: 'black' } );
const materials = {};

class Layer {
    constructor(id, scene, options = {}) {
        this.id = id;
        this.layer = new THREE.Layers();
        this.layer.set( id );
        this.scene = scene;
        this.effects = Object.assign({}, options);

        options = Object.assign({
            selectFn: darkenMaterials,
            deselectFn: restoreMaterials,
        }, options);

        this.selectFn = options.selectFn;
        this.deselectFn = options.deselectFn;
    }

    add(options) {
        Object.assign(this.effects, options);
    }

    compile(renderer, camera) {
        this.composer = new EffectComposer(renderer);
        this.composer.renderToScreen = false;
        this.composer.addPass(new HydraRenderPass(this.scene, camera));
        this.composer.passes[0].clear = true;
        fx.add(Object.assign(this.effects, {
            composer: this.composer,
            scene: this.scene,
            camera: camera,
        }));
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

    getTexture() {
        return this.composer.readBuffer.texture;
    }

    getMixPass(options = {}) {
        const mixMat = new THREE.ShaderMaterial({
            uniforms: {
                prevBuffer: { value: null },
                layerTexture: new HydraUniform('layerMixPassTex' + this.id, null, () => this.getTexture(), 'hydra-layer'),
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                }`,
            fragmentShader: `
                uniform sampler2D prevBuffer;
                uniform sampler2D layerTexture;
                varying vec2 vUv;
                void main() {
                    gl_FragColor = texture2D( layerTexture, vUv) + texture2D( prevBuffer, vUv );
                }`,
            defines: {},
            transparent: true,
            depthTest: false,
        });
        const mixPass = new HydraShaderPass(mixMat, options);
        mixPass.needsSwap = true;
        mixPass.clear = true;
        return mixPass;
    }

    dispose() {
        if (this.composer) {
            for (let i=0; i<this.composer.passes.length; i++) {
                this.composer.passes[i].dispose();
            }
            this.composer.dispose();
        }
    }
}

const create = (id, scene, options = {}) => {
    return new Layer(id, scene, options);
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