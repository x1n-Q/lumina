/**
 * Lumina LRCLIB integration service.
 */

export function parseLrc(lrcText) {
  if (!lrcText) return [];
  const lines = lrcText.split('\n');
  const result = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = parseInt(match[3].padEnd(3, '0'), 10);
      const timeInSeconds = minutes * 60 + seconds + milliseconds / 1000;
      const text = line.replace(timeRegex, '').trim();
      if (text) {
        result.push({ time: timeInSeconds, text });
      }
    }
  }
  return result.sort((a, b) => a.time - b.time);
}

export async function fetchLyricsFromLRCLIB(trackName, artistName) {
  try {
    const params = new URLSearchParams({
      track_name: trackName,
      artist_name: artistName,
    });
    const response = await fetch(`https://lrclib.net/api/get?${params.toString()}`);
    if (!response.ok) return null;
    const data = await response.json();
    return {
      synced: parseLrc(data.syncedLyrics),
      plain: data.plainLyrics || data.syncedLyrics,
      source: "LRCLIB API"
    };
  } catch (error) {
    console.warn("LRCLIB lookup offline or unavailable, falling back to local lyrics", error);
    return null;
  }
}
