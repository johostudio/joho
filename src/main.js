import "@fontsource-variable/inter";
import { siteContent } from "./content.js";
import { renderPortfolio } from "./view.js";
import { mountMusicPlayer } from "./music-player.js";
import "./styles.css";

const app = document.querySelector("#app");
const metaDescription = document.querySelector('meta[name="description"]');
const currentPath = window.location.pathname.replace(/\/$/, "") || "/";

function enablePageTransitions() {
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  window.addEventListener("pageshow", () => {
    document.body.classList.remove("is-page-leaving");
  });

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (
      !link ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      link.hasAttribute("download") ||
      document.body.dataset.editorDirty === "true" ||
      (link.target && link.target !== "_self")
    ) {
      return;
    }

    const destination = new URL(link.href, window.location.href);
    if (
      destination.origin !== window.location.origin ||
      destination.href === window.location.href ||
      (destination.pathname === window.location.pathname &&
        destination.search === window.location.search &&
        destination.hash)
    ) {
      return;
    }

    event.preventDefault();

    if (reducedMotion) {
      window.location.assign(destination.href);
      return;
    }

    if (document.body.classList.contains("is-page-leaving")) return;
    document.body.classList.add("is-page-leaving");
    window.setTimeout(() => window.location.assign(destination.href), 130);
  });
}

if (currentPath === "/edit") {
  const { mountEditor } = await import("./editor.js");
  mountEditor(app);
} else if (currentPath === "/nodes") {
  const { mountNodes } = await import("./nodes.js");
  const nodesPage = siteContent.navigation.find((page) => page.id === "nodes");
  document.title = `${nodesPage?.label || "life nodes"} — ${siteContent.siteName}`;
  metaDescription?.setAttribute("content", siteContent.description);
  mountNodes(app, siteContent);
} else {
  const currentPage =
    siteContent.pages.find((page) => page.path === currentPath) ??
    siteContent.navigation[0];

  document.title = `${currentPage.label} — ${siteContent.siteName}`;
  metaDescription?.setAttribute("content", siteContent.description);
  app.innerHTML = renderPortfolio(siteContent, currentPage);
}

if (currentPath !== "/edit") {
  mountMusicPlayer(siteContent.musicPlayer);
}

enablePageTransitions();
