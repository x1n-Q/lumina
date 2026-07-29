# Lumina

Lumina is a polished Electron music player that searches YouTube with `yt-dlp`
and streams seekable audio through a private local proxy.

## Features

- Full-length YouTube audio with seeking
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
