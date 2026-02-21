import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..", "..");

const collectFiles = async (dir, predicate) => {
  const files = [];
  const queue = [dir];

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
      if (entry.isFile() && predicate(absolutePath, entry.name)) {
        files.push(absolutePath);
      }
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
};

const parseAsScript = (code, filename) => {
  new vm.Script(code, { filename });
};

const validateExampleSources = async () => {
  const exampleDir = path.join(rootDir, "examples");
  const files = await collectFiles(exampleDir, (absolutePath, name) => {
    return name.endsWith(".js") && !absolutePath.endsWith("README.md");
  });

  assert.ok(
    files.length > 0,
    "Expected at least one source example in /examples",
  );

  for (let index = 0; index < files.length; index += 1) {
    const absolutePath = files[index];
    const code = await fs.readFile(absolutePath, "utf8");
    const relativePath = path.relative(rootDir, absolutePath);
    parseAsScript(code, relativePath);
  }

  return files.map((absolutePath) => path.relative(rootDir, absolutePath));
};

const validatePlaygroundExamples = async () => {
  const modulePath = pathToFileURL(
    path.join(rootDir, "site", "playground", "examples.js"),
  ).href;
  const { playgroundExamples } = await import(modulePath);

  assert.ok(
    Array.isArray(playgroundExamples),
    "playgroundExamples must be an array",
  );
  assert.ok(
    playgroundExamples.length >= 12,
    `Expected at least 12 playground presets, got ${playgroundExamples.length}`,
  );

  const ids = new Set();

  for (let index = 0; index < playgroundExamples.length; index += 1) {
    const example = playgroundExamples[index];
    assert.equal(
      typeof example.id,
      "string",
      `Preset at index ${index} has no string id`,
    );
    assert.ok(example.id.length > 0, `Preset at index ${index} has empty id`);
    assert.ok(
      !ids.has(example.id),
      `Duplicate playground preset id: ${example.id}`,
    );
    ids.add(example.id);

    assert.equal(
      typeof example.label,
      "string",
      `Preset ${example.id} has no string label`,
    );
    assert.ok(
      Array.isArray(example.params),
      `Preset ${example.id} params must be an array`,
    );
    assert.equal(
      typeof example.code,
      "string",
      `Preset ${example.id} code must be a string`,
    );

    const paramNames = new Set();
    for (
      let paramIndex = 0;
      paramIndex < example.params.length;
      paramIndex += 1
    ) {
      const param = example.params[paramIndex];
      const prefix = `Preset ${example.id} param[${paramIndex}]`;

      assert.equal(typeof param.name, "string", `${prefix} missing name`);
      assert.ok(param.name.length > 0, `${prefix} has empty name`);
      assert.ok(
        !paramNames.has(param.name),
        `${prefix} duplicate name ${param.name}`,
      );
      paramNames.add(param.name);

      assert.equal(typeof param.label, "string", `${prefix} missing label`);
      assert.equal(typeof param.min, "number", `${prefix} min must be number`);
      assert.equal(typeof param.max, "number", `${prefix} max must be number`);
      assert.equal(
        typeof param.step,
        "number",
        `${prefix} step must be number`,
      );
      assert.equal(
        typeof param.value,
        "number",
        `${prefix} value must be number`,
      );
      assert.ok(param.min <= param.max, `${prefix} min must be <= max`);
      assert.ok(param.step > 0, `${prefix} step must be > 0`);
      assert.ok(
        param.value >= param.min && param.value <= param.max,
        `${prefix} value ${param.value} out of range ${param.min}..${param.max}`,
      );
    }

    parseAsScript(
      `const params = {}\n${example.code}`,
      `playground:${example.id}`,
    );
  }

  return ids;
};

const validateRecipeDeepLinks = async (playgroundIds) => {
  const recipesPath = path.join(
    rootDir,
    "docs",
    "recipes",
    "common-recipes.md",
  );
  const content = await fs.readFile(recipesPath, "utf8");
  const matches = [
    ...content.matchAll(/playground\/index\.html\?example=([a-z0-9-]+)/g),
  ];

  assert.ok(
    matches.length >= 4,
    "Expected at least 4 playground deep links in recipes docs",
  );

  for (let index = 0; index < matches.length; index += 1) {
    const linkedId = matches[index][1];
    assert.ok(
      playgroundIds.has(linkedId),
      `Recipe deep link references unknown playground preset: ${linkedId}`,
    );
  }
};

const main = async () => {
  const exampleSources = await validateExampleSources();
  const playgroundIds = await validatePlaygroundExamples();
  await validateRecipeDeepLinks(playgroundIds);

  console.log(
    `examples integrity smoke passed (${exampleSources.length} source examples, ${playgroundIds.size} playground presets)`,
  );
};

await main();
