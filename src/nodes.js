import { escapeHtml, safeHref } from "./content.js";
import { nodesContent } from "./nodes-data.js";
import { renderNavigation } from "./view.js";
import "./nodes.css";

function renderNode(node) {
  const readableTitle = node.title.replaceAll(".", "");
  const href = safeHref(node.href);
  const hasLink = Boolean(node.href && href !== "#");
  const tag = hasLink ? "a" : "button";
  const linkAttributes = hasLink
    ? `href="${escapeHtml(href)}"`
    : 'type="button"';
  const previewType = hasLink ? "page" : "thought";
  const previewAction = hasLink ? "click to open →" : "drag to move";

  return `
    <${tag}
      class="graph-node"
      data-node-id="${escapeHtml(node.id)}"
      ${linkAttributes}
      aria-label="${hasLink ? "Open " : "Explore "}${escapeHtml(readableTitle)}: ${escapeHtml(node.preview)}"
      draggable="false"
    >
      <span class="graph-node-dot" aria-hidden="true"></span>
      <span class="graph-node-label" aria-hidden="true">${escapeHtml(node.title)}</span>
      <span class="node-preview" aria-hidden="true">
        <span class="node-preview-type">${previewType}</span>
        <strong>${escapeHtml(node.title)}</strong>
        <span class="node-preview-copy">${escapeHtml(node.preview)}</span>
        <span class="node-preview-open">${previewAction}</span>
      </span>
    </${tag}>
  `;
}

function renderEdges() {
  return nodesContent.edges
    .map(
      ([from, to]) =>
        `<line data-from="${escapeHtml(from)}" data-to="${escapeHtml(to)}" />`,
    )
    .join("");
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
  `;

  const canvas = app.querySelector(".nodes-canvas");
  const edgeSvg = app.querySelector(".nodes-edges");
  const nodeElements = [...app.querySelectorAll(".graph-node")];
  const edgeElements = [...app.querySelectorAll(".nodes-edges line")];
  const state = new Map();
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  let canvasWidth = 0;
  let canvasHeight = 0;
  let lastFrameTime = 0;
  let animationFrame = null;

  const displayPoint = (nodeState, frameTime) => {
    if (reducedMotion || nodeState.dragging) {
      return { x: nodeState.x, y: nodeState.y };
    }

    return {
      x:
        nodeState.x +
        Math.sin(frameTime * nodeState.speed + nodeState.phase) *
          nodeState.amplitude,
      y:
        nodeState.y +
        Math.cos(frameTime * nodeState.speed * 0.82 + nodeState.phase) *
          nodeState.amplitude,
    };
  };

  const updateGraph = (frameTime = lastFrameTime) => {
    lastFrameTime = frameTime;

    nodeElements.forEach((element) => {
      const nodeState = state.get(element.dataset.nodeId);
      if (!nodeState) return;

      const point = displayPoint(nodeState, frameTime);
      nodeState.renderX = point.x;
      nodeState.renderY = point.y;
      element.style.left = `${point.x}px`;
      element.style.top = `${point.y}px`;
    });

    edgeElements.forEach((edge) => {
      const start = state.get(edge.dataset.from);
      const end = state.get(edge.dataset.to);
      if (!start || !end) return;

      edge.setAttribute("x1", start.renderX ?? start.x);
      edge.setAttribute("y1", start.renderY ?? start.y);
      edge.setAttribute("x2", end.renderX ?? end.x);
      edge.setAttribute("y2", end.renderY ?? end.y);
    });
  };

  const animateGraph = (frameTime) => {
    updateGraph(frameTime);
    animationFrame = requestAnimationFrame(animateGraph);
  };

  const layoutGraph = () => {
    const bounds = canvas.getBoundingClientRect();
    const previousWidth = canvasWidth;
    const previousHeight = canvasHeight;
    canvasWidth = bounds.width;
    canvasHeight = bounds.height;
    edgeSvg.setAttribute("viewBox", `0 0 ${canvasWidth} ${canvasHeight}`);

    nodesContent.nodes.forEach((node, index) => {
      const existing = state.get(node.id);

      if (existing && previousWidth && previousHeight) {
        existing.x = (existing.x / previousWidth) * canvasWidth;
        existing.y = (existing.y / previousHeight) * canvasHeight;
      } else if (!existing) {
        state.set(node.id, {
          x: (node.x / 100) * canvasWidth,
          y: (node.y / 100) * canvasHeight,
          renderX: null,
          renderY: null,
          moved: false,
          blockClick: false,
          dragging: false,
          phase: index * 1.71,
          amplitude: 1.5 + (index % 3) * 0.6,
          speed: 0.00032 + (index % 4) * 0.000025,
        });
      }
    });

    updateGraph(performance.now());
    canvas.dataset.ready = "true";

    if (!reducedMotion && animationFrame === null) {
      animationFrame = requestAnimationFrame(animateGraph);
    }
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
      if (!nodeState) return;

      nodeState.x = nodeState.renderX ?? nodeState.x;
      nodeState.y = nodeState.renderY ?? nodeState.y;
      nodeState.dragging = true;
      pointerId = event.pointerId;
      startClientX = event.clientX;
      startClientY = event.clientY;
      offsetX = event.clientX - bounds.left - nodeState.x;
      offsetY = event.clientY - bounds.top - nodeState.y;
      nodeState.moved = false;
      element.dataset.dragging = "true";
      element.setPointerCapture(pointerId);
      setActiveNode(element.dataset.nodeId);
      updateGraph(performance.now());
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
      updateGraph(performance.now());
    });

    const finishDrag = (event) => {
      if (event.pointerId !== pointerId) return;

      const nodeState = state.get(element.dataset.nodeId);
      if (nodeState) {
        nodeState.blockClick = nodeState.moved;
        nodeState.dragging = false;
      }
      element.releasePointerCapture(pointerId);
      pointerId = null;
      delete element.dataset.dragging;
      setActiveNode(null);
    };

    element.addEventListener("pointerup", finishDrag);
    element.addEventListener("pointercancel", finishDrag);
    element.addEventListener("click", (event) => {
      const nodeState = state.get(element.dataset.nodeId);
      if (!nodeState?.blockClick) return;

      event.preventDefault();
      nodeState.blockClick = false;
    });
  });

  const resizeObserver = new ResizeObserver(layoutGraph);
  resizeObserver.observe(canvas);
  requestAnimationFrame(layoutGraph);
}
