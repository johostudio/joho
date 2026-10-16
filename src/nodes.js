import { escapeHtml, renderInlineMarkdown, safeHref } from "./content.js";
import { nodesContent } from "./nodes-data.js";
import { renderNavigation } from "./view.js";
import "./nodes.css";

function renderNodePageMarkdown(value = "") {
  const blocks = [];
  let paragraph = [];
  let list = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(`<p>${renderInlineMarkdown(paragraph.join(" ").trim())}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!list.length) return;
    blocks.push(
      `<ul>${list.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul>`,
    );
    list = [];
  };

  for (const rawLine of String(value).replaceAll("\r\n", "\n").split("\n")) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push(`<h3>${renderInlineMarkdown(heading[1])}</h3>`);
      continue;
    }

    const listItem = line.match(/^[-*]\s+(.+)$/);
    if (listItem) {
      flushParagraph();
      list.push(listItem[1]);
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks.join("");
}

function renderNode(node, index) {
  const readableTitle = node.title.replaceAll(".", "");
  const floatX = 1.5 + (index % 3) * 0.55;
  const floatY = 1.25 + ((index + 1) % 3) * 0.5;
  const floatDuration = 6.4 + (index % 4) * 0.8;
  const floatDelay = index * -1.17;

  return `
    <button
      class="graph-node"
      type="button"
      data-node-id="${escapeHtml(node.id)}"
      aria-label="Read ${escapeHtml(readableTitle)}: ${escapeHtml(node.preview)}"
      draggable="false"
      style="--float-x: ${floatX}px; --float-y: ${floatY}px; --float-duration: ${floatDuration}s; --float-delay: ${floatDelay}s"
    >
      <span class="graph-node-dot" aria-hidden="true"></span>
      <span class="graph-node-label" aria-hidden="true">${escapeHtml(node.title)}</span>
      <span class="node-preview" aria-hidden="true">
        <span class="node-preview-type">node</span>
        <strong>${escapeHtml(node.title)}</strong>
        <span class="node-preview-copy">${escapeHtml(node.preview)}</span>
        <span class="node-preview-open">click to read &rarr;</span>
      </span>
    </button>
  `;
}

function renderEdges() {
  return nodesContent.edges
    .map(
      ([from, to]) =>
        `<g class="graph-edge" data-from="${escapeHtml(from)}" data-to="${escapeHtml(to)}">
          <line class="edge-hit" />
          <line class="edge-base" />
          <line class="edge-glint" pathLength="1" />
        </g>`,
    )
    .join("");
}

function createSpawnPoint(node, width, height, placedPoints) {
  const padding = Math.max(38, node.size + 24);
  const baseX = (node.x / 100) * width;
  const baseY = (node.y / 100) * height;
  const jitterX = Math.min(46, width * 0.065);
  const jitterY = Math.min(42, height * 0.06);
  const minimumDistance = Math.min(92, Math.max(62, width * 0.13));
  let bestPoint = null;
  let bestClearance = -1;

  for (let attempt = 0; attempt < 28; attempt += 1) {
    const point = {
      x: Math.min(
        width - padding,
        Math.max(padding, baseX + (Math.random() * 2 - 1) * jitterX),
      ),
      y: Math.min(
        height - padding,
        Math.max(padding, baseY + (Math.random() * 2 - 1) * jitterY),
      ),
    };
    const clearance = placedPoints.length
      ? Math.min(
          ...placedPoints.map((placed) =>
            Math.hypot(point.x - placed.x, point.y - placed.y),
          ),
        )
      : Number.POSITIVE_INFINITY;

    if (clearance > bestClearance) {
      bestPoint = point;
      bestClearance = clearance;
    }

    if (clearance >= minimumDistance) return point;
  }

  return bestPoint;
}

export function mountNodes(app, siteContent) {
  document.body.classList.add("nodes-mode");

  app.innerHTML = `
    <main class="site-shell nodes-shell">
      ${renderNavigation(siteContent, "nodes")}

      <p class="nodes-status">${escapeHtml(nodesContent.status)}</p>

      <section class="nodes-canvas" aria-label="Interactive in-progress node diagram">
        <svg class="nodes-edges" aria-hidden="true">
          ${renderEdges()}
        </svg>
        ${nodesContent.nodes.map(renderNode).join("")}
      </section>
    </main>

    <dialog class="node-page-dialog" aria-labelledby="node-page-title">
      <article class="node-page-card">
        <header class="node-page-header">
          <span class="node-page-kicker">node</span>
          <button class="node-page-close" type="button" aria-label="Close node page">&times;</button>
          <h2 id="node-page-title"></h2>
        </header>
        <div class="node-page-body"></div>
        <footer class="node-page-footer" hidden>
          <a class="node-page-link" href="#"></a>
        </footer>
      </article>
    </dialog>
  `;

  const canvas = app.querySelector(".nodes-canvas");
  const edgeSvg = app.querySelector(".nodes-edges");
  const nodeElements = [...app.querySelectorAll(".graph-node")];
  const edgeElements = [...app.querySelectorAll(".graph-edge")];
  const dialog = app.querySelector(".node-page-dialog");
  const dialogTitle = dialog.querySelector("#node-page-title");
  const dialogBody = dialog.querySelector(".node-page-body");
  const dialogFooter = dialog.querySelector(".node-page-footer");
  const dialogLink = dialog.querySelector(".node-page-link");
  const state = new Map();
  let canvasWidth = 0;
  let canvasHeight = 0;

  const updateGraph = () => {
    nodeElements.forEach((element) => {
      const nodeState = state.get(element.dataset.nodeId);
      if (!nodeState) return;

      element.style.left = `${nodeState.x}px`;
      element.style.top = `${nodeState.y}px`;
    });

    edgeElements.forEach((edge) => {
      const start = state.get(edge.dataset.from);
      const end = state.get(edge.dataset.to);
      if (!start || !end) return;

      edge.querySelectorAll("line").forEach((line) => {
        line.setAttribute("x1", start.x);
        line.setAttribute("y1", start.y);
        line.setAttribute("x2", end.x);
        line.setAttribute("y2", end.y);
      });
    });
  };

  const layoutGraph = () => {
    const bounds = canvas.getBoundingClientRect();
    const previousWidth = canvasWidth;
    const previousHeight = canvasHeight;
    canvasWidth = bounds.width;
    canvasHeight = bounds.height;
    edgeSvg.setAttribute("viewBox", `0 0 ${canvasWidth} ${canvasHeight}`);

    const placedPoints = [];

    nodesContent.nodes.forEach((node) => {
      const existing = state.get(node.id);

      if (existing && previousWidth && previousHeight) {
        existing.x = (existing.x / previousWidth) * canvasWidth;
        existing.y = (existing.y / previousHeight) * canvasHeight;
      } else if (!existing) {
        const spawnPoint = createSpawnPoint(
          node,
          canvasWidth,
          canvasHeight,
          placedPoints,
        );
        state.set(node.id, {
          x: spawnPoint.x,
          y: spawnPoint.y,
          moved: false,
          blockClick: false,
        });
      }

      const current = state.get(node.id);
      if (current) placedPoints.push({ x: current.x, y: current.y });
    });

    updateGraph();
    canvas.dataset.ready = "true";
  };

  const openNodePage = (node) => {
    const href = safeHref(node.href);
    const hasLink = Boolean(node.href && href !== "#");
    dialogTitle.textContent = node.title;
    dialogBody.innerHTML =
      renderNodePageMarkdown(node.content || node.preview) ||
      "<p>This node is still being written.</p>";
    dialogFooter.hidden = !hasLink;

    if (hasLink) {
      dialogLink.href = href;
      dialogLink.textContent = `open ${node.title.replaceAll(".", "")} page \u2192`;
    }

    if (!dialog.open) dialog.showModal();
  };

  const setActiveNode = (id) => {
    edgeElements.forEach((edge) => {
      edge.dataset.active = String(
        Boolean(id && [edge.dataset.from, edge.dataset.to].includes(id)),
      );
    });
  };

  nodeElements.forEach((element) => {
    const node = nodesContent.nodes.find(
      (item) => item.id === element.dataset.nodeId,
    );
    if (!node) return;

    element.style.setProperty("--node-size", `${node.size}px`);
    let pointerId = null;
    let startClientX = 0;
    let startClientY = 0;
    let offsetX = 0;
    let offsetY = 0;

    element.addEventListener("pointerenter", () =>
      setActiveNode(element.dataset.nodeId),
    );
    element.addEventListener("pointerleave", () => {
      if (pointerId === null) setActiveNode(null);
    });
    element.addEventListener("focus", () =>
      setActiveNode(element.dataset.nodeId),
    );
    element.addEventListener("blur", () => setActiveNode(null));
    element.addEventListener("dragstart", (event) => event.preventDefault());

    element.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;

      const nodeState = state.get(element.dataset.nodeId);
      const bounds = canvas.getBoundingClientRect();
      const elementBounds = element.getBoundingClientRect();
      if (!nodeState) return;

      nodeState.x = elementBounds.left + elementBounds.width / 2 - bounds.left;
      nodeState.y = elementBounds.top + elementBounds.height / 2 - bounds.top;
      pointerId = event.pointerId;
      startClientX = event.clientX;
      startClientY = event.clientY;
      offsetX = event.clientX - bounds.left - nodeState.x;
      offsetY = event.clientY - bounds.top - nodeState.y;
      nodeState.moved = false;
      element.dataset.dragging = "true";
      element.setPointerCapture(pointerId);
      setActiveNode(element.dataset.nodeId);
      updateGraph();
    });

    element.addEventListener("pointermove", (event) => {
      if (event.pointerId !== pointerId) return;

      const nodeState = state.get(element.dataset.nodeId);
      const bounds = canvas.getBoundingClientRect();
      if (!nodeState) return;

      if (
        Math.hypot(event.clientX - startClientX, event.clientY - startClientY) >
        4
      ) {
        nodeState.moved = true;
      }

      const padding = Math.max(24, node.size);
      nodeState.x = Math.min(
        canvasWidth - padding,
        Math.max(padding, event.clientX - bounds.left - offsetX),
      );
      nodeState.y = Math.min(
        canvasHeight - padding,
        Math.max(padding, event.clientY - bounds.top - offsetY),
      );
      updateGraph();
    });

    const finishDrag = (event) => {
      if (event.pointerId !== pointerId) return;

      const nodeState = state.get(element.dataset.nodeId);
      if (nodeState) nodeState.blockClick = nodeState.moved;
      element.releasePointerCapture(pointerId);
      pointerId = null;
      delete element.dataset.dragging;
      setActiveNode(null);
    };

    element.addEventListener("pointerup", finishDrag);
    element.addEventListener("pointercancel", finishDrag);
    element.addEventListener("click", (event) => {
      const nodeState = state.get(element.dataset.nodeId);
      if (nodeState?.blockClick) {
        event.preventDefault();
        nodeState.blockClick = false;
        return;
      }

      openNodePage(node);
    });
  });

  dialog.querySelector(".node-page-close").addEventListener("click", () => {
    dialog.close();
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  const resizeObserver = new ResizeObserver(layoutGraph);
  resizeObserver.observe(canvas);
  requestAnimationFrame(layoutGraph);
}
