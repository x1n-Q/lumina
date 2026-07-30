import React from 'react';
import {
  ArrowRight,
  Bookmark,
  Check,
  Clock3,
  Compass,
  Database,
  Disc3,
  Download,
  Heart,
  Headphones,
  Library,
  Loader2,
  Play,
  Radio,
  Sparkles,
  TrendingUp,
  Wifi,
  WifiOff
} from 'lucide-react';
import { MUSIC_GENRES } from '../services/musicEngine';

function formatDuration(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return '--:--';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

export default function HomeView({
  tracks,
  currentTrack,
  isPlaying,
  onSelectTrack,
  searchQuery,
  activeGenre,
  onSelectGenre,
  isLoading,
  likedSongs,
  onToggleLike,
  downloadedSongs = [],
  downloadStates = {},
  downloadNotice,
  onToggleDownload,
  viewMode = 'home',
  engineHealth,
  savedCount = 0,
  recentCount = 0,
  downloadCount = 0,
  dataSource = 'Unknown',
  notice = '',
  dashboardTracks = [],
  onOpenExplore
}) {
  const isHomeDashboard = viewMode === 'home';
  const homeTracks = dashboardTracks.length > 0 ? dashboardTracks.slice(0, 4) : tracks.slice(0, 4);
  const displayTracks = isHomeDashboard ? homeTracks : tracks;
  const featuredTrack = currentTrack || homeTracks[0] || tracks[0];
  const hasListeningHistory = dashboardTracks.length > 0;
  const activeGenreName = MUSIC_GENRES.find((genre) => genre.id === activeGenre)?.name;
  const collectionConfig = {
    explore: {
      eyebrow: 'Live music discovery',
      title: 'Explore music',
      description: 'Choose a genre below or search for any song, artist, album, or mood.',
      icon: Compass,
      empty: 'Choose another genre or search for something new.'
    },
    library: {
      eyebrow: 'Listening history',
      title: 'Recently played',
      description: 'Tracks you play appear here automatically, ready for another listen.',
      icon: Clock3,
      empty: 'Play a track and it will appear in your listening history.'
    },
    favorites: {
      eyebrow: 'Your collection',
      title: 'Favorite tracks',
      description: 'Everything you save stays here between Lumina sessions.',
      icon: Heart,
      empty: 'Tap the heart on any track to build your favorites.'
    },
    downloads: {
      eyebrow: 'Available offline',
      title: 'Downloaded tracks',
      description: 'Music saved to Lumina’s local cache for reliable playback between sessions.',
      icon: Download,
      empty: 'Use the download button on a YouTube track to save it locally.'
    }
  };
  const collection = collectionConfig[viewMode];
  const CollectionIcon = collection?.icon || Library;
  const resultTitle = searchQuery
    ? `Results for “${searchQuery}”`
    : viewMode === 'explore'
      ? `${activeGenreName || 'Explore'} picks`
      : collection?.title || 'Recommended for you';
  const resultSubtitle = searchQuery
    ? `Live results from ${dataSource}`
    : viewMode === 'explore'
      ? 'Fresh live results from your selected genre'
      : collection?.description || 'A fresh mix from your selected mood';

  return (
    <div className="page-stack">
      {isHomeDashboard ? (
        <>
          <section className="hero-panel">
            <div className="hero-copy">
              <div className="hero-kicker">
                {engineHealth?.ok ? <Sparkles size={12} /> : <WifiOff size={12} />}
                {engineHealth?.ok ? 'Your daily device mix' : 'Preview fallback mode'}
              </div>
              <h1 className="hero-title">
                Your next favorite song is <span>one search away.</span>
              </h1>
              <p className="hero-description">
                A fresh mix shaped by what you play and save on this PC.
                Search and genre browsing stay ready in Explore.
              </p>
              <div className="hero-actions">
                {featuredTrack && (
                  <button className="btn btn-primary" onClick={() => onSelectTrack(featuredTrack)}>
                    <Play size={15} fill="currentColor" />
                    {currentTrack ? 'Resume listening' : 'Start listening'}
                  </button>
                )}
                <button className="btn btn-secondary" onClick={onOpenExplore}>
                  Explore music
                  <ArrowRight size={14} />
                </button>
                <div className="hero-meta">
                  <Headphones size={13} />
                  {engineHealth?.ok
                    ? `${dataSource} · Full audio`
                    : `${dataSource} · Limited previews`}
                </div>
              </div>
            </div>

            {featuredTrack && (
              <div className="hero-art">
                <div className="hero-cover-stack">
                  <img
                    className="hero-cover"
                    src={featuredTrack.cover}
                    alt={featuredTrack.title}
                  />
                  <div className="hero-cover-overlay">
                    <div className="hero-cover-info">
                      <div className="hero-cover-label">
                        {currentTrack ? (isPlaying ? 'Now playing' : 'Ready to play') : 'Featured'}
                      </div>
                      <div className="hero-cover-title">{featuredTrack.title}</div>
                    </div>
                    <button
                      className="hero-play"
                      onClick={() => onSelectTrack(featuredTrack)}
                      title={`Play ${featuredTrack.title}`}
                    >
                      {currentTrack?.id === featuredTrack.id && isPlaying ? (
                        <div className="eq-container">
                          <div className="eq-bar" />
                          <div className="eq-bar" />
                          <div className="eq-bar" />
                          <div className="eq-bar" />
                        </div>
                      ) : (
                        <Play size={17} fill="currentColor" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="dashboard-metrics" aria-label="Dashboard overview">
            <div className={`metric-card ${engineHealth?.ok ? '' : 'warning'}`}>
              <div className="metric-icon">
                {engineHealth?.ok ? <Wifi size={16} /> : <WifiOff size={16} />}
              </div>
              <div>
                <div className="metric-label">Audio engine</div>
                <div className="metric-value">
                  {engineHealth?.ok
                    ? engineHealth.activeStreams > 0 ? 'Streaming' : 'Online'
                    : engineHealth?.status === 'offline' ? 'Offline' : 'Connecting'}
                </div>
                <div className="metric-detail">
                  {engineHealth?.ytDlpVersion
                    ? `yt-dlp ${engineHealth.ytDlpVersion}`
                    : 'Checking local service'}
                </div>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon"><Database size={16} /></div>
              <div>
                <div className="metric-label">Current source</div>
                <div className="metric-value">{dataSource}</div>
                <div className="metric-detail">{tracks.length} results loaded</div>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon"><Bookmark size={16} /></div>
              <div>
                <div className="metric-label">Favorites</div>
                <div className="metric-value">{savedCount}</div>
                <div className="metric-detail">Saved across sessions</div>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon"><Download size={16} /></div>
              <div>
                <div className="metric-label">Downloads</div>
                <div className="metric-value">{downloadCount}</div>
                <div className="metric-detail">Cached on this device</div>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon"><Clock3 size={16} /></div>
              <div>
                <div className="metric-label">Recently played</div>
                <div className="metric-value">{recentCount}</div>
                <div className="metric-detail">Unique tracks in history</div>
              </div>
            </div>
          </section>

          {notice && (
            <div className="dashboard-notice">
              <WifiOff size={15} />
              <span>{notice}</span>
            </div>
          )}

        </>
      ) : (
        <section className="collection-header">
          <div className="collection-icon">
            <CollectionIcon size={24} />
          </div>
          <div>
            <div className="collection-eyebrow">{collection.eyebrow}</div>
            <h1>{collection.title}</h1>
            <p>{collection.description}</p>
          </div>
          <div className="collection-count">
            <strong>{tracks.length}</strong>
            <span>{tracks.length === 1 ? 'track' : 'tracks'}</span>
          </div>
        </section>
      )}

      {viewMode === 'explore' && (
        <section className="section-block">
          <div className="section-heading">
            <div className="section-title-wrap">
              <div className="section-icon">
                <Compass size={16} />
              </div>
              <div>
                <h2 className="section-title">Browse genres</h2>
                <p className="section-subtitle">Switch genres to load a fresh live mix</p>
              </div>
            </div>
          </div>
          <div className="genre-row">
            {MUSIC_GENRES.map((genre) => (
              <button
                key={genre.id}
                className={`genre-chip ${activeGenre === genre.id ? 'active' : ''}`}
                onClick={() => onSelectGenre(genre)}
              >
                {genre.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {notice && !isHomeDashboard && viewMode === 'explore' && (
        <div className="dashboard-notice">
          <WifiOff size={15} />
          <span>{notice}</span>
        </div>
      )}

      {downloadNotice && (
        <div className={`download-notice ${downloadNotice.type}`}>
          {downloadNotice.type === 'error'
            ? <WifiOff size={15} />
            : <Check size={15} />}
          <span>{downloadNotice.text}</span>
        </div>
      )}

      <section className="section-block">
        <div className="section-heading">
          <div className="section-title-wrap">
            <div className="section-icon">
              {searchQuery ? <Radio size={16} /> : <TrendingUp size={16} />}
            </div>
            <div>
              <h2 className="section-title">
                {isHomeDashboard
                  ? hasListeningHistory ? 'Jump back in' : 'A quick mix for you'
                  : resultTitle}
              </h2>
              <p className="section-subtitle">
                {isHomeDashboard
                  ? hasListeningHistory
                    ? 'Your most recently played tracks'
                    : 'Four picks to get your session started'
                  : resultSubtitle}
              </p>
            </div>
          </div>
          <span className="track-count">
            {displayTracks.length} {displayTracks.length === 1 ? 'track' : 'tracks'}
          </span>
        </div>

        {isLoading ? (
          <div className="loading-state">
            <Disc3 size={30} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
            <span>Finding the best available streams…</span>
          </div>
        ) : displayTracks.length === 0 ? (
          <div className="empty-state">
            <CollectionIcon size={29} color="var(--primary)" />
            <span>{collection?.empty || 'No tracks found. Try a different search.'}</span>
          </div>
        ) : (
          <div className="tracks-grid">
            {displayTracks.map((track) => {
              const isSelected = currentTrack?.id === track.id;
              const isLiked = likedSongs.includes(track.id);
              const isDownloaded = downloadedSongs.includes(track.id);
              const downloadState = downloadStates[track.id];
              const canDownload = Boolean(track.videoId) && !track.isPreview;

              return (
                <article
                  key={track.id}
                  className={`track-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelectTrack(track)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectTrack(track);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="track-artwork">
                    <img className="cover-img" src={track.cover} alt={track.title} />
                    {isSelected && <span className="now-playing-badge">NOW PLAYING</span>}
                    <div className="track-actions">
                      <button
                        className={`like-button ${isLiked ? 'liked' : ''}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleLike(track);
                        }}
                        title={isLiked ? 'Remove from favorites' : 'Add to favorites'}
                        aria-label={isLiked ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Heart size={15} fill={isLiked ? 'currentColor' : 'none'} />
                      </button>
                      {canDownload && (
                        <button
                          className={`download-button ${isDownloaded ? 'downloaded' : ''}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            onToggleDownload(track);
                          }}
                          title={isDownloaded ? 'Remove local download' : 'Download for offline playback'}
                          aria-label={isDownloaded ? 'Remove local download' : 'Download track'}
                          disabled={Boolean(downloadState)}
                        >
                          {downloadState ? (
                            <Loader2 className="download-spinner" size={15} />
                          ) : isDownloaded ? (
                            <Check size={15} />
                          ) : (
                            <Download size={15} />
                          )}
                        </button>
                      )}
                    </div>
                    <button
                      className="track-play"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectTrack(track);
                      }}
                      title={`Play ${track.title}`}
                    >
                      {isSelected && isPlaying ? (
                        <div className="eq-container">
                          <div className="eq-bar" />
                          <div className="eq-bar" />
                          <div className="eq-bar" />
                          <div className="eq-bar" />
                        </div>
                      ) : (
                        <Play size={17} fill="currentColor" />
                      )}
                    </button>
                  </div>
                  <div className="track-details">
                    <h3 className="track-title">{track.title}</h3>
                    <p className="track-artist">{track.artist}</p>
                    <div className="track-meta">
                      <span className="track-genre">{track.genre || 'Full audio'}</span>
                      <span>{formatDuration(track.duration)}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
