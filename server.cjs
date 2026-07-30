const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');
const https = require('https');
const http = require('http');
const os = require('os');
const path = require('path');
const { pipeline } = require('stream/promises');

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 5174;
const MAX_YTDLP_OUTPUT = 20 * 1024 * 1024;
const MAX_TRACK_DURATION_SECONDS = 20 * 60;
const COMPILATION_TITLE_PATTERN = /\b(full album|complete album|greatest hits|best songs|all songs|non[- ]?stop|playlist|music compilation|hours? of|hour mix)\b/i;
const AUDIO_CACHE_TTL = 30 * 60 * 1000;
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const DOWNLOAD_INDEX_FILE = 'downloads.json';
const DEFAULT_DOWNLOAD_DIRECTORY = process.env.LUMINA_CACHE_DIR
  || path.join(os.homedir(), '.lumina', 'audio-cache');

const app = express();
app.use(cors());
app.use(express.json({ limit: '64kb' }));

const audioCache = new Map();
const downloadedTracks = new Map();
const downloadsInFlight = new Map();
let audioServer = null;
let publicBaseUrl = `http://${DEFAULT_HOST}:${DEFAULT_PORT}`;
let downloadDirectory = DEFAULT_DOWNLOAD_DIRECTORY;
let downloadIndexPath = path.join(downloadDirectory, DOWNLOAD_INDEX_FILE);
const engineMetrics = {
  startedAt: Date.now(),
  searches: 0,
  streamRequests: 0,
  activeStreams: 0,
  lastActivityAt: null,
  lastErrorAt: null,
  ytDlpVersion: null
};

function markEngineActivity() {
  engineMetrics.lastActivityAt = Date.now();
}

function markEngineError() {
  engineMetrics.lastErrorAt = Date.now();
}

function normalizeTrackText(value, fallback, maxLength = 300) {
  const text = String(value || '').trim();
  return (text || fallback).slice(0, maxLength);
}

function getDownloadedTrackPath(record) {
  return path.join(downloadDirectory, path.basename(record.fileName));
}

function toPublicDownloadedTrack(record) {
  return {
    id: `yt-${record.videoId}`,
    videoId: record.videoId,
    title: record.title,
    artist: record.artist,
    album: record.album,
    duration: record.duration,
    cover: record.cover,
    genre: record.genre,
    streamUrl: `${publicBaseUrl}/api/stream/${record.videoId}`,
    downloadedAt: record.downloadedAt,
    cachedBytes: record.cachedBytes,
    isDownloaded: true,
    isFull: true
  };
}

async function persistDownloadIndex() {
  await fs.promises.mkdir(downloadDirectory, { recursive: true });
  const records = [...downloadedTracks.values()];
  const temporaryPath = `${downloadIndexPath}.tmp`;
  await fs.promises.writeFile(temporaryPath, JSON.stringify(records, null, 2), 'utf8');
  await fs.promises.rename(temporaryPath, downloadIndexPath);
}

async function initializeDownloadCache(directory = DEFAULT_DOWNLOAD_DIRECTORY) {
  downloadDirectory = path.resolve(directory);
  downloadIndexPath = path.join(downloadDirectory, DOWNLOAD_INDEX_FILE);
  downloadedTracks.clear();
  await fs.promises.mkdir(downloadDirectory, { recursive: true });

  try {
    const rawIndex = await fs.promises.readFile(downloadIndexPath, 'utf8');
    const records = JSON.parse(rawIndex);
    if (!Array.isArray(records)) return;

    for (const record of records) {
      if (!record || !VIDEO_ID_PATTERN.test(record.videoId) || !record.fileName) continue;
      try {
        const stats = await fs.promises.stat(getDownloadedTrackPath(record));
        if (!stats.isFile()) continue;
        downloadedTracks.set(record.videoId, {
          ...record,
          cachedBytes: stats.size
        });
      } catch {
        // Ignore index entries whose audio file no longer exists.
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('Could not read the Lumina download index:', error.message);
    }
  }
}

function getAudioRequestHeaders(audio) {
  const headers = {
    ...audio.headers,
    'User-Agent': audio.headers['User-Agent']
      || audio.headers['user-agent']
      || 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
  };
  delete headers.Host;
  delete headers.host;
  return headers;
}

function downloadRemoteAudio(audio, targetPath, redirectsRemaining = 3) {
  return new Promise((resolve, reject) => {
    const protocol = audio.url.startsWith('https:') ? https : http;
    const request = protocol.get(audio.url, { headers: getAudioRequestHeaders(audio) }, (response) => {
      const location = response.headers.location;
      if (
        location
        && redirectsRemaining > 0
        && [301, 302, 303, 307, 308].includes(response.statusCode)
      ) {
        response.resume();
        const redirectedUrl = new URL(location, audio.url).toString();
        resolve(downloadRemoteAudio(
          { ...audio, url: redirectedUrl },
          targetPath,
          redirectsRemaining - 1
        ));
        return;
      }

      if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        reject(new Error(`Upstream media request returned ${response.statusCode || 'no status'}`));
        return;
      }

      const output = fs.createWriteStream(targetPath, { flags: 'wx' });
      pipeline(response, output)
        .then(() => resolve({
          contentType: response.headers['content-type'] || audio.contentType,
          contentLength: Number(response.headers['content-length']) || 0
        }))
        .catch(reject);
    });
    request.on('error', reject);
  });
}

