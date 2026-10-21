import { escapeHtml, safeHref } from "./content.js";
import "./music-player.css";

const SPOTIFY_API_SRC = "https://open.spotify.com/embed/iframe-api/v1";
const SPOTIFY_OEMBED = "https://open.spotify.com/oembed";
const LASTFM_API = "https://ws.audioscrobbler.com/2.0/";

const icons = {
  previous:
    '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 4.5v11M15 5.2 7.4 10l7.6 4.8V5.2Z"/></svg>',
  play: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 4.8 8 5.2-8 5.2V4.8Z"/></svg>',
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

function renderPlayer(config) {
  const firstTrack = config.tracks[0];
  const spotifyUrl = escapeHtml(safeHref(firstTrack.url));

  return `
    <aside class="mini-player" aria-label="Mini music player" data-player-state="loading">
      <div class="mini-player-backdrop" aria-hidden="true"></div>
      <div class="mini-player-topline">
        <span class="mini-player-source" data-player-source>${escapeHtml(config.label)}</span>
        <button class="mini-player-collapse" type="button" aria-label="Minimize music player" aria-expanded="true">−</button>
      </div>

      <div class="mini-player-stage">
        <button class="mini-player-control" type="button" data-player-action="previous" aria-label="Previous track">
          ${icons.previous}
        </button>
        <a class="mini-player-cover-link" href="${spotifyUrl}" target="_blank" rel="noreferrer" aria-label="Open this track on Spotify">
          <span class="mini-player-cover" aria-hidden="true"></span>
        </a>
        <button class="mini-player-control" type="button" data-player-action="next" aria-label="Next track">
          ${icons.next}
        </button>
        <button class="mini-player-play" type="button" data-player-action="play" aria-label="Play on Spotify" disabled>
          <span data-player-icon>${icons.play}</span>
        </button>
      </div>

      <div class="mini-player-copy" aria-live="polite">
        <span class="mini-player-note" aria-hidden="true">♪</span>
        <span class="mini-player-track" data-player-title>${escapeHtml(firstTrack.title)}</span>
        <span class="mini-player-artist" data-player-artist>${escapeHtml(firstTrack.artist)}</span>
      </div>
      <div class="mini-player-progress" aria-hidden="true"><span data-player-progress></span></div>
      <div class="mini-player-embed" aria-hidden="true" inert>
        <div data-spotify-controller></div>
      </div>
    </aside>
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
    nowPlaying: track["@attr"]?.nowplaying === "true",
    url: track.url || `https://www.last.fm/user/${config.lastFmUser}`,
  };
}

export function mountMusicPlayer(config) {
  if (!config?.enabled || !config.tracks?.length) return;

  document.body.insertAdjacentHTML("beforeend", renderPlayer(config));
  const player = document.querySelector(".mini-player");
  player.style.setProperty("--player-accent", config.accent);
  const embed = player.querySelector("[data-spotify-controller]");
  const title = player.querySelector("[data-player-title]");
  const artist = player.querySelector("[data-player-artist]");
  const source = player.querySelector("[data-player-source]");
  const cover = player.querySelector(".mini-player-cover");
  const coverLink = player.querySelector(".mini-player-cover-link");
  const backdrop = player.querySelector(".mini-player-backdrop");
  const playButton = player.querySelector('[data-player-action="play"]');
  const playIcon = player.querySelector("[data-player-icon]");
  const progress = player.querySelector("[data-player-progress]");
  const collapse = player.querySelector(".mini-player-collapse");
  let controller = null;
  let currentIndex = 0;
  let isPaused = true;
  let hasInteracted = false;

  const updateArtwork = async (track) => {
    try {
      const artwork = await getSpotifyArtwork(track);
      if (!artwork) return;
      const image = `url("${artwork.replaceAll('"', "%22")}")`;
      cover.style.backgroundImage = image;
      backdrop.style.backgroundImage = image;
    } catch {
      player.dataset.artwork = "unavailable";
    }
  };

  const showTrack = (index, { play = false } = {}) => {
    currentIndex = (index + config.tracks.length) % config.tracks.length;
    const track = config.tracks[currentIndex];
    title.textContent = track.title;
    artist.textContent = track.artist;
    coverLink.href = track.url;
    coverLink.setAttribute(
      "aria-label",
      `Open ${track.title} by ${track.artist} on Spotify`,
    );
    progress.style.width = "0%";
    updateArtwork(track);

    if (controller) {
      controller.loadEntity(track.url);
      if (play) window.setTimeout(() => controller.play(), 120);
    }
  };

  const setPaused = (paused) => {
    isPaused = paused;
    player.dataset.playerState = paused ? "paused" : "playing";
    playButton.setAttribute("aria-label", paused ? "Play on Spotify" : "Pause");
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

  collapse.addEventListener("click", () => {
    const collapsed = player.toggleAttribute("data-collapsed");
    collapse.textContent = collapsed ? "+" : "−";
    collapse.setAttribute("aria-expanded", String(!collapsed));
    collapse.setAttribute(
      "aria-label",
      collapsed ? "Expand music player" : "Minimize music player",
    );
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
          playButton.disabled = false;
        });
        controller.addListener("playback_update", (event) => {
          const playback = event.data || {};
          setPaused(Boolean(playback.isPaused));
          const percentage = playback.duration
            ? Math.min(100, (playback.position / playback.duration) * 100)
            : 0;
          progress.style.width = `${percentage}%`;
        });
      },
    );
  });

  if (config.lastFmUser && config.lastFmApiKey) {
    const syncLastFm = async () => {
      try {
        const recent = await getLastFmTrack(config);
        if (!recent) return;
        source.textContent = recent.nowPlaying
          ? "last.fm · listening now"
          : "last.fm · last played";
        source.title = `${recent.title} — ${recent.artist}`;
        const matchIndex = config.tracks.findIndex((track) =>
          trackMatches(track, recent.title, recent.artist),
        );
        if (!hasInteracted && matchIndex >= 0 && matchIndex !== currentIndex) {
          showTrack(matchIndex);
        }
      } catch {
        source.textContent = config.label;
      }
    };

    syncLastFm();
    window.setInterval(syncLastFm, 30_000);
  }
}
