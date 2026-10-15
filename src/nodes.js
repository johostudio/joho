import { escapeHtml, renderInlineMarkdown, safeHref } from "./content.js";
import { nodesContent } from "./nodes-data.js";
import { renderFooter, renderNavigation } from "./view.js";
import "./nodes.css";

const stageWidth = 1400;
const stageHeight = 900;

function renderNode(node) {
  const href = node.href ? safeHref(node.href) : null;
  const isExternal = href?.startsWith("http");
  const tag = href ? "a" : "article";
  const linkAttributes = href
    ? `href="${escapeHtml(href)}"${isExternal ? ' target="_blank" rel="noreferrer"' : ""}`
    : "";
  const label = node.label
    ? `<span class="map-node-label">${escapeHtml(node.label)}</span>`
    : "";
  const image = node.image
    ? `<img src="${escapeHtml(safeHref(node.image))}" alt="${escapeHtml(node.alt || "")}" />`
    : "";
  const body = node.body ? `<p>${renderInlineMarkdown(node.body)}</p>` : "";
  const arrow = href
    ? '<span class="map-node-arrow" aria-hidden="true">↗</span>'
    : "";

  return `
    <${tag}
      class="map-node map-node-${escapeHtml(node.type)} tone-${escapeHtml(node.tone)}"
      data-node-id="${escapeHtml(node.id)}"
      ${linkAttributes}
    >
      ${image}
      <div class="map-node-copy">
        ${label}
        <h2>${escapeHtml(node.title)}</h2>
        ${body}
      </div>
      ${arrow}
    </${tag}>
  `;
}

