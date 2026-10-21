const ALBUM_ID_PATTERN = /^[A-Za-z0-9]{22}$/;

function getAlbumId(value = "") {
  try {
    const url = new URL(String(value));
    if (url.protocol !== "https:" || url.hostname !== "open.spotify.com") {
      return "";
    }

    const match = url.pathname.match(/^\/album\/([A-Za-z0-9]{22})\/?$/);
    return match && ALBUM_ID_PATTERN.test(match[1]) ? match[1] : "";
  } catch {
    return "";
  }
}

function getArtwork(images = []) {
  return [...images]
    .sort((first, second) => (second.maxWidth || 0) - (first.maxWidth || 0))
    .find((image) => typeof image.url === "string")?.url;
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const albumId = getAlbumId(request.query?.url);
  if (!albumId) {
    return response.status(400).json({ error: "Valid Spotify album required" });
  }

  try {
    const spotifyResponse = await fetch(
      `https://open.spotify.com/embed/album/${albumId}`,
      { headers: { Accept: "text/html" } },
    );
    if (!spotifyResponse.ok) throw new Error("Spotify album unavailable");

    const html = await spotifyResponse.text();
    const payload = html.match(
      /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
    )?.[1];
    if (!payload) throw new Error("Spotify album data unavailable");

    const entity = JSON.parse(payload)?.props?.pageProps?.state?.data?.entity;
    if (entity?.type !== "album" || entity.id !== albumId) {
      throw new Error("Unexpected Spotify response");
    }

    const tracks = (entity.trackList || [])
      .filter(
        (track) =>
          track?.isPlayable !== false &&
          /^spotify:track:[A-Za-z0-9]{22}$/.test(track?.uri || ""),
      )
      .map((track) => ({
        title: track.title || "Spotify track",
        artist: track.subtitle || entity.subtitle || "Spotify",
        url: `https://open.spotify.com/track/${track.uri.split(":").at(-1)}`,
      }));

    response.setHeader(
      "Cache-Control",
      "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
    );
    return response.status(200).json({
      title: entity.title || entity.name || "Spotify album",
      artist: entity.subtitle || "Spotify",
      artwork: getArtwork(entity.visualIdentity?.image),
      tracks,
    });
  } catch {
    return response.status(502).json({ error: "Could not load Spotify album" });
  }
}
