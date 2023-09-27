const textures = {};

const regl = hydraSynth.regl;
const data = (data, options = {}) => {
    if (typeof data === 'string') {
        return textures[data];
    }
    options = Object.assign({
        format: data.format || 'luminance',
        type: data instanceof Float32Array ? 'float' : 'uint8',
    }, options);
    if (options.type === 'float') {
        if (!regl.hasExtension('OES_texture_float')) {
            const floatData = data;
            data = new Array(floatData.length);
            for (let i = 0; i < data.length; i++) {
                data[i] = floatData[i] * 255;
            }
            options.type = 'uint8';
        }
        // todo: not sure this is needed
        // else if (!(data instanceof Float32Array)) {
        //     data = new Float32Array(data);
        // }
    }
    const {id, min, mag, filter, ...texOptions} = options;
    let texture = id ? textures[id] : null;
    if (Array.isArray(data[0]) || data[0] instanceof Float32Array || data[0] instanceof Uint8Array) {
        const height = data.length;
        const width = data[0].length;
        data = data.flat();
        data.width = width;
        data.height = height;
    }
    const topts = Object.assign({
        width: data.width || Math.max(data.length, 1),
        height: data.height || 1,
        data,
        min: min || filter || "nearest",
        mag: mag || filter || "nearest",
    }, texOptions);
    if (topts.height === 1) {
        topts.data = padTo(data, options.width);
    }
    else if (topts.data.length > topts.width * topts.height) {
        topts.data = topts.data.slice(0, topts.width * topts.height);
    }
    if (!texture || texture.width !== topts.width || texture.height !== topts.height) {
        texture = regl.texture(topts);
        if (id) {
            textures[id] = texture;
        }
    }
    else {
        texture.subimage(padTo(data, texture.width));
    }
    return texture;
}

const mirror1 = (texture, x = 2, y = 2, options = {}) => {
    const texWidth = texture.width;
    const texHeight = texture.height;
    const mirrorTexture = regl.texture({
        width: texWidth * x - (x-1),
        height: texHeight * y - (y-1),
        format: 'rgba',
        type: texture.type,
        min: texture.min,
        mag: texture.mag,
        ...options
    });
    const framebuffer = regl.framebuffer({
        color: mirrorTexture,
        depthStencil: false
    });

    drawTo(framebuffer)({
        texture,
        viewport: {
            x: 0,
            y: 0,
            width: texWidth,
            height: texHeight,
        }
    });

    if (x > 1) {
        drawTo(framebuffer, {flipX: true})({
            texture,
            viewport: {
                x: texWidth-1,
                y: 0,
                width: texWidth,
                height: texHeight,
            }
        });

        if (y > 1) {
            drawTo(framebuffer, {flipX: true, flipY: true})({
                texture,
                viewport: {
                    x: texWidth-1,
                    y: texHeight-1,
                    width: texWidth,
                    height: texHeight,
                }
            });
        }
    }

    if (y > 1) {
        drawTo(framebuffer, {flipY: true})({
            texture,
            viewport: {
                x: 0,
                y: texHeight-1,
                width: texWidth,
                height: texHeight,
            }
        });
    }

    return mirrorTexture;
}

const atlas = (textures, options = {}) => {
    options = Object.assign({
        format: 'rgba',
        type: textures[0].type,
        min: textures[0].min,
        mag: textures[0].mag,
    }, options);

    const atlasTexture = regl.texture({
        width: textures[0].width * textures.length,
        height: textures[0].height,
        ...options
    });
    const framebuffer = regl.framebuffer({
        color: atlasTexture,
        depthStencil: false
    });
    const drawToAtlas = drawTo(framebuffer);

    textures.forEach((texture, index) => {
        drawToAtlas({
            texture,
            viewport: {
                x: index * texture.width,
                y: 0,
                width: texture.width,
                height: texture.height
            },
        });
    });

    return atlasTexture;
}

const drawTo = (framebuffer, options = {}) => {
    return regl({
        frag: `
    precision mediump float;
    uniform sampler2D texture;
    varying vec2 vUV;
    void main () {
      vec2 finalUV = vec2(${options.flipX ? '1.0 - vUV.x' : 'vUV.x'}, ${options.flipY ? '1.0 - vUV.y' : 'vUV.y'});
      gl_FragColor = texture2D(texture, finalUV);
    }
  `,
        vert: `
    precision mediump float;
    attribute vec2 position;
    varying vec2 vUV;
    void main () {
      vUV = position * 0.5 + 0.5; // Convert [-1, 1] range to [0, 1]
      gl_Position = vec4(position, 0, 1);
    }
  `,
        attributes: {
            position: [
                [-1, -1],
                [1, -1],
                [1, 1],
                [-1, 1]
            ]
        },
        viewport: regl.prop('viewport'),
        uniforms: {
            texture: regl.prop('texture')
        },
        count: 4,
        primitive: 'triangle fan',
        framebuffer: framebuffer
    });
}

export { data, mirror1, atlas };