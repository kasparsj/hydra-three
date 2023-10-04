import * as THREE from "three";

class HydraShader {

    constructor(version, header, funcs, main) {
        this.version = version;
        this.header = header;
        this.funcs = funcs;
        this.main = main;
    }

    static compileHeader(transform, uniforms = {}, utils = {}, options = {}) {
        const isVertex = options.vert
        const head1 = `
        #include <common>
        ${!isVertex ? '#include <packing>' : ''}
        ${isVertex ? '#include <uv_pars_vertex>' : '#include <uv_pars_fragment>'}
        ${isVertex ? '#include <normal_pars_vertex>' : '#include <normal_pars_fragment>'}
  `
        const head2 = `
        ${Object.values(uniforms).map((uniform) => {
            let type = uniform.type
            switch (uniform.type) {
                case 'texture':
                    type = 'sampler2D'
                    break
            }
            return `uniform ${type} ${uniform.name};`
        }).join('\n\t')}
        uniform float time;
        uniform vec2 resolution;
        uniform sampler2D prevBuffer;
        ${Object.values(utils).map((trans) => {
            return `${trans[('glsl' + transform.version)] || trans.glsl}\n\t`
        }).join('\n\t')}
  `
        return [head1, head2];
    }

}

class HydraFragmentShader extends HydraShader {

    constructor(transform, shaderInfo, utils, options = {}) {
        const version = transform.version >= 300 ? THREE.GLSL3 : THREE.GLSL1;
        const header = HydraShader.compileHeader(transform, shaderInfo.uniforms, utils, options)
        const fn = `
        ${shaderInfo.glslFunctions.map((trans) => {
            return `${trans.transform[('glsl' + transform.version)] || trans.transform.glsl}`
        }).join('\n\t')}
  `
        const call = `
        #if defined( USE_UV )
        vec2 st = vUv;
        #else
        vec2 st = vPosition.xy;
        #endif
        gl_FragColor = ${shaderInfo.fragColor};
        `
        super(version, header, fn, call)

        this.useUV = typeof(transform.useUV) !== 'undefined'
            ? transform.useUV
            : (!transform.primitive || ['points', 'lines', 'line strip', 'line loop'].indexOf(transform.primitive) === -1);

        this.useNormal = typeof(transform.useNormal) !== 'undefined'
            ? transform.useNormal
            // todo: potentially detect flat shading when FullScreenQuad is used
            : (!transform.primitive || ['points', 'lines', 'line strip', 'line loop'].indexOf(transform.primitive) === -1);
    }

}

class HydraVertexShader extends HydraShader {

    constructor(transform, shaderInfo, utils, options = {}) {
        const version = transform.version >= 300 ? THREE.GLSL3 : THREE.GLSL1;
        let header = `
        #include <common>
        #include <uv_pars_vertex>
        #include <normal_pars_vertex>
        `
        let fn = ``
        let call = `
        #include <uv_vertex>
        #include <color_vertex>
        #include <morphcolor_vertex>
        #include <beginnormal_vertex>
        #include <morphnormal_vertex>
        #include <skinbase_vertex>
        #include <skinnormal_vertex>
        #include <defaultnormal_vertex>
        #include <normal_vertex>
        #include <begin_vertex>
        #include <morphtarget_vertex>
        #include <skinning_vertex>
        #include <displacementmap_vertex>
        ${options.useCamera ? '#include <project_vertex>' : 'gl_Position = vec4(position, 1.0);'}
        `;
        if (transform.vert) {
            header = HydraShader.compileHeader(transform, shaderInfo.uniforms, utils, Object.assign({vert: true}, options))
            fn = `
            ${shaderInfo.glslFunctions.map((trans) => {
                if (trans.transform.name !== transform.name) {
                    return `${trans.transform[('glsl' + transform.version)] || trans.transform.glsl}`
                }
            }).join('\n\t')}
            ${transform.vert}
            `;
            call = `
            #if defined( USE_UV )
            vec2 st = uv;
            #else
            vec2 st = position.xy;
            #endif
            vPosition = ${shaderInfo.position}.xyz;
            vec4 mvPosition = vec4( vPosition, 1.0 );
            mvPosition = modelViewMatrix * mvPosition;
            gl_Position = projectionMatrix * mvPosition;
            `;
        }

        super(version, header, fn, call);
    }

}

export {HydraShader, HydraFragmentShader, HydraVertexShader}