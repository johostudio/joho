import { escapeHtml, parsePortfolioMarkdown, siteMarkdown } from "./content.js";
import { renderPortfolio } from "./view.js";
import "./editor.css";

const repository = "johostudio/joho";
const branch = "main";
const contentPath = "content/site.md";
const apiUrl = `https://api.github.com/repos/${repository}/contents/${contentPath}`;
const githubEditUrl = `https://github.com/${repository}/edit/${branch}/${contentPath}`;
const tokenUrl = "https://github.com/settings/personal-access-tokens/new";

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

export function mountEditor(app) {
  document.body.classList.add("editor-mode");
  document.title = "content editor — Johnny Ho";

  app.innerHTML = `
    <main class="editor-shell">
      <header class="editor-header">
        <div>
          <p class="editor-eyebrow">johnnyho.ca / content</p>
          <h1>Make it yours.</h1>
          <p class="editor-lede">
            Edit the page as Markdown, preview it live, then publish a normal
            GitHub commit. Links use <code>[label](https://example.com)</code>.
          </p>
        </div>
        <a class="editor-site-link" href="/">view site ↗</a>
      </header>

      <div class="editor-workspace">
        <section class="editor-card editor-compose" aria-labelledby="compose-title">
          <div class="editor-card-header">
            <div>
              <p class="editor-step">01 / write</p>
              <h2 id="compose-title">Portfolio content</h2>
            </div>
            <span class="editor-draft-state" data-dirty="false">live copy</span>
          </div>

          <textarea
            class="editor-textarea"
            aria-label="Portfolio Markdown"
            spellcheck="true"
          >${escapeHtml(siteMarkdown)}</textarea>

          <div class="editor-syntax" aria-label="Supported Markdown syntax">
            <span><code>## heading</code></span>
            <span><code>- list item</code></span>
            <span><code>[text](url)</code></span>
            <span><code>**bold**</code></span>
            <span><code>_italic_</code></span>
          </div>
        </section>

        <section class="editor-card editor-preview-card" aria-labelledby="preview-title">
          <div class="editor-card-header">
            <div>
              <p class="editor-step">02 / check</p>
              <h2 id="preview-title">Live preview</h2>
            </div>
            <span class="editor-preview-label">links disabled here</span>
          </div>
          <div class="editor-preview" aria-live="polite"></div>
        </section>
      </div>

      <section class="editor-card editor-publish" aria-labelledby="publish-title">
        <div class="editor-publish-copy">
          <p class="editor-step">03 / publish</p>
          <h2 id="publish-title">Send it live</h2>
          <p>
            Use a fine-grained GitHub token limited to
            <strong>${repository}</strong> with <strong>Contents: read and write</strong>.
            The token stays in this tab and is never saved by the site.
          </p>
          <div class="editor-help-links">
            <a href="${tokenUrl}" target="_blank" rel="noreferrer">create token ↗</a>
            <a href="${githubEditUrl}" target="_blank" rel="noreferrer">edit directly on GitHub ↗</a>
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
          <p class="editor-status" role="status" data-tone="neutral">
            Publishing commits to main; Vercel deploys it automatically.
          </p>
        </form>
      </section>
    </main>
  `;

  const textarea = app.querySelector(".editor-textarea");
  const preview = app.querySelector(".editor-preview");
  const draftState = app.querySelector(".editor-draft-state");
  const form = app.querySelector(".editor-publish-form");
  const tokenInput = app.querySelector("#github-token");
  const submitButton = form.querySelector("button");
  const status = app.querySelector(".editor-status");
  let hasLocalEdits = false;

  const updatePreview = () => {
    const draft = parsePortfolioMarkdown(textarea.value);
    preview.innerHTML = renderPortfolio(draft, draft.navigation[0]);
    preview.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", (event) => event.preventDefault());
      link.setAttribute("tabindex", "-1");
    });
  };

  updatePreview();

  textarea.addEventListener("input", () => {
    hasLocalEdits = true;
    draftState.dataset.dirty = "true";
    draftState.textContent = "unpublished changes";
    updatePreview();
  });

  if (!["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    fetch(`${apiUrl}?ref=${branch}`, {
      cache: "no-store",
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((currentFile) => {
        if (!currentFile?.content || hasLocalEdits) return;

        textarea.value = base64ToUtf8(currentFile.content);
        draftState.textContent = "latest from github";
        updatePreview();
      })
      .catch(() => {
        // The bundled copy remains fully editable if GitHub is unavailable.
      });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const token = tokenInput.value.trim();

    if (!token) {
      setStatus(status, "Paste your fine-grained GitHub token first.", "error");
      tokenInput.focus();
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "publishing…";
    setStatus(status, "Checking the current GitHub version…");

    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    };

    try {
      const currentResponse = await fetch(`${apiUrl}?ref=${branch}`, {
        headers,
      });

      if (!currentResponse.ok) {
        throw new Error(
          currentResponse.status === 401 || currentResponse.status === 403
            ? "GitHub rejected that token. Check its repository and Contents permissions."
            : `Could not read the content file from GitHub (${currentResponse.status}).`,
        );
      }

      const currentFile = await currentResponse.json();
      setStatus(status, "Creating a conventional content commit…");

      const publishResponse = await fetch(apiUrl, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "docs: update portfolio content",
          content: utf8ToBase64(textarea.value.trimEnd() + "\n"),
          sha: currentFile.sha,
          branch,
        }),
      });

      if (!publishResponse.ok) {
        const details = await publishResponse.json().catch(() => ({}));
        throw new Error(
          details.message ||
            `GitHub could not publish (${publishResponse.status}).`,
        );
      }

      const result = await publishResponse.json();
      tokenInput.value = "";
      hasLocalEdits = false;
      draftState.dataset.dirty = "false";
      draftState.textContent = "published";
      setStatus(
        status,
        `Published ${result.commit.sha.slice(0, 7)}. Vercel is rebuilding the site now.`,
        "success",
      );
    } catch (error) {
      setStatus(status, error.message, "error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "publish changes";
    }
  });

  window.addEventListener("pagehide", () => {
    tokenInput.value = "";
  });
}