function getAudioExtension(audio, contentType = '') {
  const sourceExtension = String(audio.extension || '').toLowerCase();
  if (/^[a-z0-9]{2,5}$/.test(sourceExtension)) return sourceExtension;
  if (contentType.includes('webm')) return 'webm';
  if (contentType.includes('ogg')) return 'ogg';
  if (contentType.includes('mpeg')) return 'mp3';
  return 'm4a';
}

async function createDownloadedTrack(videoId, metadata = {}) {
  const existing = downloadedTracks.get(videoId);
  if (existing) {
    try {
      await fs.promises.access(getDownloadedTrackPath(existing));
      return existing;
    } catch {
      downloadedTracks.delete(videoId);
    }
  }

  if (downloadsInFlight.has(videoId)) {
    return downloadsInFlight.get(videoId);
  }

  const downloadPromise = (async () => {
    await fs.promises.mkdir(downloadDirectory, { recursive: true });
    let audio = await resolveAudio(videoId);
    let extension = getAudioExtension(audio, audio.contentType);
    let fileName = `${videoId}.${extension}`;
    let finalPath = path.join(downloadDirectory, fileName);
    let temporaryPath = path.join(downloadDirectory, `${videoId}-${Date.now()}.part`);

    try {
      let downloadResult;
      try {
        downloadResult = await downloadRemoteAudio(audio, temporaryPath);
      } catch {
        await fs.promises.rm(temporaryPath, { force: true });
        audioCache.delete(videoId);
        audio = await resolveAudio(videoId, true);
        temporaryPath = path.join(downloadDirectory, `${videoId}-${Date.now()}.part`);
        downloadResult = await downloadRemoteAudio(audio, temporaryPath);
      }

      const nextExtension = getAudioExtension(audio, downloadResult.contentType);
      if (nextExtension !== extension) {
        extension = nextExtension;
        fileName = `${videoId}.${extension}`;
        finalPath = path.join(downloadDirectory, fileName);
      }

      await fs.promises.rename(temporaryPath, finalPath);
      const stats = await fs.promises.stat(finalPath);
      const record = {
        videoId,
        fileName,
        contentType: downloadResult.contentType || audio.contentType,
        title: normalizeTrackText(metadata.title, 'Downloaded track'),
        artist: normalizeTrackText(metadata.artist, 'YouTube Music'),
        album: normalizeTrackText(metadata.album, 'Lumina downloads'),
        duration: Math.max(0, Number(metadata.duration) || 0),
        cover: normalizeTrackText(
          metadata.cover,
          `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          2000
        ),
        genre: normalizeTrackText(metadata.genre, 'Downloaded'),
        downloadedAt: new Date().toISOString(),
        cachedBytes: stats.size
      };
      downloadedTracks.set(videoId, record);
      await persistDownloadIndex();
      return record;
    } catch (error) {
      await fs.promises.rm(temporaryPath, { force: true });
      throw error;
    }
  })();

  downloadsInFlight.set(videoId, downloadPromise);
  try {
    return await downloadPromise;
  } finally {
    downloadsInFlight.delete(videoId);
  }
}

function runYtDlp(args, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const executable = process.env.LUMINA_YTDLP_PATH || 'yt-dlp';
    const child = spawn(executable, args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const stdout = [];
    const stderr = [];
    let outputSize = 0;
    let settled = false;

    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(value);
    };

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(new Error(`yt-dlp timed out after ${timeout / 1000} seconds`));
    }, timeout);

    child.stdout.on('data', (chunk) => {
      outputSize += chunk.length;
      if (outputSize > MAX_YTDLP_OUTPUT) {
        child.kill('SIGKILL');
        finish(new Error('yt-dlp returned too much data'));
        return;
      }
      stdout.push(chunk);
    });

    child.stderr.on('data', (chunk) => stderr.push(chunk));
    child.on('error', (error) => {
      if (error.code === 'ENOENT') {
        finish(new Error(`yt-dlp is not available at ${executable}`));
      } else {
        finish(error);
      }
    });
    child.on('close', (code) => {
      if (code !== 0) {
        const message = Buffer.concat(stderr).toString().trim();
        finish(new Error(message || `yt-dlp exited with code ${code}`));
        return;
      }
      finish(null, Buffer.concat(stdout).toString());
    });
  });
}

function normalizeLimit(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 12;
  return Math.min(Math.max(parsed, 1), 25);
}

function isPlayableSongResult(video) {
  const duration = Number(video?.duration);
  const title = String(video?.title || '');
  return Number.isFinite(duration)
    && duration > 0
    && duration <= MAX_TRACK_DURATION_SECONDS
    && !COMPILATION_TITLE_PATTERN.test(title);
}

async function resolveAudio(videoId, forceRefresh = false) {
  const cached = audioCache.get(videoId);
  if (!forceRefresh && cached && cached.expires > Date.now()) {
    return cached;
  }

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const output = await runYtDlp([
    '--format', 'bestaudio[ext=m4a]/bestaudio',
    '--dump-single-json',
    '--no-playlist',
    '--no-warnings',
    watchUrl
  ]);
  const info = JSON.parse(output);

  if (!info.url) {
    throw new Error('yt-dlp did not return a playable audio URL');
  }

  const resolved = {
    url: info.url,
    headers: info.http_headers || {},
    contentType: info.mime_type || (info.ext === 'webm' ? 'audio/webm' : 'audio/mp4'),
    extension: info.ext || '',
    expires: Date.now() + AUDIO_CACHE_TTL
  };
  audioCache.set(videoId, resolved);
  return resolved;
}

function copyProxyHeaders(proxyRes, res, fallbackContentType) {
  const headers = [
    'accept-ranges',
    'cache-control',
    'content-length',
    'content-range',
    'etag',
    'last-modified'
  ];

  res.setHeader('Content-Type', proxyRes.headers['content-type'] || fallbackContentType);
  for (const header of headers) {
    if (proxyRes.headers[header]) {
      res.setHeader(header, proxyRes.headers[header]);
    }
  }
  if (!proxyRes.headers['accept-ranges']) {
    res.setHeader('Accept-Ranges', 'bytes');
  }
}

function proxyAudioRequest(audio, req, res, redirectsRemaining = 3) {
  return new Promise((resolve, reject) => {
    const protocol = audio.url.startsWith('https:') ? https : http;
    const headers = getAudioRequestHeaders(audio);
    if (req.headers.range) {
      headers.Range = req.headers.range;
    }

    const proxyReq = protocol.get(audio.url, { headers }, (proxyRes) => {
      const location = proxyRes.headers.location;
      if (
        location
        && redirectsRemaining > 0
        && [301, 302, 303, 307, 308].includes(proxyRes.statusCode)
      ) {
        proxyRes.resume();
        const redirectedUrl = new URL(location, audio.url).toString();
        resolve(proxyAudioRequest(
          { ...audio, url: redirectedUrl },
          req,
          res,
          redirectsRemaining - 1
        ));
        return;
      }

      if ([401, 403].includes(proxyRes.statusCode)) {
        proxyRes.resume();
        reject(new Error(`Upstream media URL returned ${proxyRes.statusCode}`));
        return;
      }

      copyProxyHeaders(proxyRes, res, audio.contentType);
      res.status(proxyRes.statusCode || 502);
      proxyRes.pipe(res);
      proxyRes.on('end', resolve);
      proxyRes.on('error', reject);
    });

    proxyReq.on('error', reject);
    res.once('close', () => {
      if (!res.writableEnded && !proxyReq.destroyed) proxyReq.destroy();
    });
  });
}

async function serveDownloadedAudio(record, req, res) {
  const filePath = getDownloadedTrackPath(record);
  const stats = await fs.promises.stat(filePath);
  const totalBytes = stats.size;
  const rangeHeader = req.headers.range;

  res.setHeader('Content-Type', record.contentType || 'audio/mp4');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');

  let start = 0;
  let end = totalBytes - 1;
  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
    if (!match) {
      res.status(416).setHeader('Content-Range', `bytes */${totalBytes}`);
      res.end();
      return;
    }

    if (match[1]) {
      start = Number(match[1]);
      end = match[2] ? Number(match[2]) : end;
    } else if (match[2]) {
      const suffixLength = Number(match[2]);
      start = Math.max(totalBytes - suffixLength, 0);
    }

    if (
      !Number.isFinite(start)
      || !Number.isFinite(end)
      || start < 0
      || end < start
      || start >= totalBytes
    ) {
      res.status(416).setHeader('Content-Range', `bytes */${totalBytes}`);
      res.end();
      return;
    }
    end = Math.min(end, totalBytes - 1);
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${totalBytes}`);
  } else {
    res.status(200);
  }

  res.setHeader('Content-Length', end - start + 1);
  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath, { start, end });
    stream.pipe(res);
    stream.on('end', resolve);
    stream.on('error', reject);
  });
}

