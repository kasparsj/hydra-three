import assert from "node:assert/strict";
import { initCanvas } from "../../src/canvas.js";

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
    this.parentElement = null;
  }
}

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;

const windowTarget = new FakeEventTarget();
windowTarget.innerWidth = 800;
windowTarget.innerHeight = 600;

const documentTarget = new FakeEventTarget();
documentTarget.body = {
  appendChild(el) {
    el.parentElement = {
      style: {},
    };
  },
};
documentTarget.createElement = (name) => {
  if (name !== "canvas") {
    throw new Error(`Unexpected element requested: ${name}`);
  }
  return new FakeCanvas();
};

globalThis.window = windowTarget;
globalThis.document = documentTarget;

const calls = [];
const events = [];
const synth = {
  width: 320,
  height: 240,
  setResolution: (width, height) => {
    calls.push([width, height]);
  },
  synth: {
    click: () => events.push("click"),
    mousedown: () => events.push("mousedown"),
    mouseup: () => events.push("mouseup"),
    mousemove: () => events.push("mousemove"),
    keydown: () => events.push("keydown"),
    keyup: () => events.push("keyup"),
  },
};

try {
  const canvas = initCanvas(undefined, synth);
  assert.equal(canvas.width, 320);
  assert.equal(canvas.height, 240);
  assert.equal(canvas.style.width, "100%");

  canvas.setAutoResize(true);
  assert.deepEqual(calls[0], [800, 600]);

  calls.length = 0;
  canvas.setAspectRatio(2);
  assert.deepEqual(calls[0], [800, 400]);

  canvas.dispatchEvent({ type: "click" });
  canvas.dispatchEvent({ type: "mousedown" });
  canvas.dispatchEvent({ type: "mouseup" });
  canvas.dispatchEvent({ type: "mousemove" });
  document.dispatchEvent({ type: "keydown" });
  document.dispatchEvent({ type: "keyup" });
  assert.deepEqual(events, [
    "click",
    "mousedown",
    "mouseup",
    "mousemove",
    "keydown",
    "keyup",
  ]);

  canvas.setAlign("center");
  assert.equal(canvas.parentElement.style["text-align"], "center");
} finally {
  globalThis.window = originalWindow;
  globalThis.document = originalDocument;
}

console.log("canvas smoke test passed");
