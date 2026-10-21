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
      <button class="mini-player-skip" type="button" data-player-action="previous" aria-label="Previous album">
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

      <button class="mini-player-skip" type="button" data-player-action="next" aria-label="Next album">
        ${icons.next}
      </button>

      <a
        class="mini-player-caption"
        data-player-caption
        href="${escapeHtml(firstTrack.url)}"
        target="_blank"
        rel="noreferrer"
      >now playing: <span data-player-caption-title>${escapeHtml(firstTrack.title)}</span></a>
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

async function getSpotifyMetadata(track) {
  const response = await fetch(
    `${SPOTIFY_OEMBED}?url=${encodeURIComponent(track.url)}`,
  );
  if (!response.ok) throw new Error("Spotify metadata unavailable");
  const data = await response.json();
  return {
    artwork: data.thumbnail_url || "",
    title: data.title || track.title,
  };
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

export function mountMusicPlayer(config, { onTrackChange } = {}) {
  const player = document.querySelector(".mini-player");
  if (!player || !config?.enabled || !config.tracks?.length) return null;

  const embed = player.querySelector("[data-spotify-controller]");
  const record = player.querySelector(".mini-player-record");
  const artwork = player.querySelector(".mini-player-record-art");
  const playIcon = player.querySelector("[data-player-icon]");
  const caption = player.querySelector("[data-player-caption]");
  const captionTitle = player.querySelector("[data-player-caption-title]");
  const status = player.querySelector("[data-player-status]");
  let controller = null;
  let currentIndex = 0;
  let currentTitle = config.tracks[0].title;
  let isPaused = true;
  let hasInteracted = false;
  let metadataRequest = 0;

  const updateControlLabels = () => {
    const track = config.tracks[currentIndex];
    const action = isPaused ? "Play" : "Pause";
    status.textContent = `${currentTitle} by ${track.artist}`;
    record.setAttribute(
      "aria-label",
      `${action} ${currentTitle} by ${track.artist}`,
    );
    record.title = `${action} ${currentTitle} — ${track.artist}`;
  };

  const updateMetadata = async (track) => {
    const request = ++metadataRequest;

    try {
      const metadata = await getSpotifyMetadata(track);
      if (request !== metadataRequest) return;
      if (metadata.artwork) {
        artwork.style.backgroundImage = `url("${metadata.artwork.replaceAll('"', "%22")}")`;
      }
      currentTitle = metadata.title;
      captionTitle.textContent = currentTitle;
      updateControlLabels();
    } catch {
      player.dataset.artwork = "unavailable";
    }
  };

  const showTrack = (index, { play = false, notify = false } = {}) => {
    currentIndex = (index + config.tracks.length) % config.tracks.length;
    const track = config.tracks[currentIndex];
    currentTitle = track.title;
    caption.href = track.url;
    captionTitle.textContent = currentTitle;
    updateControlLabels();
    updateMetadata(track);

    if (controller) {
      controller.loadEntity(track.url);
      if (play) window.setTimeout(() => controller.play(), 120);
    }

    if (notify && typeof onTrackChange === "function") {
      onTrackChange(track.profileIndex ?? currentIndex, track, currentIndex);
    }
  };

  const setPaused = (paused) => {
    isPaused = paused;
    player.dataset.playerState = paused ? "paused" : "playing";
    updateControlLabels();
    playIcon.innerHTML = paused ? icons.play : icons.pause;
  };

  const selectProfile = (profileIndex) => {
    const trackIndex = config.tracks.findIndex(
      (track) => track.profileIndex === profileIndex,
    );
    if (trackIndex < 0 || trackIndex === currentIndex) return;
    showTrack(trackIndex, { play: !isPaused });
  };

  player.querySelectorAll("[data-player-action]").forEach((button) => {
    button.addEventListener("click", () => {
      hasInteracted = true;
      const action = button.dataset.playerAction;

      if (action === "play" && controller) {
        controller.togglePlay();
      } else if (action === "previous") {
        showTrack(currentIndex - 1, { play: !isPaused, notify: true });
      } else if (action === "next") {
        showTrack(currentIndex + 1, { play: !isPaused, notify: true });
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
          showTrack(matchIndex, { notify: true });
        }
      } catch {
        // The manually editable Spotify queue remains available if Last.fm is offline.
      }
    };

    syncLastFm();
    window.setInterval(syncLastFm, 30_000);
  }

  return {
    selectProfile,
    selectTrack(index) {
      if (index === currentIndex) return;
      showTrack(index, { play: !isPaused, notify: true });
    },
  };
}
