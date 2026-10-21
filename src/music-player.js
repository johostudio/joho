import { escapeHtml } from "./content.js";
import "./music-player.css";

const SPOTIFY_API_SRC = "https://open.spotify.com/embed/iframe-api/v1";
const SPOTIFY_OEMBED = "https://open.spotify.com/oembed";
const LASTFM_API = "https://ws.audioscrobbler.com/2.0/";

const icons = {
  previous:
    '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 4.5v11M15 5.2 7.4 10l7.6 4.8V5.2Z"/></svg>',
  play: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7.2 5 7.4 5-7.4 5V5Z"/></svg>',
  pause:
    '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6.5 5h2.4v10H6.5zm4.6 0h2.4v10h-2.4z"/></svg>',
  next: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M15 4.5v11M5 5.2l7.6 4.8L5 14.8V5.2Z"/></svg>',
};

function normalize(value = "") {
  return String(value)
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/gi, "")
    .toLowerCase();
}

function itemMatches(item, title, artist) {
  const expectedTitle = normalize(item.title);
  const expectedArtist = normalize(item.artist.split(",")[0]);
  const receivedTitle = normalize(title);
  const receivedArtist = normalize(artist);

  return (
    expectedTitle === receivedTitle &&
    (receivedArtist.includes(expectedArtist) ||
      expectedArtist.includes(receivedArtist))
  );
}

export function renderMusicPlayer(config) {
  if (!config?.enabled || !config.tracks?.length) return "";
  const firstAlbum = config.tracks[0];

  return `
    <div class="mini-player" aria-label="Mini music player" data-player-state="loading">
      <button class="mini-player-skip" type="button" data-player-action="previous" aria-label="Previous song in ${escapeHtml(firstAlbum.title)}" disabled>
        ${icons.previous}
      </button>

      <button
        class="mini-player-record"
        type="button"
        data-player-action="play"
        aria-label="Play ${escapeHtml(firstAlbum.title)} by ${escapeHtml(firstAlbum.artist)}"
        title="Play ${escapeHtml(firstAlbum.title)} — ${escapeHtml(firstAlbum.artist)}"
        disabled
      >
        <span class="mini-player-record-art" aria-hidden="true"></span>
        <span class="mini-player-record-center" data-player-icon>${icons.play}</span>
      </button>

      <button class="mini-player-skip" type="button" data-player-action="next" aria-label="Next song in ${escapeHtml(firstAlbum.title)}" disabled>
        ${icons.next}
      </button>

      <a
        class="mini-player-caption"
        data-player-caption
        href="${escapeHtml(firstAlbum.url)}"
        target="_blank"
        rel="noreferrer"
      ><span data-player-caption-title>${escapeHtml(firstAlbum.title)}</span></a>
      <span class="mini-player-status" data-player-status aria-live="polite">
        ${escapeHtml(firstAlbum.title)} by ${escapeHtml(firstAlbum.artist)}
      </span>
      <div class="mini-player-embed" aria-hidden="true" inert>
        <div data-spotify-controller></div>
      </div>
    </div>
  `;
}

function loadSpotifyApi(onReady) {
  if (window.SpotifyIframeApi) {
    onReady(window.SpotifyIframeApi);
    return;
  }

  const previousReady = window.onSpotifyIframeApiReady;
  window.onSpotifyIframeApiReady = (api) => {
    window.SpotifyIframeApi = api;
    if (typeof previousReady === "function") previousReady(api);
    onReady(api);
  };

  if (document.querySelector(`script[src="${SPOTIFY_API_SRC}"]`)) return;
  const script = document.createElement("script");
  script.src = SPOTIFY_API_SRC;
  script.async = true;
  document.head.append(script);
}

function isSpotifyTrack(value = "") {
  return /^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]{22}$/i.test(value);
}

async function getSpotifyAlbum(album) {
  const response = await fetch(
    `/api/spotify-album?url=${encodeURIComponent(album.url)}`,
  );
  if (!response.ok) throw new Error("Spotify album unavailable");
  const data = await response.json();

  return {
    title: data.title || album.title,
    artist: data.artist || album.artist,
    artwork: data.artwork || "",
    tracks: Array.isArray(data.tracks)
      ? data.tracks.filter((track) => isSpotifyTrack(track.url))
      : [],
  };
}

