import { escapeHtml, safeHref } from "./content.js";
import { nodesContent } from "./nodes-data.js";
import { renderNavigation } from "./view.js";
import "./nodes.css";

function renderNode(node) {
  return `
    <a
      class="map-node"
      data-node-id="${escapeHtml(node.id)}"
      href="${escapeHtml(safeHref(node.href))}"
      aria-label="Open ${escapeHtml(node.title.replace(".", ""))} page"
    >
      <span class="map-node-title">${escapeHtml(node.title)}</span>
      <span class="map-node-detail">${escapeHtml(node.detail)}</span>
    </a>
  `;
}

function renderEdges() {
  const byId = new Map(nodesContent.nodes.map((node) => [node.id, node]));

  return nodesContent.edges
    .map(([from, to]) => {
      const start = byId.get(from);
      const end = byId.get(to);
      if (!start || !end) return "";

      return `<line data-from="${escapeHtml(from)}" data-to="${escapeHtml(to)}" x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" />`;
    })
    .join("");
}

export function mountNodes(app, siteContent) {
  document.body.classList.add("nodes-mode");

  app.innerHTML = `
    <main class="site-shell nodes-shell">
      ${renderNavigation(siteContent, "nodes")}

      <p class="nodes-status">${escapeHtml(nodesContent.status)}</p>

      <section class="nodes-canvas" aria-label="In-progress node diagram">
        <svg class="nodes-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          ${renderEdges()}
        </svg>
        ${nodesContent.nodes.map(renderNode).join("")}
      </section>
    </main>
  `;

  const nodeElements = [...app.querySelectorAll(".map-node")];
  const edgeElements = [...app.querySelectorAll(".nodes-edges line")];

  nodeElements.forEach((element) => {
    const node = nodesContent.nodes.find(
      (item) => item.id === element.dataset.nodeId,
    );
    if (!node) return;

    element.style.left = `${node.x}%`;
    element.style.top = `${node.y}%`;

    const setActive = (active) => {
      edgeElements.forEach((edge) => {
        edge.dataset.active = String(
          active && [edge.dataset.from, edge.dataset.to].includes(node.id),
        );
      });
    };

    element.addEventListener("pointerenter", () => setActive(true));
    element.addEventListener("pointerleave", () => setActive(false));
    element.addEventListener("focus", () => setActive(true));
    element.addEventListener("blur", () => setActive(false));
  });
}
