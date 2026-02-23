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
        hasGridGeometry: null,
        hasProcessFunction: null,
        hasMathMap: null,
        hasLoadScriptAfterDispose: null,
        hasGetCodeAfterDispose: null,
        hasGridGeometryAfterDispose: null,
        hasMathMapAfterDispose: null,
        fadeNeedsSwap: null,
        scenePassRenderTargetCleared: null,
        terminalPassRenderTargetApplied: null,
        edgeChainFirstSegmentTargetApplied: null,
        edgeChainSecondSceneTargetIsolated: null,
        onErrorCaptured: null,
        onErrorContext: null,
        onErrorMessage: null,
        continuousPruneRemovedStaleMesh: null,
        continuousPrunePreservedTouchedMesh: null,
        continuousKeyedIdentityStable: null,
        continuousDisposeReleasedRemovedResources: null,
        continuousDisposeRetainedSharedMaterial: null,
        continuousDisposeReleasedReplacedResources: null,
        continuousDisposeRetainedSharedReplacementMaterial: null,
        canvasInputReboundToActiveRuntime: null,
        keyboardInputReboundToActiveRuntime: null,
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
        const singlePassPipeline = output.composer.passes
        const singlePassScene = singlePassPipeline.find((pass) => !!pass.scene)
        const singlePassTerminal = singlePassPipeline[singlePassPipeline.length - 1]
        window.__smoke.fadeNeedsSwap = !!(singlePassPipeline[0] && singlePassPipeline[0].needsSwap === true)
        window.__smoke.scenePassRenderTargetCleared = !!(singlePassScene && singlePassScene.renderTarget == null)
        window.__smoke.terminalPassRenderTargetApplied = !!(singlePassTerminal && singlePassTerminal.renderTarget === outputRenderTarget)
        const edgeRenderTarget = H.tx.fbo({ width: 32, height: 32 })
        const edgeSceneA = H.scene({ name: '__edgePipelineA' }).mesh(H.gm.box(), H.solid(0.2, 0.3, 0.8).phong())
        const edgeSceneB = H.scene({ name: '__edgePipelineB' }).mesh(H.gm.sphere(), H.solid(0.8, 0.2, 0.3).phong())
        output._set([
          {
            scene: edgeSceneA,
            camera: output._camera,
            autoClear: { amount: 1 },
            layers: [],
            fx: { sepia: 0.1, rgbShift: 0.0005 },
            renderTarget: edgeRenderTarget
          },
          {
            scene: edgeSceneB,
            camera: output._camera,
            autoClear: { amount: 1 },
            layers: []
          }
        ], {})
        hydra.tick(16)
        hydra.tick(16)
        const pipelinePasses = output.composer.passes
        const scenePassIndexes = pipelinePasses
          .map((pass, index) => (pass && pass.scene ? index : -1))
          .filter((index) => index >= 0)
        if (scenePassIndexes.length >= 2) {
          const betweenFirstAndSecondScene = pipelinePasses.slice(scenePassIndexes[0] + 1, scenePassIndexes[1])
          const firstEdgeScenePass = pipelinePasses[scenePassIndexes[0]]
          const secondEdgeScenePass = pipelinePasses[scenePassIndexes[1]]
          window.__smoke.edgeChainFirstSegmentTargetApplied =
            betweenFirstAndSecondScene.some((pass) => pass && pass.renderTarget === edgeRenderTarget) &&
            firstEdgeScenePass.renderTarget == null
          window.__smoke.edgeChainSecondSceneTargetIsolated = secondEdgeScenePass.renderTarget == null
        } else {
          window.__smoke.edgeChainFirstSegmentTargetApplied = false
          window.__smoke.edgeChainSecondSceneTargetIsolated = false
        }
        H.onError = (error, context) => {
          window.__smoke.onErrorCaptured = true
          window.__smoke.onErrorContext = context && context.context
          window.__smoke.onErrorMessage = error && error.message ? error.message : String(error)
        }
        H.update = () => {
          throw new Error('__smoke_update_error__')
        }
        hydra.tick(16)
        H.update = () => {}
        window.__smokeRuntime = hydra
        H.scene({ name: "__continuousPrune" })
          .mesh(H.gm.box(), H.mt.meshBasic({ color: 0xff0000 }))
          .out()
        const pruneBefore = H.scene({ name: "__continuousPrune" }).find({ isMesh: true }).length
        hydra.eval(
          'const H = window.__smokeRuntime.synth; H.scene({ name: "__continuousPrune" }).out();',
        )
        const pruneAfter = H.scene({ name: "__continuousPrune" }).find({ isMesh: true }).length
        window.__smoke.continuousPruneRemovedStaleMesh =
          pruneBefore > 0 && pruneAfter === 0

        H.scene({ name: "__continuousTouch" })
          .mesh(H.gm.box(), H.mt.meshBasic({ color: 0x00ff00 }))
          .out()
        hydra.eval(
          'const H = window.__smokeRuntime.synth; const sc = H.scene({ name: "__continuousTouch" }).out(); const obj = sc.at(0); if (obj) { obj.rotation.x += 0.01; }',
        )
        const touchAfter = H.scene({ name: "__continuousTouch" }).find({ isMesh: true }).length
        window.__smoke.continuousPrunePreservedTouchedMesh = touchAfter === 1

        const keyedScene = H.scene({ name: "__continuousKeyed" }).out()
        keyedScene.mesh(
          H.gm.box(),
          H.mt.meshBasic({ color: 0x33aaff }),
          { key: "mesh-a" },
        )
        keyedScene.mesh(
          H.gm.box(),
          H.mt.meshBasic({ color: 0xffaa33 }),
          { key: "mesh-b" },
        )
        const keyedBefore = H.scene({ name: "__continuousKeyed" }).find({ isMesh: true })
        const keyedBeforeByKey = {}
        keyedBefore.forEach((mesh) => {
          keyedBeforeByKey[mesh.userData && mesh.userData.__hydraLiveKey] = mesh.uuid
        })
        hydra.eval(
          'const H = window.__smokeRuntime.synth; const sc = H.scene({ name: "__continuousKeyed" }).out(); sc.mesh(H.gm.box(), H.mt.meshBasic({ color: 0x44ccff }), { key: "mesh-b" }); sc.mesh(H.gm.box(), H.mt.meshBasic({ color: 0xffcc44 }), { key: "mesh-a" });',
        )
        const keyedAfter = H.scene({ name: "__continuousKeyed" }).find({ isMesh: true })
        const keyedAfterByKey = {}
        keyedAfter.forEach((mesh) => {
          keyedAfterByKey[mesh.userData && mesh.userData.__hydraLiveKey] = mesh.uuid
        })
        window.__smoke.continuousKeyedIdentityStable =
          keyedAfter.length === 2 &&
          keyedBeforeByKey["mesh-a"] === keyedAfterByKey["mesh-a"] &&
          keyedBeforeByKey["mesh-b"] === keyedAfterByKey["mesh-b"]

        const disposableGeometry = H.gm.box()
        const disposableMaterial = H.mt.meshBasic({ color: 0xaaff66 })
        let staleGeometryDisposeCount = 0
        let staleMaterialDisposeCount = 0
        const disposeGeometry = disposableGeometry.dispose.bind(disposableGeometry)
        const disposeMaterial = disposableMaterial.dispose.bind(disposableMaterial)
        disposableGeometry.dispose = () => {
          staleGeometryDisposeCount += 1
          disposeGeometry()
        }
        disposableMaterial.dispose = () => {
          staleMaterialDisposeCount += 1
          disposeMaterial()
        }
        H.scene({ name: "__continuousDispose" })
          .mesh(disposableGeometry, disposableMaterial, { key: "dispose-mesh" })
          .out()
        hydra.eval(
          'const H = window.__smokeRuntime.synth; H.scene({ name: "__continuousDispose" }).out();',
        )
        window.__smoke.continuousDisposeReleasedRemovedResources =
          staleGeometryDisposeCount === 1 && staleMaterialDisposeCount === 1

        let sharedMaterialDisposeCount = 0
        const sharedMaterial = H.mt.meshBasic({ color: 0x3388ff })
        const disposeSharedMaterial = sharedMaterial.dispose.bind(sharedMaterial)
        sharedMaterial.dispose = () => {
          sharedMaterialDisposeCount += 1
          disposeSharedMaterial()
        }
        window.__smokeSharedMaterial = sharedMaterial
        const sharedScene = H.scene({ name: "__continuousSharedMaterial" }).out()
        sharedScene.mesh(H.gm.box(), sharedMaterial, { key: "keep" })
        sharedScene.mesh(H.gm.box(), sharedMaterial, { key: "drop" })
        hydra.eval(
          'const H = window.__smokeRuntime.synth; const sc = H.scene({ name: "__continuousSharedMaterial" }).out(); sc.mesh(H.gm.box(), window.__smokeSharedMaterial, { key: "keep" });',
        )
        window.__smoke.continuousDisposeRetainedSharedMaterial =
          sharedMaterialDisposeCount === 0
        delete window.__smokeSharedMaterial

        const replacedGeometry = H.gm.box()
        const replacedMaterial = H.mt.meshBasic({ color: 0xcc66ff })
        let replacedGeometryDisposeCount = 0
        let replacedMaterialDisposeCount = 0
        const disposeReplacedGeometry = replacedGeometry.dispose.bind(replacedGeometry)
        const disposeReplacedMaterial = replacedMaterial.dispose.bind(replacedMaterial)
        replacedGeometry.dispose = () => {
          replacedGeometryDisposeCount += 1
          disposeReplacedGeometry()
        }
        replacedMaterial.dispose = () => {
          replacedMaterialDisposeCount += 1
          disposeReplacedMaterial()
        }
        H.scene({ name: "__continuousReplace" })
          .mesh(replacedGeometry, replacedMaterial, { key: "replace-mesh" })
          .out()
        window.__smokeReplacementGeometry = H.gm.sphere()
        window.__smokeReplacementMaterial = H.mt.meshBasic({ color: 0x66ccff })
        hydra.eval(
          'const H = window.__smokeRuntime.synth; const sc = H.scene({ name: "__continuousReplace" }).out(); sc.mesh(window.__smokeReplacementGeometry, window.__smokeReplacementMaterial, { key: "replace-mesh" });',
        )
        window.__smoke.continuousDisposeReleasedReplacedResources =
          replacedGeometryDisposeCount === 1 && replacedMaterialDisposeCount === 1
        delete window.__smokeReplacementGeometry
        delete window.__smokeReplacementMaterial

        let sharedReplacementMaterialDisposeCount = 0
        const sharedReplacementMaterial = H.mt.meshBasic({ color: 0x55aaff })
        const disposeSharedReplacementMaterial = sharedReplacementMaterial.dispose.bind(
          sharedReplacementMaterial,
        )
        sharedReplacementMaterial.dispose = () => {
          sharedReplacementMaterialDisposeCount += 1
          disposeSharedReplacementMaterial()
        }
        const sharedReplaceScene = H.scene({ name: "__continuousReplaceShared" }).out()
        sharedReplaceScene.mesh(H.gm.box(), sharedReplacementMaterial, {
          key: "replace-left",
        })
        sharedReplaceScene.mesh(H.gm.box(), sharedReplacementMaterial, {
          key: "replace-right",
        })
        window.__smokeSharedReplacementMaterial = sharedReplacementMaterial
        window.__smokeReplacementLeftMaterial = H.mt.meshBasic({ color: 0xff8855 })
        hydra.eval(
          'const H = window.__smokeRuntime.synth; const sc = H.scene({ name: "__continuousReplaceShared" }).out(); sc.mesh(H.gm.box(), window.__smokeReplacementLeftMaterial, { key: "replace-left" }); sc.mesh(H.gm.box(), window.__smokeSharedReplacementMaterial, { key: "replace-right" });',
        )
        window.__smoke.continuousDisposeRetainedSharedReplacementMaterial =
          sharedReplacementMaterialDisposeCount === 0
        delete window.__smokeSharedReplacementMaterial
        delete window.__smokeReplacementLeftMaterial

        delete window.__smokeRuntime
        window.__smoke.hasGlobalOsc = typeof window.osc === 'function'
        window.__smoke.hasLoadScript = typeof window.loadScript === 'function'
        window.__smoke.hasGetCode = typeof window.getCode === 'function'
        window.__smoke.hasGridGeometry = typeof window.GridGeometry === 'function'
        window.__smoke.hasProcessFunction = typeof window.processFunction === 'function'
        window.__smoke.hasMathMap = typeof Math.map === 'function'
        window.__smoke.canvasCount = document.querySelectorAll('canvas').length

        const reusedCanvas = hydra.canvas
        let firstRuntimeClickCount = 0
        let firstRuntimeKeydownCount = 0
        hydra.synth.click = () => {
          firstRuntimeClickCount += 1
        }
        hydra.synth.keydown = () => {
          firstRuntimeKeydownCount += 1
        }
        reusedCanvas.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
        hydra.dispose()
        window.__smoke.hasLoadScriptAfterDispose = typeof window.loadScript === 'function'
        window.__smoke.hasGetCodeAfterDispose = typeof window.getCode === 'function'
        window.__smoke.hasGridGeometryAfterDispose = typeof window.GridGeometry === 'function'
        window.__smoke.hasMathMapAfterDispose = typeof Math.map === 'function'

        const reboundRuntime = new Hydra({
          canvas: reusedCanvas,
          detectAudio: false,
          makeGlobal: false,
          autoLoop: false,
        })
        let reboundRuntimeClickCount = 0
        let reboundRuntimeKeydownCount = 0
        reboundRuntime.synth.click = () => {
          reboundRuntimeClickCount += 1
        }
        reboundRuntime.synth.keydown = () => {
          reboundRuntimeKeydownCount += 1
        }
        reusedCanvas.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', bubbles: true }))
        window.__smoke.canvasInputReboundToActiveRuntime =
          firstRuntimeClickCount === 1 && reboundRuntimeClickCount === 1
        window.__smoke.keyboardInputReboundToActiveRuntime =
          firstRuntimeKeydownCount === 1 && reboundRuntimeKeydownCount === 1
        reboundRuntime.dispose()
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
    diagnostics.hasGridGeometry,
    false,
    "Expected makeGlobal:false to avoid installing window.GridGeometry",
  );
  assert.equal(
    diagnostics.hasProcessFunction,
    false,
    "Expected non-global runtime to avoid leaking window.processFunction",
  );
  assert.equal(
    diagnostics.hasMathMap,
    false,
    "Expected makeGlobal:false to avoid mutating Math helpers",
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
    diagnostics.hasGridGeometryAfterDispose,
    false,
    "Expected no window.GridGeometry after non-global dispose",
  );
  assert.equal(
    diagnostics.hasMathMapAfterDispose,
    false,
    "Expected no Math helper leakage after non-global dispose",
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
  assert.equal(
    diagnostics.edgeChainFirstSegmentTargetApplied,
    true,
    "Expected explicit renderTarget to stay within first pass segment when chained",
  );
  assert.equal(
    diagnostics.edgeChainSecondSceneTargetIsolated,
    true,
    "Expected second scene pass in chained pipeline to remain target-isolated",
  );
  assert.equal(
    diagnostics.onErrorCaptured,
    true,
    "Expected synth.onError hook to capture runtime update errors",
  );
  assert.equal(
    diagnostics.onErrorContext,
    "update",
    `Expected onError context "update", got ${diagnostics.onErrorContext}`,
  );
  assert.equal(
    diagnostics.onErrorMessage,
    "__smoke_update_error__",
    `Expected onError to receive update error message, got ${diagnostics.onErrorMessage}`,
  );
  assert.equal(
    diagnostics.continuousPruneRemovedStaleMesh,
    true,
    "Expected continuous eval to remove stale mesh when creation code is removed",
  );
  assert.equal(
    diagnostics.continuousPrunePreservedTouchedMesh,
    true,
    "Expected continuous eval to preserve mesh touched via scene.at(0)",
  );
  assert.equal(
    diagnostics.continuousKeyedIdentityStable,
    true,
    "Expected keyed meshes to preserve identity across reorder in continuous eval",
  );
  assert.equal(
    diagnostics.continuousDisposeReleasedRemovedResources,
    true,
    "Expected continuous eval prune to dispose removed mesh geometry and material",
  );
  assert.equal(
    diagnostics.continuousDisposeRetainedSharedMaterial,
    true,
    "Expected shared material to stay undisposed while still referenced after prune",
  );
  assert.equal(
    diagnostics.continuousDisposeReleasedReplacedResources,
    true,
    "Expected replaced mesh geometry and material to be disposed when no longer referenced",
  );
  assert.equal(
    diagnostics.continuousDisposeRetainedSharedReplacementMaterial,
    true,
    "Expected shared material to remain undisposed when retained across mesh replacement",
  );
  assert.equal(
    diagnostics.canvasInputReboundToActiveRuntime,
    true,
    "Expected canvas input events to route to the active runtime after restart",
  );
  assert.equal(
    diagnostics.keyboardInputReboundToActiveRuntime,
    true,
    "Expected keyboard input events to route to the active runtime after restart",
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
