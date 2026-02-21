import assert from "node:assert/strict";
import { createServer } from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..", "..");
const siteDistDir = path.join(rootDir, "site-dist");

const PAGE_TIMEOUT_MS = 45000;
const RENDER_SETTLE_MS = 450;
const PLAYGROUND_SETTLE_MS = 300;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

const BENIGN_CONSOLE_ERROR_PATTERNS = [/dat\.gui/i, /favicon\.ico/i];

const isBenignConsoleError = (value) => {
  return BENIGN_CONSOLE_ERROR_PATTERNS.some((pattern) => pattern.test(value));
};

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
    const filePath = resolvePath(
      urlPath === "/" ? "/site-dist/examples/index.html" : urlPath,
    );
    if (!filePath) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    const data = await fs.readFile(filePath);
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

const collectExamplePages = async () => {
  const examplesDir = path.join(siteDistDir, "examples");
  const files = [];
  const queue = [examplesDir];

  while (queue.length > 0) {
    const current = queue.shift();
    const entries = await fs.readdir(current, { withFileTypes: true });

    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(absolutePath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".html")) {
        const relativePath = path
          .relative(siteDistDir, absolutePath)
          .split(path.sep)
          .join("/");
        if (relativePath !== "examples/index.html") {
          files.push(relativePath);
        }
      }
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
};

const getPlaygroundPresetIds = async () => {
  const moduleUrl = pathToFileURL(
    path.join(rootDir, "site", "playground", "examples.js"),
  ).href;
  const { playgroundExamples } = await import(moduleUrl);
  return playgroundExamples.map((example) => example.id);
};

const attachErrorCollectors = (page) => {
  const runtimeErrors = [];

  page.on("pageerror", (error) => {
    runtimeErrors.push(`pageerror: ${error.message}`);
  });

  page.on("console", (msg) => {
    if (msg.type() !== "error") {
      return;
    }
    const message = msg.text();
    if (isBenignConsoleError(message)) {
      return;
    }
    runtimeErrors.push(`console error: ${message}`);
  });

  return runtimeErrors;
};

const runGeneratedExampleChecks = async (browser, baseUrl, pages) => {
  const failures = [];

  for (let index = 0; index < pages.length; index += 1) {
    const relativePage = pages[index];
    const page = await browser.newPage();
    const runtimeErrors = attachErrorCollectors(page);

    try {
      await page.goto(`${baseUrl}/${relativePage}`, {
        waitUntil: "load",
        timeout: PAGE_TIMEOUT_MS,
      });
      await page.waitForSelector("canvas", { timeout: PAGE_TIMEOUT_MS });
      await page.waitForTimeout(RENDER_SETTLE_MS);

      const diagnostics = await page.evaluate(() => {
        const canvas = document.querySelector("canvas");
        const errorBanner = document.getElementById("error-banner");
        return {
          canvasWidth: canvas ? canvas.width : 0,
          canvasHeight: canvas ? canvas.height : 0,
          errorBannerText: errorBanner ? errorBanner.textContent.trim() : "",
        };
      });

      assert.ok(
        diagnostics.canvasWidth > 0 && diagnostics.canvasHeight > 0,
        "canvas dimensions are invalid",
      );
      assert.equal(
        diagnostics.errorBannerText,
        "",
        "example error banner is populated",
      );
      assert.deepEqual(
        runtimeErrors,
        [],
        `runtime errors:\n${runtimeErrors.join("\n")}`,
      );
    } catch (error) {
      failures.push(
        `- ${relativePage}: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      await page.close();
    }
  }

  return failures;
};

const runPlaygroundPresetChecks = async (browser, baseUrl, presetIds) => {
  const failures = [];

  for (let index = 0; index < presetIds.length; index += 1) {
    const presetId = presetIds[index];
    const page = await browser.newPage();
    const runtimeErrors = attachErrorCollectors(page);

    try {
      const url = `${baseUrl}/playground/index.html?example=${encodeURIComponent(presetId)}`;
      await page.goto(url, {
        waitUntil: "load",
        timeout: PAGE_TIMEOUT_MS,
      });

      await page.waitForFunction(
        () => {
          const status = document.getElementById("status");
          return (
            status &&
            (status.textContent === "Live" || status.textContent === "Error")
          );
        },
        { timeout: PAGE_TIMEOUT_MS, polling: 100 },
      );

      await page.waitForTimeout(PLAYGROUND_SETTLE_MS);

      const diagnostics = await page.evaluate(() => {
        const status = document.getElementById("status");
        const error = document.getElementById("error");
        const canvas = document.getElementById("playground-canvas");
        return {
          status: status ? status.textContent : "",
          errorText: error ? error.textContent.trim() : "",
          errorHidden: error ? error.hidden : true,
          canvasWidth: canvas ? canvas.width : 0,
          canvasHeight: canvas ? canvas.height : 0,
        };
      });

      assert.equal(
        diagnostics.status,
        "Live",
        `playground status is not Live (${diagnostics.status})`,
      );
      assert.ok(
        diagnostics.errorHidden || diagnostics.errorText === "",
        "playground error panel contains output",
      );
      assert.ok(
        diagnostics.canvasWidth > 0 && diagnostics.canvasHeight > 0,
        "playground canvas dimensions are invalid",
      );
      assert.deepEqual(
        runtimeErrors,
        [],
        `runtime errors:\n${runtimeErrors.join("\n")}`,
      );
    } catch (error) {
      failures.push(
        `- playground preset ${presetId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      await page.close();
    }
  }

  return failures;
};

const main = async () => {
  await fs.access(siteDistDir);

  const generatedPages = await collectExamplePages();
  assert.ok(
    generatedPages.length > 0,
    "No generated example pages found in site-dist/examples",
  );

  const presetIds = await getPlaygroundPresetIds();
  assert.ok(presetIds.length >= 12, "Expected at least 12 playground presets");

  const port = await listen();
  const baseUrl = `http://127.0.0.1:${port}/site-dist`;
  const browser = await chromium.launch({ headless: true });

  try {
    const generatedFailures = await runGeneratedExampleChecks(
      browser,
      baseUrl,
      generatedPages,
    );
    const playgroundFailures = await runPlaygroundPresetChecks(
      browser,
      baseUrl,
      presetIds,
    );

    const failures = [...generatedFailures, ...playgroundFailures];
    if (failures.length > 0) {
      throw new Error(`Browser examples smoke failed:\n${failures.join("\n")}`);
    }
  } finally {
    await browser.close();
    await closeServer();
  }

  console.log(
    `browser examples smoke passed (${generatedPages.length} generated examples, ${presetIds.length} playground presets)`,
  );
};

await main();
