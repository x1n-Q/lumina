<p align="center">
  <img src="public/lumina-logo.svg" width="96" height="96" alt="Lumina logo">
</p>

# Lumina

Lumina is a polished Electron music player that searches YouTube with `yt-dlp`
and streams seekable audio through a private local proxy.

Created and maintained by **x1n-Q**. Visit
[danieldepaor.com](https://danieldepaor.com).

## Features

- Full-length YouTube audio with seeking
- Live Explore browsing across genres and search
- Persistent local downloads with offline, seekable playback
- Persistent favorites and listening history
- Synced LRCLIB lyrics
- Live audio-engine health dashboard
- Real five-band equalizer, audio normalization, and adjustable bass boost presets
- Discord track sharing with an exact playable YouTube source
- GitHub update checks, downloads, and restart-to-install support in Windows Setup releases
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

Starting with Lumina 1.6.0, the Windows Setup edition can check GitHub Releases
from **Preferences → App updates**, download a newer installer, and apply it
after restart. Portable builds keep the manual update flow so the executable
can stay portable.

## Discord sharing

Use the message button in the desktop player's control bar to copy the current
track's exact YouTube link and open Discord. Paste the link in a DM, group, or
server channel so other people can play the same source. Lumina does not join
or transmit audio into a voice channel; that would require a separately hosted
Discord bot with permission to join that server.

## Self-deploy the private mobile web version

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fx1n-Q%2Flumina&env=LUMINA_USERNAME%2CLUMINA_PASSWORD%2CLUMINA_SESSION_SECRET)

The repository includes a responsive mobile layout, Vercel Functions for one
private account, and SPA routing configuration. Each person deploys their own
copy; the project owner does not deploy or manage it for them.

Before deploying, configure these three Vercel environment variables for
Production and Preview:

- `LUMINA_USERNAME`: the only accepted username
- `LUMINA_PASSWORD`: a long, unique password
- `LUMINA_SESSION_SECRET`: at least 32 random characters

Generate a strong session secret locally:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

After adding or changing environment variables, redeploy the project. The web
version uses playable song previews by default because the full `yt-dlp` engine
runs privately inside the desktop app. Advanced deployers may provide a
compatible HTTPS backend through `VITE_BACKEND_URL`.

### Install on iPhone or iPad

After deploying to Vercel, open the HTTPS deployment in Safari, sign in, tap
the **Share** button, and choose **Add to Home Screen**. Lumina launches in a
standalone app window with its own Home Screen icon. The same instructions are
available under **Preferences → Install Lumina**.

Other compatible mobile browsers show an **Install app** action in Preferences.
The service worker caches only the application shell and static assets;
authentication endpoints always remain network-only and are never cached.

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
