var HydraShader = function() {}

HydraShader.compileHeader = function(transform, uniforms = {}, utils = {}, options = {}) {
    let varying = 'varying';
    let outColor = '';
    let version = transform.version;
    if (version >= 300) {
        varying = options.vert ? 'out' : 'in';
        outColor = 'out vec4 outColor;';
        version += ' es';
    }
    return `#version ${version || '100'}
    precision ${options.precision} float;
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
    ${varying} vec3 vposition;
    ${varying} vec2 vuv;
    ${varying} vec3 vnormal;
    uniform sampler2D prevBuffer;
    ${outColor}
  
    ${Object.values(utils).map((trans) => {
        return `${trans[('glsl' + transform.version)] || trans.glsl}`
    }).join('\n\t')}
  `
}

HydraShader.compileFrag = function(transform, shaderInfo, utils, options = {}) {
    const fragColor = transform.version >= 300 ? 'outColor' : 'gl_FragColor';
    const header = HydraShader.compileHeader(transform, shaderInfo.uniforms, utils, options);
    return header + `
  
    ${shaderInfo.glslFunctions.map((trans) => {
        return `${trans.transform[('glsl' + transform.version)] || trans.transform.glsl}`
    }).join('\n\t')}

    void main () {
        vec4 c = vec4(1, 0, 0, 1);
        //vec2 st = gl_FragCoord.xy/resolution.xy;
        vec2 st = vuv;
        ${fragColor} = ${shaderInfo.fragColor};
    }
    `
}

HydraShader.compileVert = function(transform, shaderInfo, utils, options = {}) {
    const useUV = typeof(transform.useUV) !== 'undefined'
        ? transform.useUV
        : (!transform.primitive || ['points', 'lines', 'line strip', 'line loop'].indexOf(transform.primitive) === -1);
    const useNormal = typeof(transform.useNormal) !== 'undefined'
        ? transform.useNormal
        : transform.type === 'vert' && (!transform.primitive || ['points', 'lines', 'line strip', 'line loop'].indexOf(transform.primitive) === -1);
    let attribute = 'attribute';
    let varying = 'varying';
    let version = transform.version;
    if (version >= 300) {
        attribute = 'in';
        varying = 'out';
        version += ' es';
    }

    let vertHeader = `#version ${version || '100'}
    precision ${options.precision} float;
    uniform mat4 projection, view;
    ${attribute} vec3 position;
    ${useUV ? `${attribute} vec2 uv;` : ''}
    ${useNormal ? `${attribute} vec3 normal;` : ''}
    ${varying} vec3 vposition;
    ${varying} vec2 vuv;
    ${varying} vec3 vnormal;
    `
    let vertFn = `
    void ${transform.glslName}() {
        vposition = position;
        gl_Position = ${options.useCamera ? 'projection * view * ' : ''}vec4(position, 1.0);
    } 
    `
    let vertCall = `${transform.glslName}();`;
    if (transform.vert) {
        vertHeader = HydraShader.compileHeader(transform, shaderInfo.uniforms, utils, Object.assign({vert: true}, options)) + `
        uniform mat4 projection, view;
        ${attribute} vec3 position;
        ${useUV ? `${attribute} vec2 uv;` : ''}
        ${useNormal ? `${attribute} vec3 normal;` : ''}
    
        ${shaderInfo.glslFunctions.map((trans) => {
            if (trans.transform.name !== transform.name) {
                return `${trans.transform[('glsl' + transform.version)] || trans.transform.glsl}`
            }
        }).join('\n\t')}
        `
        vertFn = transform.vert;
        vertCall = `
        ${useUV ? 'vec2 st = uv;' : 'vec2 st = position.xy;'}
        vposition = ${shaderInfo.position}.xyz;
        gl_Position = projection * view * vec4(vposition, 1.0);
        `;
    }

    return vertHeader + `
    
    ${vertFn}

    void main () {
        ${useUV ? 'vuv = uv;' : ''}
        ${useNormal ? 'vnormal = normal;' : ''}
        ${vertCall}
    }`
}

export default HydraShader;