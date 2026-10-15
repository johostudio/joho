import "@fontsource-variable/caveat";
import "@fontsource-variable/nunito-sans";
import { siteContent } from "./content.js";
import "./styles.css";

const app = document.querySelector("#app");
const metaDescription = document.querySelector('meta[name="description"]');
const themeColor = document.querySelector('meta[name="theme-color"]');

document.title = siteContent.meta.title;
metaDescription?.setAttribute("content", siteContent.meta.description);

const escapeAttribute = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const featuredMedia = siteContent.featured.image
  ? `<img
      class="feature__image"
      src="${escapeAttribute(siteContent.featured.image)}"
      alt="${escapeAttribute(siteContent.featured.imageAlt)}"
    />`
  : `<div class="feature__placeholder" aria-label="Featured work placeholder">
      <p class="feature__eyebrow">${siteContent.featured.eyebrow}</p>
      <p class="feature__title">${siteContent.featured.title}</p>
      <p class="feature__note">${siteContent.featured.note}</p>
    </div>`;

app.innerHTML = `
  <div class="page">
    <header class="site-header">
      <h1 class="masthead">
        ${siteContent.masthead.name}
        <span class="masthead__sticker">${siteContent.masthead.sticker}</span>
      </h1>

      <div class="site-tools">
        <time class="clock" aria-label="Current local time"></time>
        <button class="theme-toggle" type="button" aria-label="Use light theme">
          <span aria-hidden="true">☾</span>
        </button>
      </div>
    </header>

    <main>
      <section class="intro" aria-label="Introduction">
        ${siteContent.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("")}
      </section>

      <figure class="feature">
        <div class="feature__media">${featuredMedia}</div>
        <figcaption>${siteContent.featured.caption}</figcaption>
      </figure>
    </main>

    <footer>${siteContent.footer}</footer>
  </div>
`;

const clock = document.querySelector(".clock");
const clockFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: siteContent.clock.timeZone,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const updateClock = () => {
  clock.textContent = `${clockFormatter.format(new Date())} ${siteContent.clock.label}`;
};

updateClock();
window.setInterval(updateClock, 1000);

const root = document.documentElement;
const themeToggle = document.querySelector(".theme-toggle");
const themeIcon = themeToggle.querySelector("span");
const storedTheme = window.localStorage.getItem("joho-theme");

const setTheme = (theme) => {
  const isLight = theme === "light";
  root.dataset.theme = theme;
  themeIcon.textContent = isLight ? "☀" : "☾";
  themeToggle.setAttribute(
    "aria-label",
    isLight ? "Use dark theme" : "Use light theme",
  );
  themeColor?.setAttribute("content", isLight ? "#f4f0e7" : "#120d1f");
};

setTheme(storedTheme ?? "dark");

themeToggle.addEventListener("click", () => {
  const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
  setTheme(nextTheme);
  window.localStorage.setItem("joho-theme", nextTheme);
});

requestAnimationFrame(() => root.classList.add("is-ready"));
