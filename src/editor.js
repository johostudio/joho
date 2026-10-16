import nodesSource from "../content/nodes.json?raw";
import { escapeHtml, parsePortfolioMarkdown, siteMarkdown } from "./content.js";
import { normalizeNodesContent } from "./nodes-data.js";
import { renderPortfolio } from "./view.js";
import "./editor.css";

const repository = "johostudio/joho";
const branch = "main";
const tokenUrl = "https://github.com/settings/personal-access-tokens/new";
const contentFiles = {
  site: {
    path: "content/site.md",
    message: "docs: update portfolio content",
  },
  nodes: {
    path: "content/nodes.json",
    message: "docs: update nodes graph",
  },
};

Object.values(contentFiles).forEach((file) => {
  file.apiUrl = `https://api.github.com/repos/${repository}/contents/${file.path}`;
  file.githubEditUrl = `https://github.com/${repository}/edit/${branch}/${file.path}`;
});

function utf8ToBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToUtf8(value) {
  const binary = atob(value.replaceAll("\n", ""));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function setStatus(element, message, tone = "neutral") {
  element.dataset.tone = tone;
  element.textContent = message;
}

function parseNodesDraft(source) {
  try {
    return normalizeNodesContent(JSON.parse(source));
  } catch {
    return normalizeNodesContent();
  }
}

function edgeKey(from, to) {
  return [from, to].sort().join("::");
}

function serializeNodes(nodesDraft) {
  return `${JSON.stringify(
    {
      status: nodesDraft.status,
      nodes: nodesDraft.nodes.map(
        ({ id, x, y, title, preview, href, size }) => ({
          id,
          x: Math.round(x * 10) / 10,
          y: Math.round(y * 10) / 10,
          title: title.trim(),
          preview: preview.trim(),
          href: href.trim(),
          size,
        }),
      ),
      edges: nodesDraft.edges,
    },
    null,
    2,
  )}\n`;
}

function createThoughtNode(nodes) {
  const usedIds = new Set(nodes.map((node) => node.id));
  let number = nodes.length + 1;
  let id = `thought-${number}`;

  while (usedIds.has(id)) {
    number += 1;
    id = `thought-${number}`;
  }

  const angle = nodes.length * 2.399963;
  const x = 50 + Math.cos(angle) * 30;
  const y = 52 + Math.sin(angle) * 26;

  return {
    id,
    x: Math.round(Math.min(70, Math.max(30, x))),
    y: Math.round(Math.min(78, Math.max(30, y))),
    title: "new thought",
    preview: "",
    href: "",
    size: 14 + (nodes.length % 5),
  };
}

function renderNodeEditorItem(node, index, nodesDraft) {
  const connections = nodesDraft.nodes
    .filter((candidate) => candidate.id !== node.id)
    .map((candidate) => {
      const checked = nodesDraft.edges.some(
        ([from, to]) => edgeKey(from, to) === edgeKey(node.id, candidate.id),
      );

      return `
        <label class="editor-connection">
          <input
            type="checkbox"
            data-node-connection-from="${escapeHtml(node.id)}"
            data-node-connection-to="${escapeHtml(candidate.id)}"
            ${checked ? "checked" : ""}
          />
          <span data-connection-label="${escapeHtml(candidate.id)}">${escapeHtml(candidate.title)}</span>
        </label>
      `;
    })
    .join("");

  return `
    <article class="editor-node" data-editor-node-id="${escapeHtml(node.id)}">
      <div class="editor-node-heading">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <button type="button" data-remove-node="${escapeHtml(node.id)}">remove</button>
      </div>

      <div class="editor-node-fields">
        <label>
          <span>title</span>
          <input
            type="text"
            value="${escapeHtml(node.title)}"
            data-node-field="title"
            required
          />
        </label>

        <label class="editor-node-field-wide">
          <span>thought</span>
          <textarea data-node-field="preview" rows="3">${escapeHtml(node.preview)}</textarea>
        </label>

        <label class="editor-node-field-wide">
          <span>link</span>
          <input
            type="text"
            value="${escapeHtml(node.href)}"
            data-node-field="href"
            placeholder="optional"
          />
        </label>
      </div>

      <fieldset class="editor-node-connections">
        <legend>connect to</legend>
        <div>${connections || '<span class="editor-node-empty">add another node to connect it</span>'}</div>
      </fieldset>
    </article>
  `;
}

async function fetchGithubFile(file, headers = {}) {
  const response = await fetch(`${file.apiUrl}?ref=${branch}`, {
    cache: "no-store",
    headers: { Accept: "application/vnd.github+json", ...headers },
  });

  if (!response.ok) {
    throw new Error(
      response.status === 401 || response.status === 403
        ? "GitHub rejected that token. Check its repository and Contents permissions."
        : `Could not read ${file.path} from GitHub (${response.status}).`,
    );
  }

  return response.json();
}

async function publishGithubFile(file, content, headers) {
  const currentFile = await fetchGithubFile(file, headers);
  const response = await fetch(file.apiUrl, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: file.message,
      content: utf8ToBase64(content.trimEnd() + "\n"),
      sha: currentFile.sha,
      branch,
    }),
  });

  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    throw new Error(
      details.message ||
        `GitHub could not publish ${file.path} (${response.status}).`,
    );
  }

  return response.json();
}

