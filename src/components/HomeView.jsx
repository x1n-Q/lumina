import React from 'react';
import {
  Bookmark,
  Clock3,
  Compass,
  Database,
  Disc3,
  Heart,
  Headphones,
  Library,
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
  viewMode = 'home',
  engineHealth,
  savedCount = 0,
  recentCount = 0,
  dataSource = 'Unknown',
  notice = ''
}) {
  const featuredTrack = currentTrack || tracks[0];
  const isDiscovery = viewMode === 'home' || viewMode === 'explore';
  const collectionConfig = {
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
    }
  };
  const collection = collectionConfig[viewMode];
  const CollectionIcon = collection?.icon || Library;
  const resultTitle = searchQuery
    ? `Results for “${searchQuery}”`
    : collection?.title || (viewMode === 'explore' ? 'Explore results' : 'Recommended for you');
  const resultSubtitle = searchQuery
    ? `Live results from ${dataSource}`
    : collection?.description || 'A fresh mix from your selected mood';

  return (
    <div className="page-stack">
      {isDiscovery ? (
        <>
          <section className="hero-panel">
            <div className="hero-copy">
              <div className="hero-kicker">
                {engineHealth?.ok ? <Sparkles size={12} /> : <WifiOff size={12} />}
                {engineHealth?.ok ? 'Full-length streaming' : 'Preview fallback mode'}
              </div>
              <h1 className="hero-title">
                Your next favorite song is <span>one search away.</span>
              </h1>
              <p className="hero-description">
                Search across YouTube, keep full tracks playing while you browse,
                and return to every favorite or recent listen automatically.
              </p>
              <div className="hero-actions">
                {tracks.length > 0 && (
                  <button className="btn btn-primary" onClick={() => onSelectTrack(tracks[0])}>
                    <Play size={15} fill="currentColor" />
                    Play top result
                  </button>
                )}
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

          <section className="section-block">
            <div className="section-heading">
              <div className="section-title-wrap">
                <div className="section-icon">
                  <Compass size={16} />
                </div>
                <div>
                  <h2 className="section-title">Explore moods</h2>
                  <p className="section-subtitle">Pick a lane or search for anything</p>
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

      <section className="section-block">
        <div className="section-heading">
          <div className="section-title-wrap">
            <div className="section-icon">
              {searchQuery ? <Radio size={16} /> : <TrendingUp size={16} />}
            </div>
            <div>
              <h2 className="section-title">
                {resultTitle}
              </h2>
              <p className="section-subtitle">{resultSubtitle}</p>
            </div>
          </div>
          <span className="track-count">
            {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
          </span>
        </div>

        {isLoading ? (
          <div className="loading-state">
            <Disc3 size={30} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
            <span>Finding the best available streams…</span>
          </div>
        ) : tracks.length === 0 ? (
          <div className="empty-state">
            <CollectionIcon size={29} color="var(--primary)" />
            <span>{collection?.empty || 'No tracks found. Try a different search.'}</span>
          </div>
        ) : (
          <div className="tracks-grid">
            {tracks.map((track) => {
              const isSelected = currentTrack?.id === track.id;
              const isLiked = likedSongs.includes(track.id);

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
                    <button
                      className={`like-button ${isLiked ? 'liked' : ''}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleLike(track);
                      }}
                      title={isLiked ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Heart size={15} fill={isLiked ? 'currentColor' : 'none'} />
                    </button>
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
