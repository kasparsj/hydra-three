import * as THREE from "three";
import { padTo } from "./arr.js";

const textures = {};
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const strTypes = {
    'half float': THREE.HalfFloatType,
    'float16': THREE.HalfFloatType,
    'float': THREE.FloatType,
    'float32': THREE.FloatType,
    'uint8': THREE.UnsignedByteType,
};

const types = {
    'Uint16Array': THREE.HalfFloatType,
    'Float32Array': THREE.FloatType,
    'Uint8Array': THREE.UnsignedByteType,
};

const typesArray = {};
Object.keys(types).forEach((key) => typesArray[types[key]] = key);

const formats = [THREE.RedFormat, THREE.RGFormat, THREE.RGBAFormat, THREE.RGBAFormat];

const filters = {
    'nearest': THREE.NearestFilter,
    'linear': THREE.LinearFilter,
    'mipmap': THREE.LinearMipmapLinearFilter,
};

const strWrap = {
    'repeat': THREE.RepeatWrapping,
    'mirror': THREE.MirroredRepeatWrapping,
    'clamp': THREE.ClampToEdgeWrapping,
};

const get = (id) => textures[id];

const set = (id, tex) => {
    textures[id] = tex;
}

const setAttributes = (tex, options) => {
    ['type', 'format', 'generateMipmaps', 'minFilter', 'magFilter', 'wrapS', 'wrapT', 'wrapR', 'needsUpdate'].forEach((prop) => {
        if (typeof options[prop] !== 'undefined') {
            tex[prop] = options[prop];
        }
    });
}

const parseData = (data) => {
    if (Array.isArray(data[0]) || data[0] instanceof Float32Array || data[0] instanceof Uint8Array || data[0] instanceof Uint16Array) {
        const height = data.length;
        const width = data[0].length;
        data = data.flat();
        data.width = width;
        data.height = height;
    }
    else {
        data.width = data.width || data.length;
        data.height = data.height || 1;
    }
    return data;
}

const parseOptions = (options, defaults = {}) => {
    const { minFilter, magFilter, min, mag, filter, type, wrapS, wrapT, wrapR, wrap, ...rest } = options;
    defaults = Object.assign({
        type: THREE.UnsignedByteType,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        wrapS: typeof wrap === 'string' ? strWrap[wrap] : wrap,
        wrapT: typeof wrap === 'string' ? strWrap[wrap] : wrap,
        wrapR: typeof wrap === 'string' ? strWrap[wrap] : wrap,
    }, defaults);
    return Object.assign(defaults, {
        minFilter: minFilter || filters[min || filter] || defaults.minFilter,
        magFilter: magFilter || filters[mag || (filter === 'mipmap' ? 'linear' : filter)] || defaults.magFilter,
        type: typeof type === 'number' ? type : typeof type === 'string' ? strTypes[type] : defaults.type,
        wrapS: typeof wrapS === 'string' ? strWrap[wrapS] : wrapS || defaults.wrapS,
        wrapT: typeof wrapT === 'string' ? strWrap[wrapT] : wrapT || defaults.wrapT,
        wrapR: typeof wrapR === 'string' ? strWrap[wrapR] : wrapR || defaults.wrapR,
    }, rest);
}

const parseDataOptions = (data, options, defaults = {}) => {
    options = Object.assign({
        width: data.width || Math.max(data.length, 1),
        height: data.height || 1,
        depth: data.depth || 1,
        needsUpdate: true,
    }, defaults, parseOptions(options, {
        type: !Array.isArray(data)
            ? types[data.constructor.name]
            : typeof data[0] === 'number' && Number.isInteger(data[0]) && data[0] >= 0 && data[0] <= 255 ? THREE.UnsignedByteType : THREE.FloatType
    }));
    return options;
}

const adjustData = (data, options) => {
    if (data.length < options.width * options.height * options.depth) {
        // todo: padding when height > 1 will be incorrect visually
        data = padTo(data, options.width * options.height * options.depth);
    }
    if (Array.isArray(data)) {
        data = window[typesArray[options.type]].from(data);
    }
    return data;
}

const checkFormat = (data, options) => {
    if (!options.format) {
        // THREE.LuminanceFormat not working
        options.format = formats[(getNumChannels(data, options)-1)];
    }
}

const getNumChannels = (data, options) => {
    return options.width && options.height ? data.length / (options.width * options.height * options.depth) : 1;
}

const parseDataAndOptions = (data, options, defaults = {}) => {
    data = parseData(data);
    options = parseDataOptions(data, options, defaults);
    data = adjustData(data, options);
    checkFormat(data, options);
    const numChannels = formats.indexOf(options.format) + 1;
    if (data.length > options.width * options.height * options.depth * numChannels) {
        data = data.slice(0, options.width * options.height * options.depth * numChannels);
    }
    return {data, options};
}