export function mountEditor(app) {
  document.body.classList.add("editor-mode");
  document.title = "content editor — Johnny Ho";

  app.innerHTML = `
    <main class="editor-shell">
      <header class="editor-header">
        <div>
          <h1>Content</h1>
          <div class="editor-tabs" role="tablist" aria-label="Editor sections">
            <button type="button" role="tab" data-editor-tab="site">site copy</button>
            <button type="button" role="tab" data-editor-tab="nodes">nodes</button>
          </div>
        </div>
        <a class="editor-site-link" href="/">view site ↗</a>
      </header>

      <section class="editor-panel" data-editor-panel="site">
        <div class="editor-workspace">
          <section class="editor-card editor-compose" aria-labelledby="compose-title">
            <div class="editor-card-header">
              <h2 id="compose-title">Portfolio content</h2>
              <span class="editor-draft-state" data-site-state data-dirty="false">live copy</span>
            </div>

            <textarea
              class="editor-textarea"
              aria-label="Portfolio Markdown"
              spellcheck="true"
            >${escapeHtml(siteMarkdown)}</textarea>
          </section>

          <section class="editor-card editor-preview-card" aria-labelledby="preview-title">
            <div class="editor-card-header">
              <h2 id="preview-title">Live preview</h2>
            </div>
            <div class="editor-preview" aria-live="polite"></div>
          </section>
        </div>
      </section>

      <section class="editor-panel" data-editor-panel="nodes">
        <section class="editor-card editor-nodes-card" aria-labelledby="nodes-editor-title">
          <div class="editor-card-header editor-nodes-header">
            <div>
              <h2 id="nodes-editor-title">Nodes</h2>
              <span class="editor-draft-state" data-nodes-state data-dirty="false">live graph</span>
            </div>
            <div class="editor-node-actions">
              <a href="/nodes" target="_blank">view nodes ↗</a>
              <button type="button" data-add-node>add thought</button>
            </div>
          </div>
          <div class="editor-nodes-list"></div>
        </section>
      </section>

      <section class="editor-card editor-publish" aria-labelledby="publish-title">
        <div class="editor-publish-copy">
          <h2 id="publish-title">Send it live</h2>
          <div class="editor-help-links">
            <a href="${tokenUrl}" target="_blank" rel="noreferrer">create token ↗</a>
            <a href="${contentFiles.site.githubEditUrl}" target="_blank" rel="noreferrer">site file ↗</a>
            <a href="${contentFiles.nodes.githubEditUrl}" target="_blank" rel="noreferrer">nodes file ↗</a>
          </div>
        </div>

        <form class="editor-publish-form">
          <label for="github-token">Fine-grained GitHub token</label>
          <input
            id="github-token"
            name="github-token"
            type="password"
            autocomplete="off"
            placeholder="github_pat_…"
          />
          <button type="submit">publish changes</button>
          <p class="editor-status" role="status" data-tone="neutral"></p>
        </form>
      </section>
    </main>
  `;

  const tabButtons = [...app.querySelectorAll("[data-editor-tab]")];
  const panels = [...app.querySelectorAll("[data-editor-panel]")];
  const textarea = app.querySelector(".editor-textarea");
  const preview = app.querySelector(".editor-preview");
  const siteDraftState = app.querySelector("[data-site-state]");
  const nodesDraftState = app.querySelector("[data-nodes-state]");
  const nodesList = app.querySelector(".editor-nodes-list");
  const addNodeButton = app.querySelector("[data-add-node]");
  const form = app.querySelector(".editor-publish-form");
  const tokenInput = app.querySelector("#github-token");
  const submitButton = form.querySelector('button[type="submit"]');
  const status = app.querySelector(".editor-status");
  let nodesDraft = parseNodesDraft(nodesSource);
  let siteDirty = false;
  let nodesDirty = false;

  const syncEditorDirty = () => {
    if (siteDirty || nodesDirty) {
      document.body.dataset.editorDirty = "true";
    } else {
      delete document.body.dataset.editorDirty;
    }
  };

  const setActiveTab = (name) => {
    tabButtons.forEach((button) => {
      const active = button.dataset.editorTab === name;
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.editorPanel !== name;
    });
    window.history.replaceState(
      null,
      "",
      name === "nodes" ? "#nodes" : "#site",
    );
  };

  const markSiteDirty = () => {
    siteDirty = true;
    syncEditorDirty();
    siteDraftState.dataset.dirty = "true";
    siteDraftState.textContent = "unpublished changes";
  };

  const markNodesDirty = () => {
    nodesDirty = true;
    syncEditorDirty();
    nodesDraftState.dataset.dirty = "true";
    nodesDraftState.textContent = "unpublished changes";
  };

  const updatePreview = () => {
    const draft = parsePortfolioMarkdown(textarea.value);
    preview.innerHTML = renderPortfolio(draft, draft.navigation[0]);
    preview.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", (event) => event.preventDefault());
      link.setAttribute("tabindex", "-1");
    });
  };

  const renderNodesEditor = () => {
    nodesList.innerHTML = nodesDraft.nodes
      .map((node, index) => renderNodeEditorItem(node, index, nodesDraft))
      .join("");
  };

  updatePreview();
  renderNodesEditor();
  setActiveTab(window.location.hash === "#nodes" ? "nodes" : "site");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () =>
      setActiveTab(button.dataset.editorTab),
    );
  });

  textarea.addEventListener("input", () => {
    markSiteDirty();
    updatePreview();
  });

  addNodeButton.addEventListener("click", () => {
    const node = createThoughtNode(nodesDraft.nodes);
    nodesDraft.nodes.push(node);
    markNodesDirty();
    renderNodesEditor();
    const input = nodesList.querySelector(
      `[data-editor-node-id="${node.id}"] [data-node-field="title"]`,
    );
    input?.focus();
    input?.select();
  });

  nodesList.addEventListener("input", (event) => {
    const field = event.target.dataset.nodeField;
    const item = event.target.closest("[data-editor-node-id]");
    if (!field || !item) return;

    const node = nodesDraft.nodes.find(
      (candidate) => candidate.id === item.dataset.editorNodeId,
    );
    if (!node) return;

    node[field] = event.target.value;
    markNodesDirty();

    if (field === "title") {
      nodesList.querySelectorAll("[data-connection-label]").forEach((label) => {
        if (label.dataset.connectionLabel === node.id) {
          label.textContent = node.title || "untitled";
        }
      });
    }
  });

  nodesList.addEventListener("change", (event) => {
    const from = event.target.dataset.nodeConnectionFrom;
    const to = event.target.dataset.nodeConnectionTo;
    if (!from || !to) return;

    const key = edgeKey(from, to);
    nodesDraft.edges = nodesDraft.edges.filter(
      ([edgeFrom, edgeTo]) => edgeKey(edgeFrom, edgeTo) !== key,
    );
    if (event.target.checked) nodesDraft.edges.push([from, to]);

    nodesList
      .querySelectorAll("[data-node-connection-from]")
      .forEach((checkbox) => {
        if (
          edgeKey(
            checkbox.dataset.nodeConnectionFrom,
            checkbox.dataset.nodeConnectionTo,
          ) === key
        ) {
          checkbox.checked = event.target.checked;
        }
      });
    markNodesDirty();
  });

  nodesList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-node]");
    if (!button) return;

    const id = button.dataset.removeNode;
    nodesDraft.nodes = nodesDraft.nodes.filter((node) => node.id !== id);
    nodesDraft.edges = nodesDraft.edges.filter(
      ([from, to]) => from !== id && to !== id,
    );
    markNodesDirty();
    renderNodesEditor();
  });

  if (!["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    Promise.allSettled([
      fetchGithubFile(contentFiles.site),
      fetchGithubFile(contentFiles.nodes),
    ]).then(([siteResult, nodesResult]) => {
      if (siteResult.status === "fulfilled" && !siteDirty) {
        textarea.value = base64ToUtf8(siteResult.value.content);
        siteDraftState.textContent = "latest from github";
        updatePreview();
      }

      if (nodesResult.status === "fulfilled" && !nodesDirty) {
        nodesDraft = parseNodesDraft(base64ToUtf8(nodesResult.value.content));
        nodesDraftState.textContent = "latest from github";
        renderNodesEditor();
      }
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const token = tokenInput.value.trim();
    const changes = [];

    if (siteDirty) {
      changes.push({ file: contentFiles.site, content: textarea.value });
    }

    if (nodesDirty) {
      const untitled = nodesDraft.nodes.find((node) => !node.title.trim());
      if (untitled) {
        setStatus(
          status,
          "Give every node a title before publishing.",
          "error",
        );
        setActiveTab("nodes");
        nodesList
          .querySelector(
            `[data-editor-node-id="${untitled.id}"] [data-node-field="title"]`,
          )
          ?.focus();
        return;
      }

      changes.push({
        file: contentFiles.nodes,
        content: serializeNodes(nodesDraft),
      });
    }

    if (!changes.length) {
      setStatus(status, "Nothing new to publish.");
      return;
    }

    if (!token) {
      setStatus(status, "Paste your fine-grained GitHub token first.", "error");
      tokenInput.focus();
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "publishing…";

    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    };
    const commits = [];

    try {
      for (const [index, change] of changes.entries()) {
        setStatus(
          status,
          `Publishing ${index + 1} of ${changes.length}: ${change.file.path}…`,
        );
        const result = await publishGithubFile(
          change.file,
          change.content,
          headers,
        );
        commits.push(result.commit.sha.slice(0, 7));

        if (change.file === contentFiles.site) {
          siteDirty = false;
          siteDraftState.dataset.dirty = "false";
          siteDraftState.textContent = "published";
        } else {
          nodesDirty = false;
          nodesDraftState.dataset.dirty = "false";
          nodesDraftState.textContent = "published";
        }

        syncEditorDirty();
      }

      tokenInput.value = "";
      setStatus(
        status,
        `Published ${commits.join(", ")}. Vercel is rebuilding the site now.`,
        "success",
      );
    } catch (error) {
      setStatus(status, error.message, "error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "publish changes";
    }
  });

  window.addEventListener("beforeunload", (event) => {
    if (!siteDirty && !nodesDirty) return;
    event.preventDefault();
    event.returnValue = "";
  });

  window.addEventListener("pagehide", () => {
    tokenInput.value = "";
  });
}
