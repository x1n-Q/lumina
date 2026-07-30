/**
 * Lumina Music Engine
 * Connects to the local yt-dlp backend for REAL full-length YouTube audio streaming.
 * Every track plays its EXACT original audio - no mismatches, no 30-second limits.
 */

const desktopBackendPort = new URLSearchParams(globalThis.location?.search || '')
  .get('backendPort');
const explicitBackendUrl = (desktopBackendPort && `http://127.0.0.1:${desktopBackendPort}`)
  || globalThis.LUMINA_CONFIG?.backendUrl
  || globalThis.METROLIST_CONFIG?.backendUrl
  || import.meta.env.VITE_BACKEND_URL;
export const IS_WEB_PREVIEW_MODE = !globalThis.luminaDesktop && !explicitBackendUrl;
const BACKEND_URL = (explicitBackendUrl || 'http://127.0.0.1:5174').replace(/\/$/, '');
const MAX_TRACK_DURATION_SECONDS = 20 * 60;
const COMPILATION_TITLE_PATTERN = /\b(full album|complete album|greatest hits|best songs|all songs|non[- ]?stop|playlist|music compilation|hours? of|hour mix)\b/i;

function isPlayableSong(track) {
  const duration = Number(track?.duration);
  const title = String(track?.title || '');
  return Number.isFinite(duration)
    && duration > 0
    && duration <= MAX_TRACK_DURATION_SECONDS
    && !COMPILATION_TITLE_PATTERN.test(title);
}

export async function getEngineHealth() {
  if (IS_WEB_PREVIEW_MODE) {
    return {
      ok: true,
      status: 'preview',
      mode: 'web-preview',
      uptimeSeconds: 0,
      ytDlpVersion: null,
      cacheEntries: 0,
      savedTracks: 0,
      savedBytes: 0,
      searches: 0,
      streamRequests: 0,
      activeStreams: 0
    };
  }

  const response = await fetch(`${BACKEND_URL}/api/health`, {
    signal: AbortSignal.timeout(3000)
  });
  if (!response.ok) {
    throw new Error(`Audio engine returned ${response.status}`);
  }
  return response.json();
}

export async function getDownloadedTracks() {
  if (IS_WEB_PREVIEW_MODE) return [];
  const response = await fetch(`${BACKEND_URL}/api/downloads`);
  if (!response.ok) {
    throw new Error(`Could not load downloads (${response.status})`);
  }
  const tracks = await response.json();
  return Array.isArray(tracks) ? tracks : [];
}

function getTrackVideoId(track) {
  if (track?.videoId) return track.videoId;
  if (typeof track?.id === 'string' && track.id.startsWith('yt-')) {
    return track.id.slice(3);
  }
  return '';
}

export async function downloadTrack(track) {
  if (IS_WEB_PREVIEW_MODE) {
    throw new Error('Offline downloads are available in the Lumina desktop app.');
  }
  const videoId = getTrackVideoId(track);
  if (!videoId) {
    throw new Error('Only full YouTube tracks can be downloaded');
  }

  const response = await fetch(`${BACKEND_URL}/api/downloads/${encodeURIComponent(videoId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: track.title,
      artist: track.artist,
      album: track.album,
      duration: track.duration,
      cover: track.cover,
      genre: track.genre
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || `Download failed (${response.status})`);
  }
  return result;
}

export async function removeDownloadedTrack(track) {
  if (IS_WEB_PREVIEW_MODE) {
    throw new Error('Offline downloads are available in the Lumina desktop app.');
  }
  const videoId = getTrackVideoId(track);
  if (!videoId) throw new Error('Downloaded track ID is missing');

  const response = await fetch(`${BACKEND_URL}/api/downloads/${encodeURIComponent(videoId)}`, {
    method: 'DELETE'
  });
  if (!response.ok && response.status !== 404) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || `Could not remove download (${response.status})`);
  }
}

async function searchPreviewMusic(query, limit, message) {
  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=${limit}`;
    const itunesRes = await fetch(itunesUrl);
    if (!itunesRes.ok) throw new Error('Preview catalog unavailable');
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
    })).filter(isPlayableSong);
    return {
      tracks,
      source: 'iTunes previews',
      degraded: true,
      message
    };
  } catch (error) {
    return {
      tracks: [],
      source: 'Unavailable',
      degraded: true,
      message: error.message || 'Music search is currently unavailable.'
    };
  }
}

export async function searchLiveMusic(query = 'spice and wolf ost', limit = 12) {
  if (IS_WEB_PREVIEW_MODE) {
    return searchPreviewMusic(
      query,
      limit,
      'Mobile web mode plays song previews. Install Lumina desktop for full audio and downloads.'
    );
  }

  try {
    const url = `${BACKEND_URL}/api/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Audio engine search returned ${res.status}`);
    const data = await res.json();
    const playableTracks = Array.isArray(data) ? data.filter(isPlayableSong) : [];
    return {
      tracks: playableTracks,
      source: 'YouTube',
      degraded: false,
      message: playableTracks.length === 0
        ? 'No playable songs matched that search. Check the spelling or try fewer words.'
        : ''
    };
  } catch (error) {
    console.warn('Backend unavailable, falling back to playable previews', error);
    return searchPreviewMusic(
      query,
      limit,
      'The desktop audio engine could not complete this search, so playable previews are shown.'
    );
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
