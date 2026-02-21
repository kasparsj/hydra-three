import assert from "node:assert/strict";

class FakeEventTarget {
  constructor() {
    this._listeners = new Map();
  }

  addEventListener(type, handler) {
    const handlers = this._listeners.get(type) || [];
    handlers.push(handler);
    this._listeners.set(type, handlers);
  }

  removeEventListener(type, handler) {
    const handlers = this._listeners.get(type) || [];
    this._listeners.set(
      type,
      handlers.filter((h) => h !== handler),
    );
  }

  dispatchEvent(event) {
    const handlers = this._listeners.get(event.type) || [];
    handlers.forEach((handler) => handler(event));
  }
}

class FakeCanvas extends FakeEventTarget {
  constructor() {
    super();
    this.width = 0;
    this.height = 0;
    this.style = {};
  }

  getContext(type) {
    if (type !== "2d") return null;
    return {
      canvas: this,
      clearRect() {},
      drawImage() {},
      getImageData() {
        return {
          data: new Uint8ClampedArray([1, 2, 3, 4, 5, 6, 7, 8]),
        };
      },
    };
  }
}

class FakeMediaSource extends FakeEventTarget {
  addSourceBuffer() {
    return { type: "source-buffer" };
  }
}

const originalDescriptors = {
  window: Object.getOwnPropertyDescriptor(globalThis, "window"),
  document: Object.getOwnPropertyDescriptor(globalThis, "document"),
  navigator: Object.getOwnPropertyDescriptor(globalThis, "navigator"),
  MediaSource: Object.getOwnPropertyDescriptor(globalThis, "MediaSource"),
  tx: Object.getOwnPropertyDescriptor(globalThis, "tx"),
};

const setGlobal = (name, value) => {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value,
  });
};

const restoreGlobal = (name, descriptor) => {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor);
  } else {
    delete globalThis[name];
  }
};

const windowTarget = new FakeEventTarget();
windowTarget.innerWidth = 800;
windowTarget.innerHeight = 600;
windowTarget.URL = {
  createObjectURL: () => "blob:fake",
  revokeObjectURL: () => {},
};

const documentTarget = new FakeEventTarget();
documentTarget.body = {
  appendChild() {},
  removeChild() {},
};
documentTarget.createElement = (name) => {
  if (name === "canvas") return new FakeCanvas();
  if (name === "video") {
    return {
      autoplay: false,
      loop: false,
      muted: false,
      srcObject: null,
      style: {},
      addEventListener() {},
    };
  }
  return { style: {} };
};
windowTarget.document = documentTarget;

setGlobal("window", windowTarget);
setGlobal("document", documentTarget);
setGlobal("navigator", { mediaDevices: {}, platform: "", maxTouchPoints: 0 });
setGlobal("MediaSource", FakeMediaSource);

try {
  const { cameraMixin } = await import("../../src/lib/mixins.js");
  const lights = await import("../../src/three/lights.js");
  const { default: HydraSource } = await import("../../src/hydra-source.js");
  const arr = await import("../../src/three/arr.js");
  const { default: VideoRecorder } =
    await import("../../src/lib/video-recorder.js");

  // cameraMixin: resize listener should not leak after toggling modes
  const camTarget = {
    _camera: {
      updateProjectionMatrix() {},
    },
    _camBoundsListener() {},
    _setCameraBounds() {},
  };
  Object.assign(camTarget, cameraMixin);
  camTarget._camResizeListener("cartesian");
  camTarget._camResizeListener("cartesian");
  assert.equal((window._listeners.get("resize") || []).length, 1);
  camTarget._camResizeListener("cartesian", 640, 480);
  assert.equal((window._listeners.get("resize") || []).length, 0);

  // lights: hemisphere options object should be respected
  const group = {
    children: [],
    find(filter) {
      const keys = Object.keys(filter);
      return this.children.filter((child) =>
        keys.every((key) => child[key] === filter[key]),
      );
    },
    add(...children) {
      children.forEach((child) => {
        if (!this.children.includes(child)) this.children.push(child);
      });
    },
    remove(child) {
      this.children = this.children.filter((entry) => entry !== child);
    },
  };
  const scene = { group: () => group };
  const camera = {
    near: 0.1,
    far: 10,
    add() {},
    remove() {},
  };
  lights.update(scene, camera, {
    hemi: { intensity: 0.75, skyColor: 0xabcdef, groundColor: 0x111111 },
  });
  const hemiLight = group.find({ name: lights.hemiLightName })[0];
  assert.ok(hemiLight, "Expected hemisphere light to exist");
  assert.equal(hemiLight.intensity, 0.75);

  // HydraSource: changing one axis should trigger canvas resize
  const source = new HydraSource({ width: 100, height: 100, label: "s0" });
  const ctx = source.initCanvas(100, 200);
  assert.equal(ctx.canvas.width, 100);
  assert.equal(ctx.canvas.height, 200);
  source.initCanvas(100, 300);
  assert.equal(ctx.canvas.width, 100);
  assert.equal(ctx.canvas.height, 300);

  // arr.image(): should resolve image pixels and metadata
  let callbackData = null;
  setGlobal("tx", {
    load: (_url, onLoad) => {
      const image = { width: 2, height: 1, complete: true };
      const texture = { image };
      if (typeof onLoad === "function") onLoad(texture);
      return texture;
    },
  });
  const data = await arr.image("mock://image.png", (value) => {
    callbackData = value;
  });
  assert.ok(data instanceof Uint8Array);
  assert.equal(data.width, 2);
  assert.equal(data.height, 1);
  assert.deepEqual(Array.from(data), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(callbackData, data);

  // VideoRecorder: source buffer assignment should not reference undefined variable
  const recorder = new VideoRecorder({ getTracks: () => [] });
  recorder.mediaSource.dispatchEvent({ type: "sourceopen" });
  assert.equal(recorder.sourceBuffer.type, "source-buffer");
} finally {
  restoreGlobal("window", originalDescriptors.window);
  restoreGlobal("document", originalDescriptors.document);
  restoreGlobal("navigator", originalDescriptors.navigator);
  restoreGlobal("MediaSource", originalDescriptors.MediaSource);
  restoreGlobal("tx", originalDescriptors.tx);
}

console.log("regression smoke test passed");
