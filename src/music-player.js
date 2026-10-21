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

function trackMatches(track, title, artist) {
  const expectedTitle = normalize(track.title);
  const expectedArtist = normalize(track.artist.split(",")[0]);
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
  const firstTrack = config.tracks[0];

  return `
    <div class="mini-player" aria-label="Mini music player" data-player-state="loading">
      <button class="mini-player-skip" type="button" data-player-action="previous" aria-label="Previous track">
        ${icons.previous}
      </button>

      <button
        class="mini-player-record"
        type="button"
        data-player-action="play"
        aria-label="Play ${escapeHtml(firstTrack.title)} by ${escapeHtml(firstTrack.artist)}"
        title="Play ${escapeHtml(firstTrack.title)} — ${escapeHtml(firstTrack.artist)}"
        disabled
      >
        <span class="mini-player-record-art" aria-hidden="true"></span>
        <span class="mini-player-record-center" data-player-icon>${icons.play}</span>
      </button>

      <button class="mini-player-skip" type="button" data-player-action="next" aria-label="Next track">
        ${icons.next}
      </button>

      <span class="mini-player-status" data-player-status aria-live="polite">
        ${escapeHtml(firstTrack.title)} by ${escapeHtml(firstTrack.artist)}
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

async function getSpotifyArtwork(track) {
  const response = await fetch(
    `${SPOTIFY_OEMBED}?url=${encodeURIComponent(track.url)}`,
  );
  if (!response.ok) throw new Error("Spotify artwork unavailable");
  const data = await response.json();
  return data.thumbnail_url || "";
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
  if (!player || !config?.enabled || !config.tracks?.length) return;

  const embed = player.querySelector("[data-spotify-controller]");
  const record = player.querySelector(".mini-player-record");
  const artwork = player.querySelector(".mini-player-record-art");
  const playIcon = player.querySelector("[data-player-icon]");
  const status = player.querySelector("[data-player-status]");
  let controller = null;
  let currentIndex = 0;
  let isPaused = true;
  let hasInteracted = false;

  const updateArtwork = async (track) => {
    try {
      const imageUrl = await getSpotifyArtwork(track);
      if (!imageUrl) return;
      artwork.style.backgroundImage = `url("${imageUrl.replaceAll('"', "%22")}")`;
    } catch {
      player.dataset.artwork = "unavailable";
    }
  };

  const showTrack = (index, { play = false } = {}) => {
    currentIndex = (index + config.tracks.length) % config.tracks.length;
    const track = config.tracks[currentIndex];
    const action = isPaused ? "Play" : "Pause";
    status.textContent = `${track.title} by ${track.artist}`;
    record.setAttribute(
      "aria-label",
      `${action} ${track.title} by ${track.artist}`,
    );
    record.title = `${action} ${track.title} — ${track.artist}`;
    updateArtwork(track);

    if (controller) {
      controller.loadEntity(track.url);
      if (play) window.setTimeout(() => controller.play(), 120);
    }
  };

  const setPaused = (paused) => {
    isPaused = paused;
    const track = config.tracks[currentIndex];
    const action = paused ? "Play" : "Pause";
    player.dataset.playerState = paused ? "paused" : "playing";
    record.setAttribute(
      "aria-label",
      `${action} ${track.title} by ${track.artist}`,
    );
    record.title = `${action} ${track.title} — ${track.artist}`;
    playIcon.innerHTML = paused ? icons.play : icons.pause;
  };

  player.querySelectorAll("[data-player-action]").forEach((button) => {
    button.addEventListener("click", () => {
      hasInteracted = true;
      const action = button.dataset.playerAction;

      if (action === "play" && controller) {
        controller.togglePlay();
      } else if (action === "previous") {
        showTrack(currentIndex - 1, { play: !isPaused });
      } else if (action === "next") {
        showTrack(currentIndex + 1, { play: !isPaused });
      }
    });
  });

  showTrack(0);
  loadSpotifyApi((api) => {
    api.createController(
      embed,
      { width: "100%", height: 152, url: config.tracks[0].url },
      (spotifyController) => {
        controller = spotifyController;
        if (currentIndex !== 0) {
          controller.loadEntity(config.tracks[currentIndex].url);
        }
        controller.addListener("ready", () => {
          const iframe = player.querySelector(".mini-player-embed iframe");
          iframe?.setAttribute("tabindex", "-1");
          iframe?.setAttribute("aria-hidden", "true");
          player.dataset.playerState = "paused";
          record.disabled = false;
        });
        controller.addListener("playback_update", (event) => {
          setPaused(Boolean(event.data?.isPaused));
        });
      },
    );
  });

  if (config.lastFmUser && config.lastFmApiKey) {
    const syncLastFm = async () => {
      try {
        const recent = await getLastFmTrack(config);
        if (!recent) return;
        const matchIndex = config.tracks.findIndex((track) =>
          trackMatches(track, recent.title, recent.artist),
        );
        if (!hasInteracted && matchIndex >= 0 && matchIndex !== currentIndex) {
          showTrack(matchIndex);
        }
      } catch {
        // The manually editable Spotify queue remains available if Last.fm is offline.
      }
    };

    syncLastFm();
    window.setInterval(syncLastFm, 30_000);
  }
}
