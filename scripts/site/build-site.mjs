import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..", "..");
const outDir = path.resolve(rootDir, process.env.SITE_OUT_DIR || "site-dist");
const githubRepoUrl = "https://github.com/kasparsj/hydra-three";

const docPages = [
  { source: "README.md", output: "index.html", label: "Overview" },
  {
    source: "docs/getting-started.md",
    output: "docs/getting-started.html",
    label: "Getting Started",
  },
  {
    source: "docs/api.md",
    output: "docs/api.html",
    label: "API Reference",
  },
  {
    source: "docs/concepts/hydra-to-3d-mental-model.md",
    output: "docs/concepts/hydra-to-3d-mental-model.html",
    label: "Hydra to 3D",
  },
  {
    source: "docs/concepts/scene-graph.md",
    output: "docs/concepts/scene-graph.html",
    label: "Scene Graph",
  },
  {
    source: "docs/concepts/rendering-pipeline.md",
    output: "docs/concepts/rendering-pipeline.html",
    label: "Rendering Pipeline",
  },
  {
    source: "docs/concepts/chaining-composition.md",
    output: "docs/concepts/chaining-composition.html",
    label: "Chaining Patterns",
  },
  {
    source: "docs/reference/parameter-reference.md",
    output: "docs/reference/parameter-reference.html",
    label: "Parameter Reference",
  },
  {
    source: "docs/reference/semantic-clarifications.md",
    output: "docs/reference/semantic-clarifications.html",
    label: "Semantic Clarifications",
  },
  {
    source: "docs/recipes/common-recipes.md",
    output: "docs/recipes/common-recipes.html",
    label: "Common Recipes",
  },
  {
    source: "docs/playground.md",
    output: "docs/playground.html",
    label: "Playground Guide",
  },
  {
    source: "docs/performance/advanced-performance.md",
    output: "docs/performance/advanced-performance.html",
    label: "Performance Notes",
  },
  {
    source: "docs/upstream-differences.md",
    output: "docs/upstream-differences.html",
    label: "Upstream Differences",
  },
  {
    source: "docs/production-checklist.md",
    output: "docs/production-checklist.html",
    label: "Production Checklist",
  },
  {
    source: "docs/release.md",
    output: "docs/release.html",
    label: "Release Process",
  },
  {
    source: "examples/README.md",
    output: "docs/examples.html",
    label: "Examples Guide",
  },
  {
    source: "CONTRIBUTING.md",
    output: "docs/contributing.html",
    label: "Contributing",
  },
  { source: "SECURITY.md", output: "docs/security.html", label: "Security" },
  { source: "CHANGELOG.md", output: "docs/changelog.html", label: "Changelog" },
];

const normalize = (value) => value.split(path.sep).join("/");

