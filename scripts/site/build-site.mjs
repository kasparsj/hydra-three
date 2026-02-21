import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..", "..");
const outDir = path.join(rootDir, "site-dist");
const githubRepoUrl = "https://github.com/kasparsj/hydra-three";

const docPages = [
  { source: "README.md", output: "index.html", label: "Overview" },
  {
    source: "docs/getting-started.md",
    output: "docs/getting-started.html",
    label: "Getting Started",
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
      key: "getting-started",
      label: "Getting Started",
      output: "docs/getting-started.html",
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
  const navHtml = navItems
    .map((item) => {
      const href = relativeHref(normalize(outputPath), item.output);
      const classes = item.key === activeKey ? "active" : "";
      return `<a class="${classes}" href="${escapeAttr(href)}">${escapeHtml(item.label)}</a>`;
    })
    .join("\n");

  const repoLink =
    '<a class="repo" href="https://github.com/kasparsj/hydra-three">GitHub</a>';

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
          <nav class="nav">
            ${navHtml}
            ${repoLink}
          </nav>
        </div>
      </header>
      ${content}
      <p class="footer-note">Generated from repository docs and examples.</p>
    </div>
  </body>
</html>
`;
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
      activeKey: page.output.includes("examples")
        ? "examples"
        : page.output.includes("release")
          ? "release"
          : page.output.includes("production")
            ? "production"
            : page.output.includes("getting-started")
              ? "getting-started"
              : "overview",
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
