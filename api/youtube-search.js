import {
  getAuthConfig,
  readCookie,
  setPrivateResponseHeaders,
  verifySession
} from '../vercel/auth.js';

const MAX_TRACK_DURATION_SECONDS = 20 * 60;

function parseIsoDuration(value) {
  const match = String(value || '').match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/
  );
  if (!match) return 0;
  return (
    (Number(match[1]) || 0) * 86400
    + (Number(match[2]) || 0) * 3600
    + (Number(match[3]) || 0) * 60
    + (Number(match[4]) || 0)
  );
}

function decodeText(value) {
  const entities = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    quot: '"'
  };
  return String(value || '').replace(
    /&(#x[\da-f]+|#\d+|amp|apos|gt|lt|quot);/gi,
    (_match, entity) => {
      if (entity.startsWith('#x')) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
      if (entity.startsWith('#')) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
      return entities[entity.toLowerCase()] || _match;
    }
  );
}

function requireAuthenticatedRequest(request) {
  const config = getAuthConfig();
  if (!verifySession(readCookie(request), config)) {
    const error = new Error('Sign in before searching for full tracks.');
    error.statusCode = 401;
    throw error;
  }
}

export default async function handler(request, response) {
  setPrivateResponseHeaders(response);
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    requireAuthenticatedRequest(request);
    const apiKey = String(process.env.YOUTUBE_API_KEY || '').trim();
    if (!apiKey) {
      return response.status(503).json({
        configured: false,
        error: 'Add YOUTUBE_API_KEY in Vercel to enable complete songs.'
      });
    }

    if (request.query?.health === '1') {
      return response.status(200).json({ configured: true, mode: 'web-youtube' });
    }

    const query = String(request.query?.q || '').trim().slice(0, 160);
    const limit = Math.min(20, Math.max(1, Number.parseInt(request.query?.limit, 10) || 12));
    if (!query) return response.status(400).json({ error: 'Search query is required.' });

    const searchParams = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      videoCategoryId: '10',
      videoEmbeddable: 'true',
      videoSyndicated: 'true',
      safeSearch: 'moderate',
      maxResults: String(limit),
      key: apiKey
    });
    const searchResult = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${searchParams}`,
      { signal: AbortSignal.timeout(9000) }
    );
    const searchData = await searchResult.json().catch(() => ({}));
    if (!searchResult.ok) {
      throw new Error(searchData?.error?.message || 'YouTube search is unavailable.');
    }

    const videoIds = (searchData.items || [])
      .map((item) => item?.id?.videoId)
      .filter((id) => /^[A-Za-z0-9_-]{11}$/.test(String(id)));
    if (videoIds.length === 0) return response.status(200).json([]);

    const detailsParams = new URLSearchParams({
      part: 'contentDetails,status',
      id: videoIds.join(','),
      key: apiKey
    });
    const detailsResult = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${detailsParams}`,
      { signal: AbortSignal.timeout(9000) }
    );
    const detailsData = await detailsResult.json().catch(() => ({}));
    if (!detailsResult.ok) {
      throw new Error(detailsData?.error?.message || 'YouTube video details are unavailable.');
    }
    const detailsById = new Map(
      (detailsData.items || []).map((item) => [item.id, item])
    );

    const tracks = (searchData.items || []).flatMap((item) => {
      const videoId = item?.id?.videoId;
      const details = detailsById.get(videoId);
      const duration = parseIsoDuration(details?.contentDetails?.duration);
      if (!details?.status?.embeddable || duration <= 30 || duration > MAX_TRACK_DURATION_SECONDS) {
        return [];
      }
      const snippet = item.snippet || {};
      const thumbnail = snippet.thumbnails?.maxres
        || snippet.thumbnails?.high
        || snippet.thumbnails?.medium
        || snippet.thumbnails?.default;
      return [{
        id: `yt-${videoId}`,
        videoId,
        title: decodeText(snippet.title),
        artist: decodeText(snippet.channelTitle),
        album: 'YouTube',
        duration,
        cover: thumbnail?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        streamUrl: `youtube:${videoId}`,
        genre: 'Full song',
        playbackType: 'youtube',
        isPreview: false
      }];
    });

    return response.status(200).json(tracks);
  } catch (error) {
    return response.status(error.statusCode || 502).json({
      error: error.message || 'Full-track search failed.'
    });
  }
}
