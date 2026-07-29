# Changelog

All notable Lumina changes are documented here.

## [1.0.0] - 2026-07-29

### Added

- Live Explore browsing with searchable YouTube results and genre mixes
- Persistent local audio downloads with seekable range playback
- Downloads library with save, progress, cached, and remove states
- Custom Lumina vector identity, favicon, and desktop icon
- Linux `.deb` and AppImage release targets
- Windows portable `.exe` release target
- Checksum-verified bundled `yt-dlp` runtimes for Linux and Windows

### Fixed

- Audio playback remaining at `0:00` when a signed media URL expires
- Sidebar branding, status-footer alignment, and player spacing
- Playback buffering and engine error feedback

### Security

- Removed unused legacy YouTube libraries and their vulnerable dependency tree
- Production dependency audit reports zero known vulnerabilities