const data = (data_, options_ = {}) => {
    const {data, options} = parseDataAndOptions(data_, options_, {
        generateMipmaps: false,
        // wrapS: THREE.MirroredRepeatWrapping,
        // wrapT: THREE.MirroredRepeatWrapping,
    });
    const {id} = options;
    let tex = id ? textures[id] : null;
    if (!tex || tex.image.width !== options.width || tex.image.height !== options.height) {
        tex = new THREE.DataTexture(data, options.width, options.height, options.format, options.type);
        if (id) {
            textures[id] = tex;
        }
    }
    else {
        tex.image = { data, width: options.width, height: options.height };
    }
    setAttributes(tex, options);
    return tex;
}

const dataArray = (data_, options_ = {}) => {
    const {data, options} = parseDataAndOptions(data_, options_);
    const {id} = options;
    let tex = id ? textures[id] : null;
    if (!tex || tex.image.width !== options.width || tex.image.height !== options.height || tex.image.depth !== options.depth) {
        tex = new THREE.DataArrayTexture(data, options.width, options.height, options.depth);
        if (id) {
            textures[id] = tex;
        }
    }
    else {
        tex.image = data;
    }
    setAttributes(tex, options);
    return tex;
}

const load = (url) => {
    return (new THREE.TextureLoader()).load(url);
}

const save = (tex, options = {}) => {
    options = Object.assign({
        width: tex.image.width,
        height: tex.image.height,
        filename: 'texture.png',
    }, options);

    const scene = createQuadScene(new THREE.MeshBasicMaterial({ map: tex }));

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(options.width, options.height);
    renderer.render(scene, camera);

    const canvas = renderer.domElement;
    const dataURL = canvas.toDataURL('image/png');

    const link = document.createElement('a');
    link.href = dataURL;
    link.download = options.filename;
    link.click();
}

const wrap = (tex, options = {}) => {
    options = Object.assign({
        width: tex.image.width,
        height: tex.image.height,
        minFilter: tex.minFilter,
        magFilter: tex.magFilter,
    }, options);
    const {x, y, width, height, wrapS, wrapT, minFilter, magFilter, ...matOptions} = options;
    tex.wrapS = options.wrapS || THREE.ClampToEdgeWrapping;
    tex.wrapT = options.wrapT || THREE.ClampToEdgeWrapping;
    tex.repeat.set(width / tex.image.width, height / tex.image.height);
    return createSceneTexture(createQuadScene(new THREE.MeshBasicMaterial({
        map: tex,
    })), options);
}

const repeat = (tex, x = 2, y = 2) => {
    return wrap(tex, {
        width: tex.image.width * x,
        height: tex.image.height * y,
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping,
    });
}

const mirror = (tex, x = 2, y = 2, options = {}) => {
    return wrap(tex, {
        width: tex.image.width * x,
        height: tex.image.height * y,
        wrapS: THREE.MirroredRepeatWrapping,
        wrapT: THREE.MirroredRepeatWrapping,
    });
}

const mirror1 = (texture, x = 2, y = 2, options = {}) => {
    const texWidth = texture.image.width;
    const texHeight = texture.image.height;
    options = Object.assign({
        width: texWidth * x - (x-1),
        height: texHeight * y - (y-1),
        minFilter: texture.minFilter,
        magFilter: texture.magFilter,
        generateMipmaps: texture.generateMipmaps,
    }, options);
    const {width, height, minFilter, magFilter, generateMipmaps, ...matOptions} = options;
    const renderTarget = fbo(options);
    const scene = createQuadScene(new THREE.MeshBasicMaterial(Object.assign({
        map: texture,
    }, matOptions)));
    const plane = scene.children[0];

    const renderer = hydraSynth.renderer;
    renderer.autoClear = false;
    renderer.setRenderTarget(renderTarget);
    renderer.setViewport(0, 0, texWidth, texHeight);
    renderer.render(scene, camera);

    if (x > 1) {
        texture.repeat.x = -1;
        texture.offset.x = 1;
        plane.material.needsUpdate = true;
        renderer.setViewport(texWidth - 1, 0, texWidth, texHeight);
        renderer.render(scene, camera);

        if (y > 1) {
            texture.repeat.y = -1;
            texture.offset.y = 1;
            plane.material.needsUpdate = true;
            renderer.setViewport(texWidth - 1, texHeight-1, texWidth, texHeight);
            renderer.render(scene, camera);
        }

        texture.repeat.set(1, 1);
        texture.offset.set(0, 0);
    }

    if (y > 1) {
        texture.repeat.y = -1;
        texture.offset.y = 1;
        plane.material.needsUpdate = true;
        renderer.setViewport(0, texHeight-1, texWidth, texHeight);
        renderer.render(scene, camera);
    }

    renderer.autoClear = true;
    renderer.setViewport(0, 0, renderer.domElement.width, renderer.domElement.height);
    renderer.setRenderTarget(null);

    return renderTarget.texture;
}

