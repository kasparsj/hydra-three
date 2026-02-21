import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, firefox } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..", "..");
const browserArg = process.argv.find((arg) => arg.startsWith("--browser="));
const browserName = browserArg
  ? browserArg.replace("--browser=", "").toLowerCase()
  : "chromium";
const PAGE_LOAD_TIMEOUT_MS = 30000;
const READY_TIMEOUT_MS = 60000;
const smokePath = "/__non_global_3d_smoke__.html";

const launchers = {
  chromium,
  firefox,
};

if (!launchers[browserName]) {
  throw new Error(
    `Unsupported browser "${browserName}". Use one of: ${Object.keys(launchers).join(", ")}`,
  );
}

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
    <title>non-global 3d smoke</title>
    <style>
      html, body { margin: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
      canvas { width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <script src="/dist/hydra-synth.js"></script>
    <script>
      window.__smoke = {
        ready: false,
        error: null,
        hasGlobalOsc: null,
        hasLoadScript: null,
        hasGetCode: null,
        hasProcessFunction: null,
        hasLoadScriptAfterDispose: null,
        hasGetCodeAfterDispose: null,
        fadeNeedsSwap: null,
        scenePassRenderTargetCleared: null,
        terminalPassRenderTargetApplied: null,
        canvasCount: 0
      };
      try {
        const hydra = new Hydra({ detectAudio: false, makeGlobal: false });
        const H = hydra.synth;
        H.perspective([2, 2, 3], [0, 0, 0], { controls: false });
        const sc = H.scene()
          .lights({ hemi: { intensity: 0.8 } })
          .world({ ground: true, groundRelief: 0.15, groundNoise: 'improved', groundNoiseF: 0.2, groundNoiseZ: 0.3 })
          .mesh(H.gm.box(), H.osc(8, 0.1, 0.8).phong())
          .out();
        if (!sc || !sc.at(0)) {
          throw new Error('3D scene did not create a mesh')
        }
        const output = hydra.o[0]
        output.autoClear(0.5, 0x000000)
        const outputRenderTarget = H.tx.fbo({ width: 64, height: 64 })
        const pipelineScene = H.scene({ name: '__pipelineProbe' })
          .mesh(H.gm.box(), H.osc(5, 0.05, 0.6).phong())
        output._set([
          {
            scene: pipelineScene,
            camera: output._camera,
            autoClear: { amount: 1 },
            layers: [],
            fx: {
              sepia: 0.2,
              rgbShift: 0.001
            },
            renderTarget: outputRenderTarget
          }
        ], {})
        hydra.tick(16)
        hydra.tick(16)
        const pipelinePasses = output.composer.passes
        const scenePass = pipelinePasses.find((pass) => !!pass.scene)
        const terminalPass = pipelinePasses[pipelinePasses.length - 1]
        window.__smoke.fadeNeedsSwap = !!(pipelinePasses[0] && pipelinePasses[0].needsSwap === true)
        window.__smoke.scenePassRenderTargetCleared = !!(scenePass && scenePass.renderTarget == null)
        window.__smoke.terminalPassRenderTargetApplied = !!(terminalPass && terminalPass.renderTarget === outputRenderTarget)
        window.__smoke.hasGlobalOsc = typeof window.osc === 'function'
        window.__smoke.hasLoadScript = typeof window.loadScript === 'function'
        window.__smoke.hasGetCode = typeof window.getCode === 'function'
        window.__smoke.hasProcessFunction = typeof window.processFunction === 'function'
        window.__smoke.canvasCount = document.querySelectorAll('canvas').length
        hydra.dispose()
        window.__smoke.hasLoadScriptAfterDispose = typeof window.loadScript === 'function'
        window.__smoke.hasGetCodeAfterDispose = typeof window.getCode === 'function'
        window.__smoke.ready = true
      } catch (error) {
        window.__smoke.error = error && error.stack ? error.stack : String(error)
      }
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

const browser = await launchers[browserName].launch({ headless: true });
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
    `Non-global 3D smoke failed:\n${diagnostics.error}`,
  );
  assert.equal(diagnostics.ready, true, "Smoke flag did not reach ready=true");
  assert.ok(
    diagnostics.canvasCount > 0,
    `Expected canvasCount > 0, got ${diagnostics.canvasCount}`,
  );
  assert.equal(
    diagnostics.hasGlobalOsc,
    false,
    "Expected makeGlobal:false to avoid installing window.osc",
  );
  assert.equal(
    diagnostics.hasLoadScript,
    false,
    "Expected makeGlobal:false to avoid installing window.loadScript",
  );
  assert.equal(
    diagnostics.hasGetCode,
    false,
    "Expected makeGlobal:false to avoid installing window.getCode",
  );
  assert.equal(
    diagnostics.hasProcessFunction,
    false,
    "Expected non-global runtime to avoid leaking window.processFunction",
  );
  assert.equal(
    diagnostics.hasLoadScriptAfterDispose,
    false,
    "Expected no window.loadScript after non-global dispose",
  );
  assert.equal(
    diagnostics.hasGetCodeAfterDispose,
    false,
    "Expected no window.getCode after non-global dispose",
  );
  assert.equal(
    diagnostics.fadeNeedsSwap,
    true,
    "Expected output auto-clear fade pass to swap buffers",
  );
  assert.equal(
    diagnostics.scenePassRenderTargetCleared,
    true,
    "Expected scene pass renderTarget to be cleared when fx passes follow",
  );
  assert.equal(
    diagnostics.terminalPassRenderTargetApplied,
    true,
    "Expected terminal pass to receive explicit renderTarget",
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

console.log(`${browserName} non-global 3d smoke test passed`);
