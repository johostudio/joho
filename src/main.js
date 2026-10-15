import "@fontsource-variable/inter";
import { siteContent } from "./content.js";
import { renderPortfolio } from "./view.js";
import "./styles.css";

const app = document.querySelector("#app");
const metaDescription = document.querySelector('meta[name="description"]');
const currentPath = window.location.pathname.replace(/\/$/, "") || "/";

if (currentPath === "/edit") {
  const { mountEditor } = await import("./editor.js");
  mountEditor(app);
} else {
  const currentPage =
    siteContent.navigation.find((page) => page.path === currentPath) ??
    siteContent.navigation[0];

  document.title = `${currentPage.label} — ${siteContent.siteName}`;
  metaDescription?.setAttribute("content", siteContent.description);
  app.innerHTML = renderPortfolio(siteContent, currentPage);
}
