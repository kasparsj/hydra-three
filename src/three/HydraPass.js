import * as THREE from "three";
import {Pass, FullScreenQuad} from "three/examples/jsm/postprocessing/Pass.js";
import * as mt from "./mt.js";
import {HydraShader, HydraVertexShader} from "../lib/HydraShader.js";
import {ensure_decimal_dot} from "../format-arguments.js";

class HydraPass extends Pass {

    constructor(options) {

        super();

        this.options = options;
        this.renderTarget = options.renderTarget || null;

        this.textureID = options.textureID || 'prevBuffer';

    }

}

class HydraShaderPass extends HydraPass {

    constructor( shader, options = {} ) {

        super(options);

        if ( shader instanceof THREE.ShaderMaterial ) {

            this.uniforms = shader.uniforms;

            this.material = shader;

        } else if ( shader ) {

            this.uniforms = THREE.UniformsUtils.clone( shader.uniforms );

            this.material = new THREE.ShaderMaterial( {

                name: ( shader.name !== undefined ) ? shader.name : 'unspecified',
                defines: Object.assign( {}, shader.defines ),
                uniforms: this.uniforms,
                vertexShader: shader.vertexShader,
                fragmentShader: shader.fragmentShader

            } );

        }

        this.fsQuad = new FullScreenQuad( this.material );

    }

    render( renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */ ) {

        if ( this.uniforms[ this.textureID ] ) {

            this.uniforms[ this.textureID ].value = readBuffer.texture;

        }

        this.fsQuad.material = this.material;

        if ( this.renderToScreen ) {

            renderer.setRenderTarget( null );
            this.fsQuad.render( renderer );

        } else {

            const renderTarget = this.renderTarget ? this.renderTarget : writeBuffer;

            if (this.uniforms['resolution']) {
                this.uniforms['resolution'] = {value: [ renderTarget.width, renderTarget.height ]};
            }

            renderer.setRenderTarget(renderTarget);
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

class HydraMaterialPass extends HydraPass {

    constructor(options) {

        super(options);

        const material = options.material || {};
        material.depthTest = false;
        this.material = mt.hydra(options, material);

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

            const renderTarget = this.renderTarget ? this.renderTarget : writeBuffer;

            if (this.material.uniforms['resolution']) {
                this.material.uniforms['resolution'] = {value: [ renderTarget.width, renderTarget.height ]};
            }

            renderer.setRenderTarget(renderTarget);
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

    constructor( scene, camera, options = {} ) {

        super(options);

        this.scene = scene;
        this.camera = camera;

        this.overrideMaterial = options.overrideMaterial || null;

        this.clearColor = options.clearColor || null;
        this.clearAlpha = options.clearAlpha || null;

        this.clearDepth = false;
        this._oldClearColor = new THREE.Color();

    }

    render( renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */ ) {

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

        const renderTarget = this.renderToScreen ? null : (this.renderTarget ? this.renderTarget : writeBuffer);

        for (let i=0; i<this.scene.children.length; i++) {
            const material = this.scene.children[i].material;
            if ( material && material.uniforms ) {
                if (material.uniforms[ this.textureID ]) {
                    material.uniforms[ this.textureID ].value = readBuffer.texture;
                }
                if (material.uniforms['resolution']) {
                    material.uniforms['resolution'] = { value: [ renderTarget.width, renderTarget.height ] };
                }
            }
        }

        renderer.setRenderTarget(renderTarget);

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

class HydraFadePass extends HydraMaterialPass
{
    constructor(options, uniforms) {
        let amount = options;
        let color = 0;
        let camera = false;
        if (typeof(options) === 'object') {
            ({amount, color, camera} = options);
        }
        if (!color.isColor) {
            color = new THREE.Color(color);
        }
        // todo: do we need to fade also temp buffers?
        const passOptions = {
            // todo: create class/struct
            frag: new HydraShader(THREE.GLSL1, ['', `
      varying vec2 vUv;
      uniform sampler2D prevBuffer;
    `], '', `
      vec4 color = mix(texture2D(prevBuffer, vUv), vec4(${color.toArray().map(ensure_decimal_dot).join(', ')}, 1.0), ${amount});
      gl_FragColor = color;
    `),
            vert: new HydraVertexShader({ glslName: 'clear' }, null, null, {useCamera: camera}),
            uniforms: Object.assign({
                prevBuffer: { value: null }
            }, uniforms),
        };
        super(passOptions);
        this.needsSwap = false;
    }
}

export { HydraShaderPass, HydraMaterialPass, HydraRenderPass, HydraFadePass };