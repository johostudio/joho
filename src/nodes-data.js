export const nodesContent = {
  status: "in progress node diagram... more nodes coming later.",
  nodes: [
    {
      id: "engineering",
      x: 28,
      y: 28,
      title: "engineering",
      detail: "open engineering →",
      href: "/engineering",
    },
    {
      id: "design",
      x: 72,
      y: 28,
      title: "design",
      detail: "open design →",
      href: "/design",
    },
    {
      id: "multimedia",
      x: 72,
      y: 72,
      title: "multimedia",
      detail: "open multimedia →",
      href: "/multimedia",
    },
    {
      id: "life",
      x: 28,
      y: 72,
      title: "life.",
      detail: "open life →",
      href: "/life",
    },
  ],
  edges: [
    ["engineering", "design"],
    ["design", "multimedia"],
    ["multimedia", "life"],
    ["life", "engineering"],
    ["engineering", "multimedia"],
  ],
};