function renderEdges() {
  const byId = new Map(nodesContent.nodes.map((node) => [node.id, node]));

  return nodesContent.edges
    .map(([from, to]) => {
      const start = byId.get(from);
      const end = byId.get(to);
      if (!start || !end) return "";

      const x1 = (start.x / 100) * stageWidth;
      const y1 = (start.y / 100) * stageHeight;
      const x2 = (end.x / 100) * stageWidth;
      const y2 = (end.y / 100) * stageHeight;

      return `<line data-from="${escapeHtml(from)}" data-to="${escapeHtml(to)}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
    })
    .join("");
}

export function mountNodes(app, siteContent) {
  document.body.classList.add("nodes-mode");

  app.innerHTML = `
    <main class="site-shell nodes-shell">
      <div class="nodes-top">${renderNavigation(siteContent, "nodes")}</div>

      <header class="nodes-header">
        <h1>${escapeHtml(nodesContent.title)}</h1>
        <p>${escapeHtml(nodesContent.introduction)}</p>
      </header>

      <section class="nodes-map" aria-label="Interactive map of Johnny's world">
        <div class="nodes-toolbar">
          <span>drag to wander</span>
          <div class="nodes-controls" aria-label="Map controls">
            <button type="button" data-map-action="out" aria-label="Zoom out">−</button>
            <button type="button" data-map-action="reset" aria-label="Reset map">reset</button>
            <button type="button" data-map-action="in" aria-label="Zoom in">+</button>
          </div>
        </div>
        <div class="nodes-viewport" tabindex="0">
          <div class="nodes-stage">
            <svg class="nodes-edges" viewBox="0 0 ${stageWidth} ${stageHeight}" aria-hidden="true">
              ${renderEdges()}
            </svg>
            ${nodesContent.nodes.map(renderNode).join("")}
          </div>
        </div>
      </section>

      <div class="nodes-footer">${renderFooter(siteContent)}</div>
    </main>
  `;

  const viewport = app.querySelector(".nodes-viewport");
  const stage = app.querySelector(".nodes-stage");
  const controls = app.querySelector(".nodes-controls");
  const nodeElements = [...app.querySelectorAll(".map-node")];
  const edgeElements = [...app.querySelectorAll(".nodes-edges line")];
  let scale = 0.72;
  let offsetX = 0;
  let offsetY = 0;
  let pointerId = null;
  let startX = 0;
  let startY = 0;

  nodeElements.forEach((element) => {
    const node = nodesContent.nodes.find(
      (item) => item.id === element.dataset.nodeId,
    );
    if (!node) return;

    element.style.left = `${node.x}%`;
    element.style.top = `${node.y}%`;
  });

  const applyTransform = () => {
    stage.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
  };

  const resetMap = () => {
    const padding = viewport.clientWidth < 640 ? 24 : 56;
    scale = Math.min(
      0.82,
      (viewport.clientWidth - padding) / stageWidth,
      (viewport.clientHeight - padding) / stageHeight,
    );
    scale = Math.max(0.42, scale);
    offsetX = (viewport.clientWidth - stageWidth * scale) / 2;
    offsetY = (viewport.clientHeight - stageHeight * scale) / 2;
    applyTransform();
  };

  const zoomTo = (nextScale, clientX, clientY) => {
    const clamped = Math.min(1.35, Math.max(0.42, nextScale));
    const bounds = viewport.getBoundingClientRect();
    const anchorX = clientX ?? bounds.left + bounds.width / 2;
    const anchorY = clientY ?? bounds.top + bounds.height / 2;
    const worldX = (anchorX - bounds.left - offsetX) / scale;
    const worldY = (anchorY - bounds.top - offsetY) / scale;

    scale = clamped;
    offsetX = anchorX - bounds.left - worldX * scale;
    offsetY = anchorY - bounds.top - worldY * scale;
    applyTransform();
  };

  controls.addEventListener("click", (event) => {
    const action = event.target.closest("button")?.dataset.mapAction;
    if (action === "in") zoomTo(scale + 0.12);
    if (action === "out") zoomTo(scale - 0.12);
    if (action === "reset") resetMap();
  });

  viewport.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      zoomTo(
        scale * (event.deltaY > 0 ? 0.9 : 1.1),
        event.clientX,
        event.clientY,
      );
    },
    { passive: false },
  );

  viewport.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".map-node, button, a")) return;
    pointerId = event.pointerId;
    startX = event.clientX - offsetX;
    startY = event.clientY - offsetY;
    viewport.dataset.dragging = "true";
    viewport.setPointerCapture(pointerId);
  });

  viewport.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointerId) return;
    offsetX = event.clientX - startX;
    offsetY = event.clientY - startY;
    applyTransform();
  });

  const endDrag = (event) => {
    if (event.pointerId !== pointerId) return;
    viewport.releasePointerCapture(pointerId);
    pointerId = null;
    delete viewport.dataset.dragging;
  };

  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);

  viewport.addEventListener("keydown", (event) => {
    if (["+", "="].includes(event.key)) zoomTo(scale + 0.12);
    if (event.key === "-") zoomTo(scale - 0.12);
    if (event.key === "0") resetMap();
  });

  const setActiveNode = (id) => {
    edgeElements.forEach((edge) => {
      edge.dataset.active = String(
        Boolean(id && [edge.dataset.from, edge.dataset.to].includes(id)),
      );
    });
    nodeElements.forEach((node) => {
      const connected = edgeElements.some(
        (edge) =>
          edge.dataset.active === "true" &&
          [edge.dataset.from, edge.dataset.to].includes(node.dataset.nodeId),
      );
      node.dataset.connected = String(Boolean(id && connected));
    });
  };

  nodeElements.forEach((node) => {
    node.addEventListener("pointerenter", () =>
      setActiveNode(node.dataset.nodeId),
    );
    node.addEventListener("pointerleave", () => setActiveNode(null));
    node.addEventListener("focus", () => setActiveNode(node.dataset.nodeId));
    node.addEventListener("blur", () => setActiveNode(null));
  });

  window.addEventListener("resize", resetMap);
  requestAnimationFrame(resetMap);
}
