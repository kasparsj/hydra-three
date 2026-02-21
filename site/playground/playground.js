import { playgroundExamples } from "./examples.js";

const URL_KEYS = Object.freeze({
  example: "example",
  code: "code",
  params: "params",
});
const FLOAT_EPSILON = 1e-9;

const els = {
  exampleSelect: document.getElementById("example-select"),
  runButton: document.getElementById("run-btn"),
  resetButton: document.getElementById("reset-btn"),
  copyLinkButton: document.getElementById("copy-link-btn"),
  status: document.getElementById("status"),
  shareStatus: document.getElementById("share-status"),
  controls: document.getElementById("controls"),
  code: document.getElementById("code-editor"),
  canvas: document.getElementById("playground-canvas"),
  error: document.getElementById("error"),
};

const state = {
  runtime: null,
  selectedExample: playgroundExamples[0],
  values: {},
  debounceId: null,
  shareDebounceId: null,
  shareStatusTimeoutId: null,
};

const asNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const isSameNumber = (left, right) => Math.abs(left - right) <= FLOAT_EPSILON;

const syncCanvasResolution = () => {
  const rect = els.canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * dpr));
  const height = Math.max(1, Math.floor(rect.height * dpr));
  if (els.canvas.width !== width || els.canvas.height !== height) {
    els.canvas.width = width;
    els.canvas.height = height;
  }
};

const setStatus = (text, isError = false) => {
  els.status.textContent = text;
  els.status.dataset.state = isError ? "error" : "ok";
};

const clearError = () => {
  els.error.textContent = "";
  els.error.hidden = true;
};

const showError = (error) => {
  const message = error && error.stack ? error.stack : String(error);
  els.error.textContent = message;
  els.error.hidden = false;
};

const setShareStatus = (text, isError = false) => {
  if (!els.shareStatus) {
    return;
  }

  window.clearTimeout(state.shareStatusTimeoutId);
  els.shareStatus.textContent = text;
  els.shareStatus.dataset.state = isError ? "error" : "ok";
  if (text) {
    state.shareStatusTimeoutId = window.setTimeout(() => {
      els.shareStatus.textContent = "";
      delete els.shareStatus.dataset.state;
    }, 2400);
  }
};

const disposeRuntime = () => {
  if (!state.runtime) {
    return;
  }
  try {
    state.runtime.dispose();
  } catch (_error) {
    // no-op
  }
  state.runtime = null;
};

const toParamState = (example) => {
  return example.params.reduce((acc, param) => {
    acc[param.name] = param.value;
    return acc;
  }, {});
};

const readUrlState = () => {
  const query = new URLSearchParams(window.location.search);
  let paramOverrides = null;

  if (query.has(URL_KEYS.params)) {
    try {
      const parsed = JSON.parse(query.get(URL_KEYS.params) || "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        paramOverrides = parsed;
      }
    } catch (_error) {
      paramOverrides = null;
    }
  }

  return {
    exampleId: query.get(URL_KEYS.example),
    hasCodeOverride: query.has(URL_KEYS.code),
    codeOverride: query.get(URL_KEYS.code) || "",
    paramOverrides,
  };
};

const applyParamOverrides = (overrides) => {
  if (!overrides || typeof overrides !== "object") {
    return;
  }

  state.selectedExample.params.forEach((param) => {
    if (!(param.name in overrides)) {
      return;
    }
    const parsed = asNumber(overrides[param.name]);
    state.values[param.name] = clamp(parsed, param.min, param.max);
  });
};

const collectParamOverrides = () => {
  const overrides = {};
  state.selectedExample.params.forEach((param) => {
    const value = asNumber(state.values[param.name]);
    if (!isSameNumber(value, param.value)) {
      overrides[param.name] = value;
    }
  });
  return overrides;
};

const buildShareUrl = () => {
  const nextUrl = new URL(window.location.href);
  const query = new URLSearchParams(nextUrl.search);
  const codeValue = els.code.value;
  const defaultCode = state.selectedExample.code.trimStart();
  const paramOverrides = collectParamOverrides();

  query.set(URL_KEYS.example, state.selectedExample.id);
  if (codeValue !== defaultCode) {
    query.set(URL_KEYS.code, codeValue);
  } else {
    query.delete(URL_KEYS.code);
  }

  if (Object.keys(paramOverrides).length > 0) {
    query.set(URL_KEYS.params, JSON.stringify(paramOverrides));
  } else {
    query.delete(URL_KEYS.params);
  }

  nextUrl.search = query.toString();
  return nextUrl;
};

const syncShareUrl = ({ replace = true } = {}) => {
  const nextUrl = buildShareUrl();
  if (
    nextUrl.pathname === window.location.pathname &&
    nextUrl.search === window.location.search &&
    nextUrl.hash === window.location.hash
  ) {
    return;
  }

  const method = replace ? "replaceState" : "pushState";
  window.history[method](null, "", nextUrl.toString());
};

