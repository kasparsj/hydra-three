import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const DEFAULT_TARGETS = ["examples", "site/playground"];
const JS_EXTENSIONS = new Set([".js", ".mjs", ".cjs"]);
const IGNORE_DIRS = new Set([
  ".git",
  ".github",
  "node_modules",
  "dist",
  "vendor",
  "build",
]);
const CALL_PATTERN =
  /(?:\bscene|\.(?:group|mesh|points|linestrip|lineloop|lines|line))\s*\(/g;

const formatUsage = () => `Usage:
  node scripts/migrate/find-unkeyed-live-calls.mjs [options] [paths...]

Options:
  --json      Print JSON report
  --strict    Exit with code 2 if findings exist
  --help      Show this help

Defaults:
  Paths default to: ${DEFAULT_TARGETS.join(", ")}
`;

const countLinesBefore = (source, index) => {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i += 1) {
    if (source[i] === "\n") {
      line += 1;
    }
  }
  return line;
};

const skipString = (source, start, quote) => {
  let i = start + 1;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === quote) {
      return i + 1;
    }
    i += 1;
  }
  return source.length;
};

const skipLineComment = (source, start) => {
  let i = start + 2;
  while (i < source.length && source[i] !== "\n") {
    i += 1;
  }
  return i;
};

const skipBlockComment = (source, start) => {
  let i = start + 2;
  while (i < source.length) {
    if (source[i] === "*" && source[i + 1] === "/") {
      return i + 2;
    }
    i += 1;
  }
  return source.length;
};

const findMatchingParen = (source, openIndex) => {
  let depth = 1;
  let i = openIndex + 1;
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === '"' || ch === "'" || ch === "`") {
      i = skipString(source, i, ch);
      continue;
    }
    if (ch === "/" && next === "/") {
      i = skipLineComment(source, i);
      continue;
    }
    if (ch === "/" && next === "*") {
      i = skipBlockComment(source, i);
      continue;
    }
    if (ch === "(") {
      depth += 1;
      i += 1;
      continue;
    }
    if (ch === ")") {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
      i += 1;
      continue;
    }
    i += 1;
  }
  return -1;
};

const splitTopLevelArgs = (argsText) => {
  const parts = [];
  let start = 0;
  let i = 0;
  let paren = 0;
  let brace = 0;
  let bracket = 0;
  while (i < argsText.length) {
    const ch = argsText[i];
    const next = argsText[i + 1];
    if (ch === '"' || ch === "'" || ch === "`") {
      i = skipString(argsText, i, ch);
      continue;
    }
    if (ch === "/" && next === "/") {
      i = skipLineComment(argsText, i);
      continue;
    }
    if (ch === "/" && next === "*") {
      i = skipBlockComment(argsText, i);
      continue;
    }
    if (ch === "(") {
      paren += 1;
      i += 1;
      continue;
    }
    if (ch === ")") {
      paren = Math.max(0, paren - 1);
      i += 1;
      continue;
    }
    if (ch === "{") {
      brace += 1;
      i += 1;
      continue;
    }
    if (ch === "}") {
      brace = Math.max(0, brace - 1);
      i += 1;
      continue;
    }
    if (ch === "[") {
      bracket += 1;
      i += 1;
      continue;
    }
    if (ch === "]") {
      bracket = Math.max(0, bracket - 1);
      i += 1;
      continue;
    }
    if (ch === "," && paren === 0 && brace === 0 && bracket === 0) {
      parts.push(argsText.slice(start, i).trim());
      start = i + 1;
      i += 1;
      continue;
    }
    i += 1;
  }
  const last = argsText.slice(start).trim();
  if (last.length > 0) {
    parts.push(last);
  }
  return parts;
};

const hasInlineKey = (argsText) => /\bkey\s*:/.test(argsText);

const isTrackedCall = (name) =>
  name === "scene" ||
  name === "group" ||
  name === "mesh" ||
  name === "points" ||
  name === "lines" ||
  name === "line" ||
  name === "lineloop" ||
  name === "linestrip";

const normalizeCallName = (token) => {
  const withoutParen = token.replace(/\(\s*$/, "").trim();
  if (withoutParen.startsWith(".")) {
    return withoutParen.slice(1);
  }
  return withoutParen;
};

const collectFindings = (source, relPath) => {
  const findings = [];
  let match;
  while ((match = CALL_PATTERN.exec(source))) {
    const token = match[0];
    const callName = normalizeCallName(token);
    if (!isTrackedCall(callName)) {
      continue;
    }
    const openIndex = match.index + token.lastIndexOf("(");
    const closeIndex = findMatchingParen(source, openIndex);
    if (closeIndex < 0) {
      continue;
    }
    const argsText = source.slice(openIndex + 1, closeIndex);
    const args = splitTopLevelArgs(argsText);
    const keyed = hasInlineKey(argsText);
    const line = countLinesBefore(source, openIndex);
    if (!keyed) {
      findings.push({
        file: relPath,
        line,
        call: callName,
        argsCount: args.length,
        snippet: `${callName}(${argsText.trim().slice(0, 100)})`,
      });
    }
  }
  return findings;
};

const walkFiles = async (targetPath, acc) => {
  let stat;
  try {
    stat = await fs.stat(targetPath);
  } catch (_error) {
    return;
  }
  if (stat.isFile()) {
    const ext = path.extname(targetPath);
    if (JS_EXTENSIONS.has(ext)) {
      acc.push(targetPath);
    }
    return;
  }
  if (!stat.isDirectory()) {
    return;
  }
  const dirName = path.basename(targetPath);
  if (IGNORE_DIRS.has(dirName)) {
    return;
  }
  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const nextPath = path.join(targetPath, entry.name);
      if (entry.isDirectory() && IGNORE_DIRS.has(entry.name)) {
        return;
      }
      await walkFiles(nextPath, acc);
    }),
  );
};

const parseArgs = () => {
  const raw = process.argv.slice(2);
  const options = {
    json: false,
    strict: false,
    help: false,
    paths: [],
  };
  raw.forEach((arg) => {
    if (arg === "--json") {
      options.json = true;
      return;
    }
    if (arg === "--strict") {
      options.strict = true;
      return;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      return;
    }
    options.paths.push(arg);
  });
  return options;
};

const main = async () => {
  const options = parseArgs();
  if (options.help) {
    console.log(formatUsage());
    return;
  }

  const root = process.cwd();
  const targets = options.paths.length > 0 ? options.paths : DEFAULT_TARGETS;
  const files = [];
  await Promise.all(
    targets.map((target) => walkFiles(path.resolve(root, target), files)),
  );
  files.sort();

  const findings = [];
  for (const filePath of files) {
    const source = await fs.readFile(filePath, "utf8");
    const relPath = path.relative(root, filePath).split(path.sep).join("/");
    findings.push(...collectFindings(source, relPath));
  }

  const report = {
    scannedFiles: files.length,
    findingsCount: findings.length,
    findings,
  };

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else if (findings.length === 0) {
    console.log(
      `No unkeyed live-coding calls found across ${report.scannedFiles} files.`,
    );
  } else {
    console.log(
      `Found ${report.findingsCount} unkeyed live-coding calls across ${report.scannedFiles} files:\n`,
    );
    findings.forEach((finding) => {
      console.log(
        `${finding.file}:${finding.line}  [${finding.call}]  ${finding.snippet}`,
      );
    });
    console.log(
      "\nAdd explicit { key: \"...\" } to scene/group/primitive options when using liveMode: \"continuous\".",
    );
  }

  if (options.strict && findings.length > 0) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error("Failed to scan live-coding calls:", error);
  process.exitCode = 1;
});