app.get('/api/health', (_req, res) => {
  const ytDlpReady = Boolean(engineMetrics.ytDlpVersion);
  res.json({
    ok: ytDlpReady,
    status: ytDlpReady ? 'online' : 'starting',
    uptimeSeconds: Math.floor((Date.now() - engineMetrics.startedAt) / 1000),
    ytDlpVersion: engineMetrics.ytDlpVersion,
    cacheEntries: audioCache.size,
    savedTracks: downloadedTracks.size,
    savedBytes: [...downloadedTracks.values()]
      .reduce((total, track) => total + (Number(track.cachedBytes) || 0), 0),
    searches: engineMetrics.searches,
    streamRequests: engineMetrics.streamRequests,
    activeStreams: engineMetrics.activeStreams,
    lastActivityAt: engineMetrics.lastActivityAt,
    lastErrorAt: engineMetrics.lastErrorAt
  });
});

app.get('/api/downloads', (_req, res) => {
  const tracks = [...downloadedTracks.values()]
    .sort((first, second) => second.downloadedAt.localeCompare(first.downloadedAt))
    .map(toPublicDownloadedTrack);
  res.json(tracks);
});

app.post('/api/downloads/:videoId', async (req, res) => {
  const { videoId } = req.params;
  if (!VIDEO_ID_PATTERN.test(videoId)) {
    res.status(400).json({ error: 'Invalid YouTube video ID' });
    return;
  }

  try {
    const record = await createDownloadedTrack(videoId, req.body);
    markEngineActivity();
    res.status(201).json(toPublicDownloadedTrack(record));
  } catch (error) {
    markEngineError();
    console.error(`Download error for ${videoId}:`, error.message);
    res.status(502).json({ error: `Unable to save track: ${error.message}` });
  }
});

