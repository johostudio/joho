import nodesData from "../content/nodes.json";

const fallbackStatus =
  "in progress node diagram... drag nodes · hover to preview · click linked nodes to open";

function clamp(value, minimum, maximum, fallback) {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.min(maximum, Math.max(minimum, number))
    : fallback;
}

function uniqueId(value, index, usedIds) {
  const base =
    String(value || `thought-${index + 1}`)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "") || `thought-${index + 1}`;
  let candidate = base;
  let suffix = 2;

  while (usedIds.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  usedIds.add(candidate);
  return candidate;
}

export function normalizeNodesContent(value = {}) {
  const usedIds = new Set();
  const sourceNodes = Array.isArray(value.nodes) ? value.nodes : [];
  const nodes = sourceNodes.map((node, index) => ({
    id: uniqueId(node?.id, index, usedIds),
    x: clamp(node?.x, 8, 92, 50),
    y: clamp(node?.y, 8, 92, 50),
    title: String(node?.title || `thought ${index + 1}`).trim(),
    preview: String(node?.preview || "").trim(),
    href: String(node?.href || "").trim(),
    size: clamp(node?.size, 12, 24, 16),
  }));
  const ids = new Set(nodes.map((node) => node.id));
  const usedEdges = new Set();
  const edges = (Array.isArray(value.edges) ? value.edges : [])
    .filter(
      (edge) =>
        Array.isArray(edge) &&
        edge.length >= 2 &&
        ids.has(edge[0]) &&
        ids.has(edge[1]) &&
        edge[0] !== edge[1],
    )
    .filter(([from, to]) => {
      const key = [from, to].sort().join("::");
      if (usedEdges.has(key)) return false;
      usedEdges.add(key);
      return true;
    })
    .map(([from, to]) => [from, to]);

  return {
    status: String(value.status || fallbackStatus).trim(),
    nodes,
    edges,
  };
}

export const nodesContent = normalizeNodesContent(nodesData);
