import siteMarkdown from "../content/site.md?raw";

const navigation = [
  { id: "home", label: "home", path: "/" },
  { id: "engineering", label: "engineering", path: "/engineering" },
  { id: "design", label: "design", path: "/design" },
  { id: "multimedia", label: "multimedia", path: "/multimedia" },
  { id: "nodes", label: "life nodes", path: "/nodes" },
];

const standalonePages = [{ id: "life", label: "life.", path: "/life" }];

const defaultPageMessages = {
  engineering: "to be developed and designed soon :)",
  design: "to be developed and designed soon :)",
  multimedia: "to be developed and designed soon :)",
  life: "to be developed and designed soon :)",
};

const defaults = {
  siteName: "Johnny Ho",
  description:
    "Johnny Ho's portfolio for engineering, design, and multimedia work.",
  title: "Johnny Ho",
  profileImage: "/images/profile.jpg",
  profileImageAlt: "Johnny Ho's profile image",
  profileImageCaption:
    "my desk when i turned 20. now playing: [luke chiang](https://open.spotify.com/album/53SL5EIuJdUG7EBF6u2rdv)",
  multimediaPreviewUrl: "https://snoopystudio.framer.website/",
  multimediaPreviewLabel: "snoopystudio.framer.website",
};

export { siteMarkdown };

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function safeHref(value = "") {
  const href = String(value).trim();

  if (href.startsWith("/") || href.startsWith("#")) {
    return href;
  }

  try {
    const url = new URL(href);
    return ["https:", "http:", "mailto:"].includes(url.protocol) ? href : "#";
  } catch {
    return "#";
  }
}

export function renderInlineMarkdown(value = "") {
  const links = [];
  const tokenized = String(value).replace(
    /\[([^\]]+)]\(([^)\s]+)\)/g,
    (_match, label, href) => {
      const safeUrl = safeHref(href);

      if (safeUrl === "#" && href !== "#") {
        return label;
      }

      const token = `\uE000${links.length}\uE001`;
      links.push(`<a href="${escapeHtml(safeUrl)}">${escapeHtml(label)}</a>`);
      return token;
    },
  );

  return escapeHtml(tokenized)
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/_([^_\n]+)_/g, "<em>$1</em>")
    .replace(/\uE000(\d+)\uE001/g, (_match, index) => links[Number(index)]);
}

function splitFrontMatter(source) {
  const normalized = String(source).replaceAll("\r\n", "\n").trim();
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!match) {
    return { metadata: {}, body: normalized };
  }

  const metadata = {};

  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (key) metadata[key] = value;
  }

  return { metadata, body: match[2].trim() };
}

function parseList(lines) {
  const items = [];

  for (const line of lines) {
    const item = line.match(/^\s*-\s+(.+)$/);

    if (item) {
      items.push(item[1].trim());
      continue;
    }

    if (line.trim() && items.length) {
      items[items.length - 1] += ` ${line.trim()}`;
    }
  }

  return items;
}

function parseFooterItem(item) {
  const link = item.match(/^\[([^\]]+)]\(([^)\s]+)\)$/);
  if (!link) return null;

  const href = safeHref(link[2]);
  if (href === "#" && link[2] !== "#") return null;

  return { label: link[1], href };
}

export function parsePortfolioMarkdown(source) {
  const { metadata, body } = splitFrontMatter(source);
  const lines = body.split("\n");
  const introLines = [];
  const rawSections = [];
  let currentSection = null;

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/);

    if (heading) {
      currentSection = { heading: heading[1].trim(), lines: [] };
      rawSections.push(currentSection);
    } else if (currentSection) {
      currentSection.lines.push(line);
    } else {
      introLines.push(line);
    }
  }

  const footerSection = rawSections.find(
    (section) => section.heading.toLowerCase() === "footer",
  );
  const footerLinks = footerSection
    ? parseList(footerSection.lines).map(parseFooterItem).filter(Boolean)
    : [];
  const sections = rawSections
    .filter((section) => section !== footerSection)
    .map((section) => ({
      heading: section.heading,
      items: parseList(section.lines),
    }))
    .filter((section) => section.items.length);

  return {
    siteName: metadata.siteName || defaults.siteName,
    description: metadata.description || defaults.description,
    navigation,
    pages: [...navigation, ...standalonePages],
    home: {
      title: metadata.title || defaults.title,
      introduction: introLines.join("\n").trim(),
      profileImage: safeHref(metadata.profileImage || defaults.profileImage),
      profileImageAlt: metadata.profileImageAlt || defaults.profileImageAlt,
      profileImageCaption:
        metadata.profileImageCaption || defaults.profileImageCaption,
      sections,
    },
    pageMessages: {
      engineering: metadata.engineeringPage || defaultPageMessages.engineering,
      design: metadata.designPage || defaultPageMessages.design,
      multimedia: metadata.multimediaPage || defaultPageMessages.multimedia,
      life: metadata.lifePage || defaultPageMessages.life,
    },
    pagePreviews: {
      multimedia: {
        url: safeHref(
          metadata.multimediaPreviewUrl || defaults.multimediaPreviewUrl,
        ),
        label:
          metadata.multimediaPreviewLabel || defaults.multimediaPreviewLabel,
      },
    },
    footerLinks,
  };
}

export const siteContent = parsePortfolioMarkdown(siteMarkdown);
