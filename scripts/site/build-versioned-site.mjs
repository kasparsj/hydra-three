import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..", "..");
const outDir = path.join(rootDir, "site-dist");
const tempDir = path.join(rootDir, ".site-dist-tmp");

const readJsonIfExists = async (relativePath) => {
  try {
    const content = await fs.readFile(path.join(rootDir, relativePath), "utf8");
    return JSON.parse(content);
  } catch (_error) {
    return null;
  }
};

const runBuildSite = () => {
  const result = spawnSync(
    process.execPath,
    ["./scripts/site/build-site.mjs"],
    {
      cwd: rootDir,
      env: {
        ...process.env,
        SITE_OUT_DIR: tempDir,
      },
      stdio: "inherit",
    },
  );

  if (result.status !== 0) {
    throw new Error(
      "site build failed while generating versioned docs output.",
    );
  }
};

const copyDir = async (from, to) => {
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.cp(from, to, { recursive: true });
};

const main = async () => {
  const pkg = await readJsonIfExists("package.json");
  if (!pkg || !pkg.version) {
    throw new Error(
      "Could not resolve package version for versioned docs build.",
    );
  }

  const defaultVersions = ["latest", `v${pkg.version}`];
  const configured = await readJsonIfExists("docs/versions.json");
  const configuredVersions = Array.isArray(configured?.versions)
    ? configured.versions.filter(
        (entry) => typeof entry === "string" && entry.trim(),
      )
    : [];

  const versions = Array.from(
    new Set([...defaultVersions, ...configuredVersions]),
  );

  await fs.rm(tempDir, { recursive: true, force: true });
  runBuildSite();

  await fs.rm(outDir, { recursive: true, force: true });
  await copyDir(tempDir, outDir);

  for (let index = 0; index < versions.length; index += 1) {
    const version = versions[index];
    const versionPath = path.join(outDir, "docs", version);
    await fs.rm(versionPath, { recursive: true, force: true });
    await copyDir(tempDir, versionPath);
  }

  await fs.writeFile(
    path.join(outDir, "docs", "versions.json"),
    `${JSON.stringify(
      {
        latest: "latest",
        versions,
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  await fs.rm(tempDir, { recursive: true, force: true });

  console.log(`Versioned site generated at ${outDir}`);
  console.log(`Versions: ${versions.join(", ")}`);
};

await main();
