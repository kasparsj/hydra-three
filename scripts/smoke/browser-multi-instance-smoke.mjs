import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..", "..");
const PAGE_LOAD_TIMEOUT_MS = 30000;
const READY_TIMEOUT_MS = 60000;
const smokePath = "/__multi_instance_smoke__.html";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

const smokeHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>multi-instance smoke</title>
    <style>
      html, body { margin: 0; width: 100%; height: 100%; background: #000; }
      #root { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; height: 100%; }
      canvas { width: 100%; height: 100%; min-height: 320px; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script src="/dist/hydra-synth.js"></script>
    <script>
      window.__smoke = {
        ready: false,
        error: null,
        globalHelpersInstalled: null,
        globalHelpersPersistAfterFirstDispose: null,
        globalHelpersRestored: null,
        mathHelpersInstalled: null,
        mathHelpersPersistAfterFirstDispose: null,
        mathHelpersRestored: null,
        guiFallbackUsed: null
      };
      (async () => {
        const root = document.getElementById('root');
        const canvasA = document.createElement('canvas');
        const canvasB = document.createElement('canvas');
        root.appendChild(canvasA);
        root.appendChild(canvasB);

        const hydraA = new Hydra({ detectAudio: false, makeGlobal: false, autoLoop: false, canvas: canvasA });
        const hydraB = new Hydra({ detectAudio: false, makeGlobal: false, autoLoop: false, canvas: canvasB });
        const A = hydraA.synth;
        const B = hydraB.synth;

        const originalAppendChild = document.head.appendChild.bind(document.head);
        window.dat = undefined;
        window.loadScript = undefined;
        document.head.appendChild = (node) => {
          if (
            node &&
            node.tagName === 'SCRIPT' &&
            typeof node.src === 'string' &&
            node.src.includes('dat.gui')
          ) {
            if (typeof node.onerror === 'function') node.onerror(new Error('mock dat.gui load error'));
            return node;
          }
          return originalAppendChild(node);
        };
        await A.gui.init();
        if (!window.dat || !window.dat.__hydraFallback || !window.dat.__hydraPatched) {
          throw new Error('GUI init did not install patched fallback dat gui');
        }
        window.__smoke.guiFallbackUsed = true;
        document.head.appendChild = originalAppendChild;

        A.osc(6, 0.1, 0.6).out();
        B.osc(10, 0.1, 0.4).out();

        const sceneA = A.scene().mesh(A.gm.box(), A.osc(8, 0.1, 0.8).phong()).out();
        const sceneB = B.scene().mesh(B.gm.box(), B.noise(3).phong()).out();
        if (!sceneA.at(0) || !sceneB.at(0)) {
          throw new Error('Failed to create meshes for both runtimes');
        }

        const sharedSceneName = '__sharedScene';
        const sharedMeshName = '__sharedMesh';
        const namedSceneA = A.scene({ name: sharedSceneName });
        const namedSceneB = B.scene({ name: sharedSceneName });
        namedSceneA.mesh(A.gm.box(), A.solid(1, 0, 0).phong(), { name: sharedMeshName });
        namedSceneB.mesh(B.gm.sphere(), B.solid(0, 0, 1).phong(), { name: sharedMeshName });
        const namedMeshA = namedSceneA.find({ name: sharedMeshName })[0];
        const namedMeshB = namedSceneB.find({ name: sharedMeshName })[0];
        if (!namedMeshA || !namedMeshB || namedMeshA === namedMeshB) {
          throw new Error('Per-runtime named scene/object cache isolation failed');
        }

        const worldScene = A.scene().world({ sun: true, far: 20, ground: false, fog: false });
        const worldGroup = worldScene.group({ name: '__world' });
        const sun = worldGroup.find({ name: '__sun' })[0];
        if (!sun || !Number.isFinite(sun.position.x) || !Number.isFinite(sun.position.y) || !Number.isFinite(sun.position.z)) {
          throw new Error('World sun defaults produced invalid position');
        }

        hydraA.tick(16);
        hydraB.tick(16);

        hydraA.dispose();
        hydraB.tick(16);
        B.scene().mesh(B.gm.sphere(), B.osc(4, 0.1, 0.5).phong()).out();
        hydraB.tick(16);

        const globalCanvasA = document.createElement('canvas');
        const globalCanvasB = document.createElement('canvas');
        root.appendChild(globalCanvasA);
        root.appendChild(globalCanvasB);
        const originalLoadScript = window.loadScript;
        const originalGetCode = window.getCode;
        const originalGridGeometry = window.GridGeometry;
        const originalMathMap = Math.map;
        const hydraGlobalA = new Hydra({
          detectAudio: false,
          makeGlobal: true,
          autoLoop: false,
          canvas: globalCanvasA
        });
        const hydraGlobalB = new Hydra({
          detectAudio: false,
          makeGlobal: true,
          autoLoop: false,
          canvas: globalCanvasB
        });
        window.__smoke.globalHelpersInstalled =
          typeof window.loadScript === 'function' &&
          typeof window.getCode === 'function' &&
          typeof window.GridGeometry === 'function';
        window.__smoke.mathHelpersInstalled = typeof Math.map === 'function';
        hydraGlobalA.dispose();
        window.__smoke.globalHelpersPersistAfterFirstDispose =
          typeof window.loadScript === 'function' &&
          typeof window.getCode === 'function' &&
          typeof window.GridGeometry === 'function';
        window.__smoke.mathHelpersPersistAfterFirstDispose = typeof Math.map === 'function';
        hydraGlobalB.dispose();
        window.__smoke.globalHelpersRestored =
          window.loadScript === originalLoadScript &&
          window.getCode === originalGetCode &&
          window.GridGeometry === originalGridGeometry;
        window.__smoke.mathHelpersRestored = Math.map === originalMathMap;

        window.__smoke.ready = true;
        window.__smoke.disposedState = hydraA._disposed === true && hydraB._disposed === false;
        window.__smoke.hasGlobalOsc = typeof window.osc === 'function';
        window.__smoke.canvasCount = document.querySelectorAll('canvas').length;

        hydraB.dispose();
      })().catch((error) => {
        window.__smoke.error = error && error.stack ? error.stack : String(error);
      });
    </script>
  </body>
</html>
`;

const resolvePath = (requestPath) => {
  const cleanPath = requestPath.split("?")[0];
  const relativePath = decodeURIComponent(cleanPath).replace(/^\/+/, "");
  const filePath = path.resolve(rootDir, relativePath);
  if (!filePath.startsWith(rootDir)) {
    return null;
  }
  return filePath;
};

const server = createServer(async (req, res) => {
  try {
    const urlPath = req.url || "/";
    if (urlPath.split("?")[0] === smokePath) {
      res.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      });
      res.end(smokeHtml);
      return;
    }

    const filePath = resolvePath(urlPath);
    if (!filePath) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    const data = await readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, {
      "content-type": contentTypes[ext] || "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(data);
  } catch (_error) {
    res.writeHead(404);
    res.end("Not found");
  }
});

const listen = () =>
  new Promise((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
    server.on("error", reject);
  });

const closeServer = () =>
  new Promise((resolve) => {
    server.close(() => resolve());
  });

const port = await listen();
const url = `http://127.0.0.1:${port}${smokePath}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];

page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") {
    errors.push(`console error: ${msg.text()}`);
  }
});

