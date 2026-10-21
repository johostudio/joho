import { renderInlineMarkdown } from "./content.js";

export function mountProfileGallery(images = [], { onChange } = {}) {
  const gallery = document.querySelector("[data-profile-gallery]");
  if (!gallery || images.length < 2) return null;

  const button = gallery.querySelector(".profile-photo-button");
  const image = gallery.querySelector("[data-profile-image]");
  const caption = gallery.querySelector("[data-profile-caption]");
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const hasHover = window.matchMedia("(hover: hover)").matches;
  let currentIndex = 0;
  let switchTimer = null;

  const preloadNext = () => {
    const next = images[(currentIndex + 1) % images.length];
    const preload = new Image();
    preload.src = next.src;
  };

  const showImage = (index, { reveal = false, notify = false } = {}) => {
    currentIndex = (index + images.length) % images.length;
    const next = images[currentIndex];
    image.src = next.src;
    image.alt = next.alt;
    image.style.objectPosition = next.position;
    image.style.setProperty("--profile-scale", String(next.scale));
    caption.innerHTML = renderInlineMarkdown(next.caption);
    button.setAttribute(
      "aria-label",
      `Show next photo. Current photo: ${next.alt}`,
    );
    if (reveal && !hasHover) {
      gallery.dataset.captionVisible = "true";
    } else {
      delete gallery.dataset.captionVisible;
    }
    preloadNext();

    if (notify && typeof onChange === "function") {
      onChange(currentIndex, next);
    }
  };

  const selectImage = (index, { reveal = true, notify = false } = {}) => {
    const nextIndex = (index + images.length) % images.length;

    if (switchTimer !== null) {
      window.clearTimeout(switchTimer);
      switchTimer = null;
    }

    if (nextIndex === currentIndex) {
      delete gallery.dataset.switching;
      return;
    }

    if (reducedMotion) {
      showImage(nextIndex, { reveal, notify });
      return;
    }

    gallery.dataset.switching = "true";
    switchTimer = window.setTimeout(() => {
      showImage(nextIndex, { reveal, notify });
      delete gallery.dataset.switching;
      switchTimer = null;
    }, 110);
  };

  button.addEventListener("click", () => {
    selectImage(currentIndex + 1, { reveal: true, notify: true });
  });

  showImage(0, { reveal: false });

  return {
    selectImage,
  };
}