const pointsym = (texture, options = {}) => {
    // todo: fix
    // const texWidth = texture.image.width;
    // const texHeight = texture.image.height;
    // options = Object.assign({
    //     width: texWidth * 2,
    //     height: texHeight * 2,
    //     minFilter: texture.minFilter,
    //     magFilter: texture.magFilter,
    //     generateMipmaps: texture.generateMipmaps,
    // }, options);
    // const {width, height, minFilter, magFilter, generateMipmaps, ...matOptions} = options;
    // const renderTarget = createRenderTarget(options);
    // const scene = createQuadScene(src(texture).rotate(90).tex());
    // const plane = scene.children[0];
    //
    // const renderer = hydraSynth.renderer;
    // renderer.autoClear = false;
    // renderer.setRenderTarget(renderTarget);
    // renderer.setViewport(0, texHeight, texWidth, texHeight);
    // renderer.render(scene, camera);
    //
    // plane.material.uniforms.rotation.value = Math.PI / 2.0;
    // plane.material.needsUpdate = true;
    // renderer.setViewport(texWidth, texHeight, texWidth, texHeight);
    // renderer.render(scene, camera);
    //
    // plane.material.uniforms.rotation.value = Math.PI;
    // plane.material.needsUpdate = true;
    // renderer.setViewport(texWidth, 0, texWidth, texHeight);
    // renderer.render(scene, camera);
    //
    // plane.material.uniforms.rotation.value = -Math.PI / 2.0;
    // plane.material.needsUpdate = true;
    // renderer.setViewport(0, 0, texWidth, texHeight);
    // renderer.render(scene, camera);
    //
    // renderer.autoClear = true;
    // renderer.setViewport(0, 0, renderer.domElement.width, renderer.domElement.height);
    // renderer.setRenderTarget(null);
    //
    // return renderTarget.texture;
}

const atlas = (textures, options = {}) => {
    const width = textures[0].image.width;
    const height = textures[0].image.height;
    const renderTarget = fbo({
        width: width * textures.length,
        height,
        minFilter: textures[0].minFilter,
        magFilter: textures[0].magFilter,
        generateMipmaps: textures[0].generateMipmaps,
    });
    const scene = createQuadScene(new THREE.MeshBasicMaterial());
    const plane = scene.children[0];

    const renderer = hydraSynth.renderer;
    renderer.autoClear = false;
    renderer.setRenderTarget(renderTarget);
    textures.forEach((texture, index) => {
        plane.material.map = texture;
        plane.material.needsUpdate = true;
        renderer.setViewport(index * width, 0, width, height);
        renderer.render(scene, camera);
    });

    renderer.autoClear = true;
    renderer.setViewport(0, 0, renderer.domElement.width, renderer.domElement.height);
    renderer.setRenderTarget(null);

    const tex = renderTarget.texture;
    tex.userData.width = width;
    tex.userData.height = height;
    tex.userData.depth = textures.length;
    if (options.id) {
        set(options.id, tex);
    }
    return tex;
}

const createSceneTexture = (scene, options = {}) => {
    const renderTarget = fbo(options);
    const renderer = hydraSynth.renderer;
    renderer.setRenderTarget(renderTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    return renderTarget.texture;
}

const createQuadScene = (material, options = {}) => {
    options = Object.assign({
        width: 2,
        height: 2,
    }, options);
    const scene = new THREE.Scene();
    const geometry = new THREE.PlaneGeometry(options.width, options.height);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    return scene;
}

const fbo = (options = {}) => {
    options = parseOptions(options, {
        width: 1024,
        height: 1024,
        type: THREE.HalfFloatType,
        minFilter: THREE.LinearMipmapLinearFilter,
        magFilter: THREE.LinearFilter,
        generateMipmaps: true,
        // wrapS: THREE.MirroredRepeatWrapping,
        // wrapT: THREE.MirroredRepeatWrapping,
    });
    const {width, height, ...texOptions} = options;
    return new THREE.WebGLRenderTarget(width, height, texOptions);
}

export {
    get, set,
    data, dataArray, load, save,
    wrap, repeat, mirror, mirror1, pointsym,
    atlas,
    createSceneTexture, createQuadScene, fbo,
}