app.delete('/api/downloads/:videoId', async (req, res) => {
  const { videoId } = req.params;
  if (!VIDEO_ID_PATTERN.test(videoId)) {
    res.status(400).json({ error: 'Invalid YouTube video ID' });
    return;
  }
  if (downloadsInFlight.has(videoId)) {
    res.status(409).json({ error: 'This track is still downloading' });
    return;
  }

  const record = downloadedTracks.get(videoId);
  if (!record) {
    res.status(404).json({ error: 'Downloaded track not found' });
    return;
  }

  try {
    await fs.promises.rm(getDownloadedTrackPath(record), { force: true });
    downloadedTracks.delete(videoId);
    await persistDownloadIndex();
    markEngineActivity();
    res.status(204).end();
  } catch (error) {
    markEngineError();
    res.status(500).json({ error: `Unable to remove saved track: ${error.message}` });
  }
});

app.get('/api/search', async (req, res) => {
  engineMetrics.searches += 1;
  try {
    const query = String(req.query.q || 'spice and wolf ost').trim().slice(0, 200);
    const limit = normalizeLimit(req.query.limit);
    const searchLimit = Math.min(limit * 2, 25);
    const output = await runYtDlp([
      `ytsearch${searchLimit}:${query}`,
      '--flat-playlist',
      '--dump-json',
      '--no-warnings',
      '--ignore-errors'
    ], 45000);

    const videos = output
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter((video) => video && VIDEO_ID_PATTERN.test(video.id))
      .filter(isPlayableSongResult)
      .slice(0, limit)
      .map((video) => ({
        id: `yt-${video.id}`,
        videoId: video.id,
        title: video.title,
        artist: video.uploader || video.channel || 'YouTube Music',
        album: 'YouTube Music',
        duration: video.duration || 0,
        cover: video.thumbnails && video.thumbnails.length > 0
          ? video.thumbnails[video.thumbnails.length - 1].url
          : `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
        streamUrl: `${publicBaseUrl}/api/stream/${video.id}`,
        genre: 'Music',
        releaseDate: video.upload_date || '',
        isFull: true
      }));

    markEngineActivity();
    res.json(videos);
  } catch (error) {
    markEngineError();
    console.error('Search error:', error.message);
    res.status(502).json({ error: error.message });
  }
});

app.get('/api/stream/:videoId', async (req, res) => {
  engineMetrics.streamRequests += 1;
  engineMetrics.activeStreams += 1;
  const { videoId } = req.params;
  if (!VIDEO_ID_PATTERN.test(videoId)) {
    engineMetrics.activeStreams -= 1;
    res.status(400).send('Invalid YouTube video ID');
    return;
  }

  try {
    const downloadedTrack = downloadedTracks.get(videoId);
    if (downloadedTrack) {
      try {
        await serveDownloadedAudio(downloadedTrack, req, res);
        markEngineActivity();
        return;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        downloadedTracks.delete(videoId);
        await persistDownloadIndex();
      }
    }

    let audio = await resolveAudio(videoId);

    // Signed Google media URLs occasionally expire early. Resolve once more before
    // failing if the cached URL has gone stale.
    try {
      await proxyAudioRequest(audio, req, res);
    } catch (error) {
      if (res.headersSent) throw error;
      audioCache.delete(videoId);
      audio = await resolveAudio(videoId, true);
      await proxyAudioRequest(audio, req, res);
    }
    markEngineActivity();
  } catch (error) {
    markEngineError();
    console.error(`Stream error for ${videoId}:`, error.message);
    if (!res.headersSent) {
      res.status(502).send(`Unable to load audio: ${error.message}`);
    } else if (!res.writableEnded) {
      res.destroy(error);
    }
  } finally {
    engineMetrics.activeStreams = Math.max(0, engineMetrics.activeStreams - 1);
  }
});

function startAudioServer(port = DEFAULT_PORT, host = DEFAULT_HOST, options = {}) {
  if (audioServer) {
    return Promise.resolve(audioServer);
  }

  return initializeDownloadCache(options.cacheDirectory).then(() => new Promise((resolve, reject) => {
    const server = app.listen(port, host);

    const onListening = () => {
      server.off('error', onError);
      audioServer = server;
      publicBaseUrl = `http://${host}:${port}`;
      engineMetrics.startedAt = Date.now();
      console.log(`✓ Lumina Audio Engine running on http://${host}:${port}`);
      runYtDlp(['--version'], 5000)
        .then((version) => {
          engineMetrics.ytDlpVersion = version.trim();
          markEngineActivity();
        })
        .catch((error) => {
          markEngineError();
          console.error('yt-dlp check failed:', error.message);
        });
      resolve(server);
    };
    const onError = (error) => {
      server.off('listening', onListening);
      reject(error);
    };

    server.once('listening', onListening);
    server.once('error', onError);
  }));
}

function stopAudioServer() {
  if (!audioServer) return Promise.resolve();

  const server = audioServer;
  audioServer = null;
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

if (require.main === module) {
  startAudioServer().catch((error) => {
    console.error('Could not start the Lumina Audio Engine:', error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  app,
  startAudioServer,
  stopAudioServer
};
