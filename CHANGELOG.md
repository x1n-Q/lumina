# Changelog

All notable Lumina changes are documented here.

## Unreleased

### Added

- A visible Retry action beside playback errors that reloads the current song

### Fixed

- Retrying a YouTube track now discards its cached media URL and resolves a fresh stream
- Interrupted play requests no longer appear as genuine playback failures
- Unresponsive upstream media connections now time out promptly before stream recovery

## [1.4.1] - 2026-07-30

### Fixed

- Windows title-bar, taskbar, installer, and shortcut icons now use the same current Lumina mark as the in-app sidebar
- The packaged window now includes its logo asset instead of relying on the executable fallback icon

## [1.4.0] - 2026-07-30

### Added

- Standard Windows Setup installer with Start menu and desktop shortcuts
- Persistent startup diagnostics with clear recovery guidance for missing bundled files

### Changed

- The desktop audio engine now selects an available private local port automatically
- A second Lumina launch now focuses the existing window instead of starting a conflicting engine
- Release documentation now clearly separates normal installer downloads from developer source archives

## [1.3.1] - 2026-07-30

### Fixed

- Explore searches restarting when playback updates local listening history
- Concurrent media range requests duplicating slow audio URL resolution work
- Search results returning to a loading state immediately after selecting a song

## [1.3.0] - 2026-07-30

### Added

- Detachable frameless mini player with previous, play/pause, and next controls
- Always-on-top desktop mode that remains accessible while Lumina is minimized
- Draggable mini-player positioning, live track progress, and a shortcut back to the main window

## [1.2.0] - 2026-07-30

### Added

- Floating Up Next panel with current-track context and automatic follow-up previews
- Persistent manual playback queue with play-now, reorder, remove, and clear controls
- Add-to-queue actions on track cards and a queue-count indicator in the player
- Surprise Me playback based on the current search, genre, collection, or Discover mix
- Functional shuffle and repeat-off, repeat-all, and repeat-one playback modes

## [1.1.0] - 2026-07-30

### Added

- Anonymous per-installation discovery profiles that produce a different daily mix on each PC
- Local listening-history and favorite signals for more relevant Discover recommendations
- A direct Explore action from the Discover dashboard

### Changed

- Discover is now a focused dashboard with featured playback, status metrics, and a concise recent-listening shelf
- Explore remains the dedicated destination for genre browsing, typed searches, and complete result grids
- Refined the compact Lumina logo, sidebar wordmark, and dashboard action layout

### Fixed

- Long-form compilations, playlists, nonstop mixes, and tracks over 20 minutes appearing as playable songs
- Stale asynchronous search responses replacing results from the currently active view
- Identical default Discover ordering across separate Lumina installations

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
