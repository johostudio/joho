import { siteContent } from "./content.js";
import "./styles.css";

const app = document.querySelector("#app");
const metaDescription = document.querySelector('meta[name="description"]');

const currentPath = window.location.pathname.replace(/\/$/, "") || "/";
const currentPage =
  siteContent.pages.find((page) => page.path === currentPath) ??
  siteContent.pages[0];

document.title = `${currentPage.label} — ${siteContent.siteName}`;
metaDescription?.setAttribute("content", siteContent.description);

const navigation = siteContent.pages
  .map(
    (page) => `
      <a
        href="${page.path}"
        ${page.id === currentPage.id ? 'aria-current="page"' : ""}
      >${page.label}</a>
    `,
  )
  .join("");

app.innerHTML = `
  <div class="page">
    <nav aria-label="Primary navigation">${navigation}</nav>
    <main>
      <p>${currentPage.message}</p>
    </main>
  </div>
`;
