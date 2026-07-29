# Lumina

Lumina is a polished Electron music player that searches YouTube with `yt-dlp`
and streams seekable audio through a private local proxy.

## Features

- Full-length YouTube audio with seeking
- Live Explore browsing across genres and search
- Persistent local downloads with offline, seekable playback
- Persistent favorites and listening history
- Synced LRCLIB lyrics
- Live audio-engine health dashboard
- Accent themes, OLED mode, speed controls, and equalizer settings
- Offline fallback to iTunes preview metadata

## Requirements

- Node.js and npm
- `yt-dlp` available in `PATH`

## Run the desktop app

```bash
npm install
npm run build
npm start
```

Electron starts the local audio engine automatically on `127.0.0.1:5174`.
You do not need to run `server.cjs` separately.

## Downloads and local cache

Use the download button on any full YouTube result to save its audio locally.
Downloaded tracks appear in the **Downloads** section and Lumina automatically
plays the cached file instead of requesting the remote stream.

Electron stores downloaded audio in its Lumina user-data directory:

- Linux: `~/.config/Lumina/audio-cache`
- Windows: `%APPDATA%/Lumina/audio-cache`
- macOS: `~/Library/Application Support/Lumina/audio-cache`

Removing a track from Downloads also removes its cached audio file.

## Development

Start Vite:

```bash
npm run dev
```

Then start Electron in another terminal:

```bash
npm run electron
```

## Playback troubleshooting

Confirm `yt-dlp` is current and the local engine can start:

```bash
yt-dlp --version
node server.cjs
```

If port `5174` is already in use, stop the other process before starting
Lumina.