const queueShareSync = () => {
  window.clearTimeout(state.shareDebounceId);
  state.shareDebounceId = window.setTimeout(() => {
    syncShareUrl({ replace: true });
  }, 160);
};

const copyShareLink = async () => {
  const shareUrl = buildShareUrl().toString();

  try {
    if (
      !navigator.clipboard ||
      typeof navigator.clipboard.writeText !== "function"
    ) {
      throw new Error("Clipboard API unavailable");
    }
    await navigator.clipboard.writeText(shareUrl);
    syncShareUrl({ replace: true });
    setShareStatus("Link copied.");
  } catch (_error) {
    setShareStatus("Clipboard blocked. Copy from the address bar.", true);
  }
};

const createControl = (param) => {
  const wrapper = document.createElement("div");
  wrapper.className = "param-row";

  const label = document.createElement("label");
  label.textContent = param.label;
  label.htmlFor = `param-${param.name}`;

  const slider = document.createElement("input");
  slider.type = "range";
  slider.id = `param-${param.name}`;
  slider.min = String(param.min);
  slider.max = String(param.max);
  slider.step = String(param.step);
  slider.value = String(state.values[param.name]);

  const number = document.createElement("input");
  number.type = "number";
  number.min = String(param.min);
  number.max = String(param.max);
  number.step = String(param.step);
  number.value = String(state.values[param.name]);

  const setValue = (value) => {
    const parsed = asNumber(value);
    const clamped = clamp(parsed, param.min, param.max);
    state.values[param.name] = clamped;
    slider.value = String(clamped);
    number.value = String(clamped);
    queueShareSync();
    queueRun();
  };

  slider.addEventListener("input", (event) => {
    setValue(event.target.value);
  });

  number.addEventListener("input", (event) => {
    setValue(event.target.value);
  });

  wrapper.appendChild(label);
  wrapper.appendChild(slider);
  wrapper.appendChild(number);

  return wrapper;
};

const renderControls = () => {
  els.controls.replaceChildren();
  state.selectedExample.params.forEach((param) => {
    els.controls.appendChild(createControl(param));
  });
};

const loadExample = (exampleId, options = {}) => {
  const {
    hasCodeOverride = false,
    codeOverride = "",
    paramOverrides = null,
    run = true,
    syncShare = true,
  } = options;
  const nextExample =
    playgroundExamples.find((example) => example.id === exampleId) ||
    playgroundExamples[0];
  state.selectedExample = nextExample;
  state.values = toParamState(nextExample);
  applyParamOverrides(paramOverrides);
  els.code.value = hasCodeOverride
    ? codeOverride
    : nextExample.code.trimStart();
  els.exampleSelect.value = nextExample.id;
  renderControls();
  if (syncShare) {
    queueShareSync();
  }
  if (run) {
    runSketch();
  }
};

const queueRun = () => {
  window.clearTimeout(state.debounceId);
  state.debounceId = window.setTimeout(() => {
    runSketch();
  }, 180);
};

const runSketch = () => {
  clearError();
  setStatus("Running");
  syncCanvasResolution();
  disposeRuntime();

  try {
    if (typeof window.Hydra !== "function") {
      throw new Error(
        "Hydra runtime is unavailable. Ensure dist/hydra-synth.js is loaded.",
      );
    }

    const hydra = new window.Hydra({
      canvas: els.canvas,
      detectAudio: false,
      makeGlobal: true,
      autoLoop: true,
    });

    state.runtime = hydra;
    window.__playgroundParams = { ...state.values };

    const script = `const params = window.__playgroundParams;\n${els.code.value}`;
    hydra.eval(script);

    setStatus("Live");
  } catch (error) {
    setStatus("Error", true);
    showError(error);
  }
};

const initialize = () => {
  playgroundExamples.forEach((example) => {
    const option = document.createElement("option");
    option.value = example.id;
    option.textContent = example.label;
    els.exampleSelect.appendChild(option);
  });

  els.exampleSelect.addEventListener("change", (event) => {
    loadExample(event.target.value);
  });

  els.runButton.addEventListener("click", () => {
    runSketch();
  });

  els.resetButton.addEventListener("click", () => {
    loadExample(state.selectedExample.id);
  });

  els.code.addEventListener("input", () => {
    queueShareSync();
    queueRun();
  });

  if (els.copyLinkButton) {
    els.copyLinkButton.addEventListener("click", () => {
      copyShareLink();
    });
  }

  window.addEventListener("resize", () => {
    queueRun();
  });

  const seed = readUrlState();
  loadExample(seed.exampleId || playgroundExamples[0].id, {
    hasCodeOverride: seed.hasCodeOverride,
    codeOverride: seed.codeOverride,
    paramOverrides: seed.paramOverrides,
    syncShare: false,
  });
  syncShareUrl({ replace: true });
};

initialize();
