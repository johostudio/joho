import { escapeHtml, renderInlineMarkdown, safeHref } from "./content.js";

export function renderPortfolio(siteContent, currentPage) {
  const navigation = siteContent.navigation
    .map(
      (page) => `
        <li>
          <a
            class="simple-link"
            href="${escapeHtml(safeHref(page.path))}"
            ${page.id === currentPage.id ? 'aria-current="page"' : ""}
          >${escapeHtml(page.label)}</a>
        </li>
      `,
    )
    .join("");

  const homeSections = siteContent.home.sections
    .map(
      (section) => `
        <section class="content-section">
          <h2>${escapeHtml(section.heading)}</h2>
          <ul>
            ${section.items
              .map((item) => `<li>${renderInlineMarkdown(item)}</li>`)
              .join("")}
          </ul>
        </section>
      `,
    )
    .join("");

  const homeContent = `
    <header class="home-header">
      <div class="home-intro">
        <h1>${escapeHtml(siteContent.home.title)}</h1>
        <p>${renderInlineMarkdown(siteContent.home.introduction)}</p>
      </div>
      <img
        class="profile-image"
        src="${escapeHtml(safeHref(siteContent.home.profileImage))}"
        alt="${escapeHtml(siteContent.home.profileImageAlt)}"
      />
    </header>
    ${homeSections}
  `;

  const secondaryContent = `
    <section class="secondary-page" aria-labelledby="page-title">
      <h1 id="page-title">${escapeHtml(currentPage.label)}</h1>
      <p>${renderInlineMarkdown(siteContent.pageMessages[currentPage.id])}</p>
    </section>
  `;

  const footerLinks = siteContent.footerLinks
    .map(
      (link) =>
        `<a class="simple-link" href="${escapeHtml(safeHref(link.href))}">${escapeHtml(link.label)}</a>`,
    )
    .join("");

  return `
    <main class="site-shell">
      <nav aria-label="Primary navigation">
        <ul>${navigation}</ul>
      </nav>

      ${currentPage.id === "home" ? homeContent : secondaryContent}

      <footer>${footerLinks}</footer>
    </main>
  `;
}
