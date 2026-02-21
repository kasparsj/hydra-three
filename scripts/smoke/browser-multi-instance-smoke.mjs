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
      window.__smoke = { ready: false, error: null };
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

        const createFakeDat = () => {
          class FakeGUI {
            constructor() {
              this.useLocalStorage = false;
            }
            remember() {}
            addFolder() {
              const chain = { onChange() {} };
              return {
                add() {
                  return chain;
                },
                addColor() {
                  return chain;
                },
              };
            }
          }
          return {
            GUI: FakeGUI,
            controllers: {
              NumberControllerBox: {
                prototype: {
                  updateDisplay() {
                    return this;
                  },
                },
              },
            },
            dom: {
              dom: {
                isActive() {
                  return false;
                },
              },
            },
          };
        };

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
            window.dat = createFakeDat();
            if (typeof node.onload === 'function') node.onload();
            return node;
          }
          return originalAppendChild(node);
        };
        await A.gui.init();
        if (!window.dat || !window.dat.__hydraPatched) {
          throw new Error('GUI init fallback did not patch dat.gui');
        }
        document.head.appendChild = originalAppendChild;

        A.osc(6, 0.1, 0.6).out();
        B.osc(10, 0.1, 0.4).out();

        const sceneA = A.scene().mesh(A.gm.box(), A.osc(8, 0.1, 0.8).phong()).out();
        const sceneB = B.scene().mesh(B.gm.box(), B.noise(3).phong()).out();
        if (!sceneA.at(0) || !sceneB.at(0)) {
          throw new Error('Failed to create meshes for both runtimes');
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
