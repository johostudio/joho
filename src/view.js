import { escapeHtml, renderInlineMarkdown, safeHref } from "./content.js";

export function renderNavigation(siteContent, currentPageId) {
  return `
    <nav aria-label="Primary navigation">
      <ul>
        ${siteContent.navigation
          .map(
            (page) => `
        <li>
          <a
            class="simple-link"
            href="${escapeHtml(safeHref(page.path))}"
            ${page.id === currentPageId ? 'aria-current="page"' : ""}
          >${escapeHtml(page.label)}</a>
        </li>
      `,
          )
          .join("")}
      </ul>
    </nav>
  `;
}

export function renderFooter(siteContent) {
  const footerLinks = siteContent.footerLinks
    .map(
      (link) =>
        `<a class="simple-link" href="${escapeHtml(safeHref(link.href))}">${escapeHtml(link.label)}</a>`,
    )
    .join("");

  return `<footer>${footerLinks}</footer>`;
}

export function renderPortfolio(siteContent, currentPage) {
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
      <figure class="profile-figure" tabindex="0">
        <img
          class="profile-image"
          src="${escapeHtml(safeHref(siteContent.home.profileImage))}"
          alt="${escapeHtml(siteContent.home.profileImageAlt)}"
        />
        <figcaption>${renderInlineMarkdown(siteContent.home.profileImageCaption)}</figcaption>
      </figure>
    </header>
    ${homeSections}
  `;

  const secondaryContent = `
    <section class="secondary-page" aria-labelledby="page-title">
      <h1 id="page-title">${escapeHtml(currentPage.label)}</h1>
      <p>${renderInlineMarkdown(siteContent.pageMessages[currentPage.id])}</p>
    </section>
  `;

  return `
    <main class="site-shell">
      ${renderNavigation(siteContent, currentPage.id)}

      ${currentPage.id === "home" ? homeContent : secondaryContent}

      ${renderFooter(siteContent)}
    </main>
  `;
}