async function getSpotifyFallback(album) {
  const response = await fetch(
    `${SPOTIFY_OEMBED}?url=${encodeURIComponent(album.url)}`,
  );
  if (!response.ok) throw new Error("Spotify metadata unavailable");
  const data = await response.json();

  return {
    title: data.title || album.title,
    artist: album.artist,
    artwork: data.thumbnail_url || "",
    tracks: isSpotifyTrack(album.url)
      ? [
          {
            title: data.title || album.title,
            artist: album.artist,
            url: album.url,
          },
        ]
      : [],
  };
}

async function getAlbumMetadata(album) {
  try {
    return await getSpotifyAlbum(album);
  } catch {
    return getSpotifyFallback(album);
  }
}

async function getLastFmTrack(config) {
  if (!config.lastFmUser || !config.lastFmApiKey) return null;

  const query = new URLSearchParams({
    method: "user.getrecenttracks",
    user: config.lastFmUser,
    api_key: config.lastFmApiKey,
    format: "json",
    limit: "1",
  });
  const response = await fetch(`${LASTFM_API}?${query}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Last.fm unavailable");
  const data = await response.json();
  const track = data.recenttracks?.track?.[0];
  if (!track) return null;

  return {
    title: track.name || "",
    artist: track.artist?.["#text"] || track.artist?.name || "",
  };
}

export function mountMusicPlayer(config) {
  const player = document.querySelector(".mini-player");
  if (!player || !config?.enabled || !config.tracks?.length) return null;

  const embed = player.querySelector("[data-spotify-controller]");
  const record = player.querySelector(".mini-player-record");
  const artwork = player.querySelector(".mini-player-record-art");
  const playIcon = player.querySelector("[data-player-icon]");
  const caption = player.querySelector("[data-player-caption]");
  const captionTitle = player.querySelector("[data-player-caption-title]");
  const status = player.querySelector("[data-player-status]");
  const previousButton = player.querySelector(
    '[data-player-action="previous"]',
  );
  const nextButton = player.querySelector('[data-player-action="next"]');
  const albumCache = new Map();
  let controller = null;
  let currentAlbumIndex = 0;
  let currentSongIndex = 0;
  let currentAlbum = {
    ...config.tracks[0],
    artwork: "",
    tracks: [],
  };
  let isPaused = true;
  let hasInteracted = false;
  let metadataRequest = 0;

  const hideProfileCaption = () => {
    const gallery = document.querySelector("[data-profile-gallery]");
    if (gallery) delete gallery.dataset.captionVisible;
  };

  player.addEventListener("pointerdown", hideProfileCaption);
  player.addEventListener("focusin", hideProfileCaption);

  const currentSong = () => currentAlbum.tracks[currentSongIndex] || null;

  const updateControlLabels = () => {
    const song = currentSong();
    const action = isPaused ? "Play" : "Pause";
    const playableTitle = song?.title || currentAlbum.title;
    const playableArtist = song?.artist || currentAlbum.artist;
    const canSkip = Boolean(controller && currentAlbum.tracks.length > 1);

    status.textContent = `${playableTitle} by ${playableArtist}`;
    record.setAttribute(
      "aria-label",
      `${action} ${playableTitle} from ${currentAlbum.title}`,
    );
    record.title = `${action} ${playableTitle} — ${playableArtist}`;
    previousButton.disabled = !canSkip;
    nextButton.disabled = !canSkip;
    previousButton.setAttribute(
      "aria-label",
      `Previous song in ${currentAlbum.title}`,
    );
    nextButton.setAttribute("aria-label", `Next song in ${currentAlbum.title}`);
  };

  const updateAlbumMetadata = async (album) => {
    const request = ++metadataRequest;
    if (!albumCache.has(album.url)) {
      albumCache.set(album.url, getAlbumMetadata(album));
    }

    try {
      const metadata = await albumCache.get(album.url);
      if (request !== metadataRequest) return;
      currentAlbum = { ...album, ...metadata };
      currentSongIndex = 0;
      captionTitle.textContent = currentAlbum.title;
      if (currentAlbum.artwork) {
        artwork.style.backgroundImage = `url("${currentAlbum.artwork.replaceAll('"', "%22")}")`;
      }
      updateControlLabels();
    } catch {
      player.dataset.artwork = "unavailable";
    }
  };

  const showAlbum = (index, { play = false } = {}) => {
    currentAlbumIndex = (index + config.tracks.length) % config.tracks.length;
    const album = config.tracks[currentAlbumIndex];
    currentAlbum = { ...album, artwork: "", tracks: [] };
    currentSongIndex = 0;
    caption.href = album.url;
    captionTitle.textContent = album.title;
    updateControlLabels();
    updateAlbumMetadata(album);

    if (controller) {
      controller.loadEntity(album.url);
      if (play) window.setTimeout(() => controller.play(), 120);
    }
  };

  const setPaused = (paused) => {
    isPaused = paused;
    player.dataset.playerState = paused ? "paused" : "playing";
    updateControlLabels();
    playIcon.innerHTML = paused ? icons.play : icons.pause;
  };

  const changeSong = (offset) => {
    if (!controller || currentAlbum.tracks.length < 2) return;
    const shouldResume = !isPaused;
    currentSongIndex =
      (currentSongIndex + offset + currentAlbum.tracks.length) %
      currentAlbum.tracks.length;
    controller.loadEntity(currentSong().url);
    updateControlLabels();
    if (shouldResume) window.setTimeout(() => controller.play(), 120);
  };

  const selectProfile = (profileIndex) => {
    const albumIndex = config.tracks.findIndex(
      (album) => album.profileIndex === profileIndex,
    );
    if (albumIndex < 0 || albumIndex === currentAlbumIndex) return;
    showAlbum(albumIndex, { play: !isPaused });
  };

  player.querySelectorAll("[data-player-action]").forEach((button) => {
    button.addEventListener("click", () => {
      hasInteracted = true;
      const action = button.dataset.playerAction;

      if (action === "play" && controller) {
        controller.togglePlay();
      } else if (action === "previous") {
        changeSong(-1);
      } else if (action === "next") {
        changeSong(1);
      }
    });
  });

  showAlbum(0);
  loadSpotifyApi((api) => {
    api.createController(
      embed,
      { width: "100%", height: 152, url: config.tracks[0].url },
      (spotifyController) => {
        controller = spotifyController;
        if (currentAlbumIndex !== 0) {
          controller.loadEntity(config.tracks[currentAlbumIndex].url);
        }
        controller.addListener("ready", () => {
          const iframe = player.querySelector(".mini-player-embed iframe");
          iframe?.setAttribute("tabindex", "-1");
          iframe?.setAttribute("aria-hidden", "true");
          record.disabled = false;
          setPaused(true);
        });
        controller.addListener("playback_started", (event) => {
          const songIndex = currentAlbum.tracks.findIndex((track) =>
            event.data?.playingURI?.endsWith(track.url.split("/").at(-1)),
          );
          if (songIndex >= 0) {
            currentSongIndex = songIndex;
            updateControlLabels();
          }
        });
        controller.addListener("playback_update", (event) => {
          setPaused(Boolean(event.data?.isPaused));
        });
      },
    );
  });

  const hasProfileAlbums = config.tracks.some((album) =>
    Number.isInteger(album.profileIndex),
  );
  if (!hasProfileAlbums && config.lastFmUser && config.lastFmApiKey) {
    const syncLastFm = async () => {
      try {
        const recent = await getLastFmTrack(config);
        if (!recent) return;
        const matchIndex = config.tracks.findIndex((item) =>
          itemMatches(item, recent.title, recent.artist),
        );
        if (
          !hasInteracted &&
          matchIndex >= 0 &&
          matchIndex !== currentAlbumIndex
        ) {
          showAlbum(matchIndex);
        }
      } catch {
        // The manually editable Spotify queue remains available if Last.fm is offline.
      }
    };

    syncLastFm();
    window.setInterval(syncLastFm, 30_000);
  }

  return { selectProfile };
}
