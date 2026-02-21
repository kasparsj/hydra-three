import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..", "..");

const readJson = async (relativePath) => {
  const absolutePath = path.join(rootDir, relativePath);
  return JSON.parse(await fs.readFile(absolutePath, "utf8"));
};

const readText = async (relativePath) => {
  const absolutePath = path.join(rootDir, relativePath);
  return fs.readFile(absolutePath, "utf8");
};

const toUniqueList = (values) => {
  return Array.from(new Set(values.filter(Boolean)));
};

const collectCoverageTokens = (manifest, transformData) => {
  const tokens = [
    ...manifest.constructorOptions,
    ...manifest.hydraRendererMembers,
    ...manifest.hydraSynthMembers,
    ...manifest.sceneMembers,
    ...manifest.transformChainMembers,
    ...Object.keys(manifest.modules),
  ];

  Object.values(manifest.modules).forEach((moduleExports) => {
    tokens.push(...moduleExports);
  });

  tokens.push(...transformData.transforms.map((entry) => entry.name));

  return toUniqueList(tokens);
};

const findMissingTokens = (tokens, markdown) => {
  return tokens.filter((token) => {
    const backticked = `\`${token}\``;
    if (markdown.includes(backticked)) {
      return false;
    }
    const plainRegex = new RegExp(
      `\\b${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
    );
    return !plainRegex.test(markdown);
  });
};

const main = async () => {
  const manifest = await readJson("docs/.generated/api-manifest.json");
  const transformData = await readJson("docs/.generated/transforms.json");
  const apiMarkdown = await readText("docs/api.md");

  const tokens = collectCoverageTokens(manifest, transformData);
  const missing = findMissingTokens(tokens, apiMarkdown);

  if (missing.length > 0) {
    throw new Error(
      `API docs coverage failed. Missing symbols in docs/api.md:\n${missing
        .slice(0, 80)
        .map((entry) => `- ${entry}`)
        .join("\n")}${missing.length > 80 ? "\n- ..." : ""}`,
    );
  }

  console.log(`API docs coverage passed (${tokens.length} symbols).`);
};

await main();
