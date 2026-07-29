const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const https = require('https');
const http = require('http');

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 5174;
const MAX_YTDLP_OUTPUT = 20 * 1024 * 1024;
const AUDIO_CACHE_TTL = 30 * 60 * 1000;
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const app = express();
app.use(cors());

const audioCache = new Map();
let audioServer = null;
let publicBaseUrl = `http://${DEFAULT_HOST}:${DEFAULT_PORT}`;
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

function runYtDlp(args, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const child = spawn('yt-dlp', args, {
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
        finish(new Error('yt-dlp is not installed or is not available in PATH'));
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
    const headers = {
      ...audio.headers,
      'User-Agent': audio.headers['User-Agent']
        || audio.headers['user-agent']
        || 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    };

    delete headers.Host;
    delete headers.host;
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

app.get('/api/health', (_req, res) => {
  const ytDlpReady = Boolean(engineMetrics.ytDlpVersion);
  res.json({
    ok: ytDlpReady,
    status: ytDlpReady ? 'online' : 'starting',
    uptimeSeconds: Math.floor((Date.now() - engineMetrics.startedAt) / 1000),
    ytDlpVersion: engineMetrics.ytDlpVersion,
    cacheEntries: audioCache.size,
    searches: engineMetrics.searches,
    streamRequests: engineMetrics.streamRequests,
    activeStreams: engineMetrics.activeStreams,
    lastActivityAt: engineMetrics.lastActivityAt,
    lastErrorAt: engineMetrics.lastErrorAt
  });
});

app.get('/api/search', async (req, res) => {
  engineMetrics.searches += 1;
  try {
    const query = String(req.query.q || 'spice and wolf ost').trim().slice(0, 200);
    const limit = normalizeLimit(req.query.limit);
    const output = await runYtDlp([
      `ytsearch${limit}:${query}`,
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

function startAudioServer(port = DEFAULT_PORT, host = DEFAULT_HOST) {
  if (audioServer) {
    return Promise.resolve(audioServer);
  }

  return new Promise((resolve, reject) => {
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
  });
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
