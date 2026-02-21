import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..", "..");

const STATIC_MD_FILES = [
  "README.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "CHANGELOG.md",
  "examples/README.md",
];

const MARKDOWN_LINK_RE = /\[[^\]]*\]\(([^)]+)\)/g;

const isExternalLink = (href) => {
  return /^(https?:|mailto:|tel:)/i.test(href);
};

const normalizeHref = (href) => {
  return href.split("#")[0].split("?")[0].trim();
};

const walkMarkdownFiles = async (relativeDir) => {
  const absoluteDir = path.join(rootDir, relativeDir);
  const result = [];

  const walk = async (dir) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      const absolutePath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        result.push(path.relative(rootDir, absolutePath));
      }
    }
  };

  await walk(absoluteDir);
  return result;
};

const targetExists = async (absolutePath) => {
  try {
    await fs.access(absolutePath);
    return true;
  } catch (_error) {
    return false;
  }
};

const resolveTarget = (sourceFile, href) => {
  const normalized = normalizeHref(href);
  if (!normalized || normalized.startsWith("#")) {
    return null;
  }

  if (normalized.startsWith("/")) {
    return path.join(rootDir, normalized.slice(1));
  }

  return path.resolve(path.dirname(path.join(rootDir, sourceFile)), normalized);
};

const checkFileLinks = async (relativeFile) => {
  const absolutePath = path.join(rootDir, relativeFile);
  const content = await fs.readFile(absolutePath, "utf8");
  const failures = [];

  const matches = [...content.matchAll(MARKDOWN_LINK_RE)];
  for (let index = 0; index < matches.length; index += 1) {
    const href = (matches[index][1] || "").trim();
    if (!href || isExternalLink(href) || href.startsWith("#")) {
      continue;
    }

    const targetPath = resolveTarget(relativeFile, href);
    if (!targetPath) {
      continue;
    }

    const exists = await targetExists(targetPath);
    if (!exists) {
      failures.push({
        file: relativeFile,
        href,
      });
    }
  }

  return failures;
};

const main = async () => {
  const docsMarkdown = await walkMarkdownFiles("docs");
  const filesToCheck = Array.from(
    new Set([...STATIC_MD_FILES, ...docsMarkdown]).values(),
  ).sort((a, b) => a.localeCompare(b));

  const failures = [];
  for (let index = 0; index < filesToCheck.length; index += 1) {
    const fileFailures = await checkFileLinks(filesToCheck[index]);
    failures.push(...fileFailures);
  }

  if (failures.length > 0) {
    throw new Error(
      `Broken markdown links found:\n${failures
        .map((failure) => `- ${failure.file} -> ${failure.href}`)
        .join("\n")}`,
    );
  }

  console.log(`Markdown link check passed (${filesToCheck.length} files).`);
};

await main();
