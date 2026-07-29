/**
 * Lumina Music Engine
 * Connects to the local yt-dlp backend for REAL full-length YouTube audio streaming.
 * Every track plays its EXACT original audio - no mismatches, no 30-second limits.
 */

const configuredBackendUrl = globalThis.LUMINA_CONFIG?.backendUrl
  || globalThis.METROLIST_CONFIG?.backendUrl
  || import.meta.env.VITE_BACKEND_URL
  || 'http://127.0.0.1:5174';
const BACKEND_URL = configuredBackendUrl.replace(/\/$/, '');

export async function getEngineHealth() {
  const response = await fetch(`${BACKEND_URL}/api/health`, {
    signal: AbortSignal.timeout(3000)
  });
  if (!response.ok) {
    throw new Error(`Audio engine returned ${response.status}`);
  }
  return response.json();
}

export async function searchLiveMusic(query = 'spice and wolf ost', limit = 12) {
  try {
    const url = `${BACKEND_URL}/api/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Backend search failed');
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return {
        tracks: data,
        source: 'YouTube',
        degraded: false,
        message: ''
      };
    }
    throw new Error('No results');
  } catch (err) {
    console.warn('Backend unavailable, falling back to iTunes metadata', err);
    // Fallback to iTunes for metadata only
    try {
      const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=${limit}`;
      const itunesRes = await fetch(itunesUrl);
      if (!itunesRes.ok) throw new Error('iTunes error');
      const itunesData = await itunesRes.json();
      const tracks = (itunesData.results || []).map((item) => ({
          id: `itunes-${item.trackId}`,
          title: item.trackName,
          artist: item.artistName,
          album: item.collectionName || 'Single',
          duration: Math.floor(item.trackTimeMillis / 1000),
          cover: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : '',
          streamUrl: item.previewUrl,
          genre: item.primaryGenreName || 'Music',
          releaseDate: item.releaseDate ? item.releaseDate.split('T')[0] : '',
          isPreview: true
        }));
      return {
        tracks,
        source: 'iTunes previews',
        degraded: true,
        message: 'The local audio engine is unavailable, so preview tracks are shown.'
      };
    } catch (fallbackError) {
      return {
        tracks: [],
        source: 'Unavailable',
        degraded: true,
        message: fallbackError.message || 'Music search is currently unavailable.'
      };
    }
  }
}

export const MUSIC_GENRES = [
  { id: 'anime-ost', name: 'Anime & Japanese OST', query: 'spice and wolf ost' },
  { id: 'top-hits', name: 'Global Top Hits', query: 'top hits 2026 music' },
  { id: 'chill-lofi', name: 'Chill & Lofi', query: 'lofi chill study beats' },
  { id: 'pop-hits', name: 'Pop & Chart Toppers', query: 'pop hits 2026 music' },
  { id: 'rock-classics', name: 'Rock & Alternative', query: 'rock classics music' },
  { id: 'hiphop-rb', name: 'Hip-Hop & R&B', query: 'hip hop hits 2026 music' },
  { id: 'electronic-edm', name: 'EDM & Electronic', query: 'electronic dance music' },
];