try {
  await page.goto(url, { waitUntil: "load", timeout: PAGE_LOAD_TIMEOUT_MS });
  await page.waitForFunction(
    () => window.__smoke && (window.__smoke.ready || !!window.__smoke.error),
    { timeout: READY_TIMEOUT_MS, polling: 100 },
  );

  const diagnostics = await page.evaluate(() => window.__smoke);
  assert.equal(
    diagnostics.error,
    null,
    `Multi-instance smoke failed:\n${diagnostics.error}`,
  );
  assert.equal(diagnostics.ready, true, "Smoke flag did not reach ready=true");
  assert.equal(
    diagnostics.disposedState,
    true,
    "Expected dispose() state transitions to be correct",
  );
  assert.equal(
    diagnostics.hasGlobalOsc,
    false,
    "Expected non-global mode to avoid window.osc",
  );
  assert.equal(
    diagnostics.globalHelpersInstalled,
    true,
    "Expected global-mode helper globals to install (including GridGeometry)",
  );
  assert.equal(
    diagnostics.globalHelpersPersistAfterFirstDispose,
    true,
    "Expected helper globals to persist while one global instance remains (including GridGeometry)",
  );
  assert.equal(
    diagnostics.globalHelpersRestored,
    true,
    "Expected helper globals to restore after all global instances dispose (including GridGeometry)",
  );
  assert.equal(
    diagnostics.mathHelpersInstalled,
    true,
    "Expected Math helper bindings to install in global mode",
  );
  assert.equal(
    diagnostics.mathHelpersPersistAfterFirstDispose,
    true,
    "Expected Math helper bindings to persist while one global instance remains",
  );
  assert.equal(
    diagnostics.mathHelpersRestored,
    true,
    "Expected Math helper bindings to restore after all global instances dispose",
  );
  assert.equal(
    diagnostics.guiFallbackUsed,
    true,
    "Expected gui.init() to succeed with fallback when dat.gui script cannot load",
  );
  assert.ok(
    diagnostics.canvasCount >= 2,
    `Expected at least 2 canvases, got ${diagnostics.canvasCount}`,
  );
  assert.deepEqual(
    errors,
    [],
    `Unexpected runtime errors:\n${errors.join("\n")}`,
  );
} finally {
  await browser.close();
  await closeServer();
}

console.log("chromium multi-instance smoke test passed");
