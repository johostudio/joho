import "@fontsource-variable/inter";
import { siteContent } from "./content.js";
import "./styles.css";

const app = document.querySelector("#app");
const metaDescription = document.querySelector('meta[name="description"]');

const currentPath = window.location.pathname.replace(/\/$/, "") || "/";
const currentPage =
  siteContent.navigation.find((page) => page.path === currentPath) ??
  siteContent.navigation[0];

document.title = `${currentPage.label} — ${siteContent.siteName}`;
metaDescription?.setAttribute("content", siteContent.description);

const navigation = siteContent.navigation
  .map(
    (page) => `
      <li>
        <a
          class="simple-link"
          href="${page.path}"
          ${page.id === currentPage.id ? 'aria-current="page"' : ""}
        >${page.label}</a>
      </li>
    `,
  )
  .join("");

const homeSections = siteContent.home.sections
  .map(
    (section) => `
      <section class="content-section">
        <h2>${section.heading}</h2>
        <ul>
          ${section.items.map((item) => `<li>${item}</li>`).join("")}
        </ul>
      </section>
    `,
  )
  .join("");

const homeContent = `
  <header class="home-header">
    <div class="home-intro">
      <h1>${siteContent.home.title}</h1>
      <p>${siteContent.home.introduction}</p>
    </div>
    <img
      class="profile-image"
      src="${siteContent.home.profileImage}"
      alt="${siteContent.home.profileImageAlt}"
    />
  </header>
  ${homeSections}
`;

const secondaryContent = `
  <section class="secondary-page" aria-labelledby="page-title">
    <h1 id="page-title">${currentPage.label}</h1>
    <p>${siteContent.pageMessages[currentPage.id]}</p>
  </section>
`;

const footerLinks = siteContent.footerLinks
  .map((link) => `<a class="simple-link" href="${link.href}">${link.label}</a>`)
  .join("");

app.innerHTML = `
  <main class="site-shell">
    <nav aria-label="Primary navigation">
      <ul>${navigation}</ul>
    </nav>

    ${currentPage.id === "home" ? homeContent : secondaryContent}

    <footer>${footerLinks}</footer>
  </main>
`;
