<p align="center">
  <img src="public/lumina-logo.svg" width="96" height="96" alt="Lumina logo">
</p>

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

## Install a release

Download the appropriate artifact from
[GitHub Releases](https://github.com/x1n-Q/lumina/releases):

- Linux: `.deb` package or portable `.AppImage`
- Windows: `Lumina-Setup-...exe` (recommended) or the portable `.exe`

Release builds include a checksum-verified `yt-dlp` runtime. Users do not need
to install Node.js, npm, or `yt-dlp`. For a normal Windows PC, download the
file whose name starts with **Lumina-Setup**. Do not download GitHub's
automatically generated **Source code** ZIP files; those are for developers.

## Development requirements

- Node.js and npm
- `yt-dlp` available in `PATH`

## Run the desktop app

```bash
npm install
npm run build
npm start
```

Electron starts the local audio engine automatically on a private available
port on `127.0.0.1`.
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

## Build desktop packages

```bash
# Linux .deb and AppImage
npm run dist:linux

# Windows Setup installer and portable .exe
npm run dist:win
```

The runtime preparation script pins `yt-dlp` to version `2026.07.04` and
verifies the official SHA-256 checksum before packaging it.

## Playback troubleshooting

Release users should reinstall Lumina if Windows Security quarantines the
bundled audio helper. If startup still fails, attach this diagnostic file to a
bug report:

```text
%APPDATA%\Lumina\startup-error.log
```

Developers can confirm `yt-dlp` is current and the local engine can start:

```bash
yt-dlp --version
node server.cjs
```

Lumina automatically chooses an available local port, so another application
using the old default port no longer prevents startup.