const escapeHtml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const escapeAttr = (value) => escapeHtml(value);

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[`*_~()[\]{}:;,.!?/\\|"'<>]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";

const relativeHref = (fromOutput, toOutput) => {
  const fromDir = path.posix.dirname(fromOutput);
  const rel = path.posix.relative(fromDir, toOutput);
  if (!rel) return "./";
  return rel.startsWith(".") ? rel : `./${rel}`;
};

const appendHash = (href, hash) => (hash ? `${href}#${hash}` : href);

const toTitleCase = (value) =>
  value
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const readText = async (relativePath) =>
  fs.readFile(path.join(rootDir, relativePath), "utf8");

const writeText = async (relativePath, content) => {
  const target = path.join(outDir, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, "utf8");
};

const docOutputBySource = new Map(
  docPages.map((page) => [normalize(page.source), normalize(page.output)]),
);

const parseLinkTarget = (href) => {
  const [base, ...rest] = href.split("#");
  return {
    base,
    hash: rest.length > 0 ? rest.join("#") : "",
  };
};

const resolveMarkdownHref = (
  href,
  sourcePath,
  outputPath,
  exampleOutputBySource,
) => {
  if (!href) return href;
  if (/^(https?:|mailto:|tel:|#)/i.test(href)) return href;

  const { base, hash } = parseLinkTarget(href);
  const sourceDir = path.posix.dirname(normalize(sourcePath));
  const normalizedTarget = normalize(
    path.posix.normalize(path.posix.join(sourceDir, base)),
  );

  if (docOutputBySource.has(normalizedTarget)) {
    const toOutput = docOutputBySource.get(normalizedTarget);
    return appendHash(relativeHref(normalize(outputPath), toOutput), hash);
  }

  if (exampleOutputBySource.has(normalizedTarget)) {
    const toOutput = exampleOutputBySource.get(normalizedTarget);
    return appendHash(relativeHref(normalize(outputPath), toOutput), hash);
  }

  const absoluteTarget = path.join(rootDir, normalizedTarget);
  if (fssync.existsSync(absoluteTarget)) {
    const stat = fssync.statSync(absoluteTarget);
    const mode = stat.isDirectory() ? "tree" : "blob";
    return appendHash(
      `${githubRepoUrl}/${mode}/main/${normalizedTarget}`,
      hash,
    );
  }

  return href;
};

const formatInline = (line, context) => {
  const links = [];
  const codeTokens = [];

  let next = line;

  next = next.replace(/`([^`]+)`/g, (_match, code) => {
    const token = `@@CODE_${codeTokens.length}@@`;
    codeTokens.push(`<code>${escapeHtml(code)}</code>`);
    return token;
  });

  next = next.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
    const token = `@@LINK_${links.length}@@`;
    const resolved = resolveMarkdownHref(
      href,
      context.sourcePath,
      context.outputPath,
      context.exampleOutputBySource,
    );
    links.push(`<a href="${escapeAttr(resolved)}">${escapeHtml(label)}</a>`);
    return token;
  });

  next = escapeHtml(next);
  next = next.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  next = next.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  links.forEach((html, index) => {
    next = next.replace(`@@LINK_${index}@@`, html);
  });

  codeTokens.forEach((html, index) => {
    next = next.replace(`@@CODE_${index}@@`, html);
  });

  return next;
};

const renderMarkdown = (markdown, context) => {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  const headingCount = new Map();
  let paragraph = [];
  let listType = null;
  let inCode = false;
  let codeLanguage = "";
  let codeBuffer = [];

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      html.push(`<p>${formatInline(paragraph.join(" "), context)}</p>`);
      paragraph = [];
    }
  };

  const flushCode = () => {
    const classAttr = codeLanguage
      ? ` class="language-${escapeAttr(codeLanguage)}"`
      : "";
    html.push(
      `<pre><code${classAttr}>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`,
    );
    codeBuffer = [];
    codeLanguage = "";
  };

  for (const rawLine of lines) {
    const line = rawLine;

    if (line.startsWith("```")) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        flushParagraph();
        closeList();
        inCode = true;
        codeLanguage = line.replace(/^```/, "").trim();
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    if (/^\s*$/.test(line)) {
      flushParagraph();
      closeList();
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      closeList();
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].trim();
      const baseId = slugify(headingText);
      const count = headingCount.get(baseId) || 0;
      headingCount.set(baseId, count + 1);
      const headingId = count > 0 ? `${baseId}-${count + 1}` : baseId;
      html.push(
        `<h${level} id="${escapeAttr(headingId)}">${formatInline(headingText, context)}</h${level}>`,
      );
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      if (listType !== "ul") {
        closeList();
        listType = "ul";
        html.push("<ul>");
      }
      html.push(
        `<li>${formatInline(line.replace(/^[-*]\s+/, ""), context)}</li>`,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      flushParagraph();
      if (listType !== "ol") {
        closeList();
        listType = "ol";
        html.push("<ol>");
      }
      html.push(
        `<li>${formatInline(line.replace(/^\d+\.\s+/, ""), context)}</li>`,
      );
      continue;
    }

    paragraph.push(line.trim());
  }

  if (inCode) {
    flushCode();
  }

  flushParagraph();
  closeList();
  return html.join("\n");
};

const renderLayout = ({ title, outputPath, activeKey, content }) => {
  const navItems = [
    { key: "overview", label: "Home", output: "index.html" },
    {
      key: "start",
      label: "Start",
      output: "docs/getting-started.html",
    },
    {
      key: "concepts",
      label: "Concepts",
      output: "docs/concepts/hydra-to-3d-mental-model.html",
    },
    { key: "api", label: "API", output: "docs/api.html" },
    {
      key: "playground",
      label: "Playground",
      output: "playground/index.html",
    },
    {
      key: "recipes",
      label: "Recipes",
      output: "docs/recipes/common-recipes.html",
    },
    { key: "examples", label: "Examples", output: "examples/index.html" },
    {
      key: "production",
      label: "Production",
      output: "docs/production-checklist.html",
    },
    { key: "release", label: "Release", output: "docs/release.html" },
  ];

  const cssHref = relativeHref(normalize(outputPath), "assets/site.css");
  const versionsHref = relativeHref(
    normalize(outputPath),
    "docs/versions.json",
  );
  const navHtml = navItems
    .map((item) => {
      const href = relativeHref(normalize(outputPath), item.output);
      const classes = item.key === activeKey ? "active" : "";
      return `<a class="${classes}" href="${escapeAttr(href)}">${escapeHtml(item.label)}</a>`;
    })
    .join("\n");

  const repoLink =
    '<a class="repo" href="https://github.com/kasparsj/hydra-three">GitHub</a>';

  const versionScript = `
      <script>
        (function () {
          const picker = document.getElementById("docs-version-picker");
          const select = document.getElementById("docs-version-select");
          if (!picker || !select) return;

          const versionsUrl = new URL("${escapeAttr(versionsHref)}", window.location.href);
          const currentPath = window.location.pathname;
          const currentMatch = currentPath.match(/\\/docs\\/(latest|v[^/]+)\\//);
          const currentVersion = currentMatch ? currentMatch[1] : "latest";

          fetch(versionsUrl.toString())
            .then((response) => {
              if (!response.ok) throw new Error("versions manifest unavailable");
              return response.json();
            })
            .then((manifest) => {
              const versions = Array.isArray(manifest.versions) ? manifest.versions : [];
              if (!versions.length) throw new Error("versions list is empty");

              select.innerHTML = versions
                .map((version) => '<option value="' + version + '">' + version + "</option>")
                .join("");
              select.value = versions.includes(currentVersion)
                ? currentVersion
                : versions[0];

              const baseHref = versionsUrl.toString().replace(/docs\\/versions\\.json$/, "");
              select.addEventListener("change", function () {
                const target = new URL("docs/" + select.value + "/index.html", baseHref);
                window.location.href = target.toString();
              });
            })
            .catch(function () {
              picker.style.display = "none";
            });
        })();
      </script>
  `;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} | hydra-three</title>
    <link rel="stylesheet" href="${escapeAttr(cssHref)}" />
  </head>
  <body>
    <div class="site-shell">
      <header class="topbar">
        <div class="topbar-inner">
          <a class="brand" href="${escapeAttr(relativeHref(normalize(outputPath), "index.html"))}">
            <span class="brand-dot" aria-hidden="true"></span>
            <span>hydra-three</span>
          </a>
          <div class="topbar-actions">
            <nav class="nav">
              ${navHtml}
              ${repoLink}
            </nav>
            <div class="version-picker" id="docs-version-picker">
              <label for="docs-version-select">Docs Version</label>
              <select id="docs-version-select" aria-label="Select documentation version">
                <option value="latest">latest</option>
              </select>
            </div>
          </div>
        </div>
      </header>
      ${content}
      <p class="footer-note">Generated from repository docs and examples.</p>
    </div>
    ${versionScript}
  </body>
</html>
`;
};

const resolveActiveKey = (outputPath) => {
  const normalized = normalize(outputPath);
  if (normalized.includes("/playground")) return "playground";
  if (normalized.includes("/concepts/")) return "concepts";
  if (normalized.endsWith("/api.html") || normalized.includes("/api."))
    return "api";
  if (normalized.includes("/reference/")) return "api";
  if (normalized.includes("/recipes/")) return "recipes";
  if (normalized.includes("/performance/")) return "production";
  if (normalized.includes("/examples")) return "examples";
  if (normalized.includes("release")) return "release";
  if (normalized.includes("production")) return "production";
  if (normalized.includes("getting-started")) return "start";
  return "overview";
};

const buildDocPages = async (exampleOutputBySource) => {
  for (const page of docPages) {
    const markdown = await readText(page.source);
    const body = renderMarkdown(markdown, {
      sourcePath: page.source,
      outputPath: page.output,
      exampleOutputBySource,
    });

    const sidebar = docPages
      .map((doc) => {
        const href = relativeHref(
          normalize(page.output),
          normalize(doc.output),
        );
        const classes = doc.output === page.output ? "active" : "";
        return `<a class="${classes}" href="${escapeAttr(href)}">${escapeHtml(doc.label)}</a>`;
      })
      .join("\n");

    const sourceHref = `${githubRepoUrl}/blob/main/${normalize(page.source)}`;
    const content = `
      <main class="page doc-grid">
        <aside class="doc-sidebar">
          <h2>Documentation</h2>
          ${sidebar}
        </aside>
        <section class="doc-main">
          <div class="doc-meta">Source: <a href="${escapeAttr(sourceHref)}">${escapeHtml(page.source)}</a></div>
          <article class="prose">${body}</article>
        </section>
      </main>
    `;

    const html = renderLayout({
      title: page.label,
      outputPath: page.output,
      activeKey: resolveActiveKey(page.output),
      content,
    });

    await writeText(page.output, html);
  }
};

const collectExampleSources = async () => {
  const root = path.join(rootDir, "examples");
  const queue = [root];
  const files = [];

  while (queue.length > 0) {
    const current = queue.shift();
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(absolute);
        continue;
      }
      if (entry.isFile() && absolute.endsWith(".js")) {
        files.push(normalize(path.relative(rootDir, absolute)));
      }
    }
  }

  return files.sort();
};

const createExampleOutputMap = (exampleSources) => {
  const outputBySource = new Map();
  for (const source of exampleSources) {
    const output = normalize(
      source.replace(/^examples\//, "examples/").replace(/\.js$/, ".html"),
    );
    outputBySource.set(source, output);
  }
  return outputBySource;
};

const renderExamplesIndex = async (exampleSources, outputBySource) => {
  const grouped = new Map();
  for (const source of exampleSources) {
    const relative = source.replace(/^examples\//, "");
    const category = relative.includes("/")
      ? relative.split("/")[0]
      : "general";
    const list = grouped.get(category) || [];
    list.push({
      source,
      name: toTitleCase(path.basename(relative, ".js")),
      output: outputBySource.get(source),
    });
    grouped.set(category, list);
  }

  const categories = Array.from(grouped.keys()).sort();
  const sections = categories
    .map((category) => {
      const cards = grouped
        .get(category)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((item) => {
          const runHref = relativeHref("examples/index.html", item.output);
          const sourceHref = `${githubRepoUrl}/blob/main/${item.source}`;
          return `
          <article class="example-card">
            <span class="pill">${escapeHtml(category)}</span>
            <h3>${escapeHtml(item.name)}</h3>
            <p><code>${escapeHtml(item.source.replace(/^examples\//, ""))}</code></p>
            <div class="actions">
              <a class="btn primary" href="${escapeAttr(runHref)}">Run Example</a>
              <a class="btn ghost" href="${escapeAttr(sourceHref)}">View Source</a>
            </div>
          </article>
        `;
        })
        .join("\n");

      return `
      <section>
        <h2>${escapeHtml(toTitleCase(category))}</h2>
        <div class="examples-grid">
          ${cards}
        </div>
      </section>
    `;
    })
    .join("\n");

  const content = `
    <main class="page doc-main">
      <section class="hero">
        <h1>Examples Gallery</h1>
        <p>All runnable examples are discovered automatically from <code>/examples</code>.</p>
      </section>
      <div class="prose">
        ${sections}
      </div>
    </main>
  `;

  const html = renderLayout({
    title: "Examples",
    outputPath: "examples/index.html",
    activeKey: "examples",
    content,
  });

  await writeText("examples/index.html", html);
};

const renderExamplePages = async (exampleSources, outputBySource) => {
  for (const source of exampleSources) {
    const outputPath = outputBySource.get(source);
    const code = await readText(source);
    const relativeName = source.replace(/^examples\//, "");
    const title = toTitleCase(path.basename(relativeName, ".js"));
    const sourceHref = `${githubRepoUrl}/blob/main/${source}`;
    const distHref = relativeHref(outputPath, "dist/hydra-synth.js");
    const exampleCode = JSON.stringify(code);
    const codeBlock = escapeHtml(code);
    const backToExamples = relativeHref(outputPath, "examples/index.html");
    const backToDocs = relativeHref(outputPath, "docs/examples.html");

    const content = `
      <main class="page example-page">
        <section class="example-head">
          <div class="actions">
            <a class="btn ghost" href="${escapeAttr(backToExamples)}">Back To Examples</a>
            <a class="btn ghost" href="${escapeAttr(backToDocs)}">Examples Guide</a>
            <a class="btn ghost" href="${escapeAttr(sourceHref)}">View Source</a>
          </div>
          <h1>${escapeHtml(title)}</h1>
          <p class="example-sub"><code>${escapeHtml(relativeName)}</code></p>
        </section>
        <section class="viewer">
          <canvas id="hydra-canvas"></canvas>
          <div id="error-banner" class="error-banner"></div>
        </section>
        <section class="example-code">
          <details>
            <summary>Show Example Source</summary>
            <pre><code>${codeBlock}</code></pre>
          </details>
        </section>
      </main>
      <script src="${escapeAttr(distHref)}"></script>
      <script>
        (function () {
          const errorBanner = document.getElementById('error-banner');
          const showError = (message) => {
            errorBanner.style.display = 'block';
            errorBanner.textContent = message;
          };
          const canvas = document.getElementById('hydra-canvas');
          canvas.width = window.innerWidth;
          canvas.height = Math.max(window.innerHeight * 0.68, 420);
          const code = ${exampleCode};

          try {
            window.hydraSynth = new Hydra({
              canvas: canvas,
              detectAudio: false,
              makeGlobal: true
            });
            if (typeof canvas.setAutoResize === 'function') {
              canvas.setAutoResize(true);
            }
            (0, eval)(code);
          } catch (error) {
            showError(error && error.stack ? error.stack : String(error));
          }

          window.addEventListener('error', (event) => {
            showError(event.message || 'Unknown runtime error');
          });
        })();
      </script>
    `;

    const html = renderLayout({
      title: `${title} Example`,
      outputPath,
      activeKey: "examples",
      content,
    });

    await writeText(outputPath, html);
  }
};

const copyStaticAssets = async () => {
  await fs.mkdir(path.join(outDir, "assets"), { recursive: true });
  await fs.copyFile(
    path.join(rootDir, "site/static/site.css"),
    path.join(outDir, "assets/site.css"),
  );

  await fs.mkdir(path.join(outDir, "dist"), { recursive: true });
  await fs.copyFile(
    path.join(rootDir, "dist/hydra-synth.js"),
    path.join(outDir, "dist/hydra-synth.js"),
  );

  try {
    await fs.mkdir(path.join(outDir, "docs"), { recursive: true });
    await fs.copyFile(
      path.join(rootDir, "docs", "versions.json"),
      path.join(outDir, "docs", "versions.json"),
    );
  } catch (_error) {
    // Optional local versions manifest for non-versioned builds.
  }

  await fs.cp(
    path.join(rootDir, "site", "playground"),
    path.join(outDir, "playground"),
    {
      recursive: true,
    },
  );
};

const writeNotFoundPage = async () => {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0; url=./index.html" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Redirecting...</title>
  </head>
  <body>
    Redirecting to <a href="./index.html">home page</a>.
  </body>
</html>
`;
  await writeText("404.html", html);
};

const build = async () => {
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  const exampleSources = await collectExampleSources();
  const exampleOutputBySource = createExampleOutputMap(exampleSources);

  await copyStaticAssets();
  await buildDocPages(exampleOutputBySource);
  await renderExamplesIndex(exampleSources, exampleOutputBySource);
  await renderExamplePages(exampleSources, exampleOutputBySource);
  await writeNotFoundPage();

  console.log(`Site generated at ${outDir}`);
  console.log(`Docs pages: ${docPages.length}`);
  console.log(`Example pages: ${exampleSources.length}`);
};

await build();
