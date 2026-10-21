import { renderInlineMarkdown } from "./content.js";

export function mountProfileGallery(images = []) {
  const gallery = document.querySelector("[data-profile-gallery]");
  if (!gallery || images.length < 2) return;

  const button = gallery.querySelector(".profile-photo-button");
  const image = gallery.querySelector("[data-profile-image]");
  const caption = gallery.querySelector("[data-profile-caption]");
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  let currentIndex = 0;

  const preloadNext = () => {
    const next = images[(currentIndex + 1) % images.length];
    const preload = new Image();
    preload.src = next.src;
  };

  const showImage = (index, { reveal = true } = {}) => {
    const next = images[index];
    currentIndex = index;
    image.src = next.src;
    image.alt = next.alt;
    image.style.objectPosition = next.position;
    image.style.setProperty("--profile-scale", String(next.scale));
    caption.innerHTML = renderInlineMarkdown(next.caption);
    button.setAttribute(
      "aria-label",
      `Show next photo. Current photo: ${next.alt}`,
    );
    if (reveal) {
      gallery.dataset.captionVisible = "true";
    }
    preloadNext();
  };

  button.addEventListener("click", () => {
    if (gallery.dataset.switching === "true") return;
    const nextIndex = (currentIndex + 1) % images.length;

    if (reducedMotion) {
      showImage(nextIndex);
      return;
    }

    gallery.dataset.switching = "true";
    window.setTimeout(() => {
      showImage(nextIndex);
      delete gallery.dataset.switching;
    }, 110);
  });

  showImage(0, { reveal: false });
}
