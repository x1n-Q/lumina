import React from 'react';
import {
  AudioLines,
  Compass,
  Download,
  Heart,
  Home,
  Library,
  RadioTower,
  Settings,
  SlidersHorizontal
} from 'lucide-react';
import LuminaLogo from './LuminaLogo';

const MENU_ITEMS = [
  { id: 'home', label: 'Discover', icon: Home },
  { id: 'explore', label: 'Explore', icon: Compass },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'downloads', label: 'Downloads', icon: Download },
  { id: 'favorites', label: 'Favorites', icon: Heart },
];

export default function Sidebar({
  activeTab,
  setActiveTab,
  onOpenEqualizer,
  engineHealth,
  favoriteCount,
  historyCount,
  downloadCount
}) {
  const engineStatus = engineHealth?.status || 'checking';
  const isWebPreview = engineHealth?.mode === 'web-preview';
  const isWebYouTube = engineHealth?.mode === 'web-youtube';
  const statusLabel = isWebPreview
    ? 'PREVIEW'
    : isWebYouTube
      ? 'YOUTUBE'
    : engineHealth?.ok
    ? 'ONLINE'
    : engineStatus === 'checking' || engineStatus === 'starting'
      ? 'STARTING'
      : 'OFFLINE';
  const activeStreams = engineHealth?.activeStreams || 0;
  const cachedTracks = engineHealth?.cacheEntries || 0;
  const engineDetail = isWebPreview
    ? 'Playable song previews'
    : isWebYouTube
      ? 'Complete songs via YouTube'
    : !engineHealth?.ok
    ? 'Connecting to audio service'
    : activeStreams > 0
      ? `${activeStreams} ${activeStreams === 1 ? 'track' : 'tracks'} playing`
      : cachedTracks > 0
        ? `${cachedTracks} ${cachedTracks === 1 ? 'track' : 'tracks'} ready`
        : 'Ready to play';
  const navCounts = {
    library: historyCount,
    downloads: downloadCount,
    favorites: favoriteCount
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <LuminaLogo className="brand-logo" />
        </div>
        <div className="brand-copy">
          <div className="brand-name-row">
            <h1 className="brand-name">Lumina</h1>
            <span className="brand-badge">{window.luminaDesktop ? 'PC' : 'WEB'}</span>
          </div>
        </div>
      </div>

      <nav className="nav-group" aria-label="Main navigation">
        <span className="nav-label">Browse</span>
        {MENU_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`nav-item nav-item-${id} ${activeTab === id ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
            title={label}
          >
            <Icon size={17} />
            <span>{label}</span>
            {navCounts[id] > 0 && <span className="nav-count">{navCounts[id]}</span>}
          </button>
        ))}
      </nav>

      <div className="nav-group">
        <span className="nav-label">Sound</span>
        <button className="nav-item nav-item-equalizer" onClick={onOpenEqualizer} title="Equalizer">
          <SlidersHorizontal size={17} />
          <span>Equalizer</span>
        </button>
        <button
          className={`nav-item nav-item-settings ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          title="Preferences"
        >
          <Settings size={17} />
          <span>Preferences</span>
        </button>
      </div>

      <div className="engine-card">
        <div className="engine-row">
          <div className="engine-name">
            <RadioTower size={14} color="var(--primary)" />
            <span>Audio engine</span>
          </div>
          <div className={`engine-status ${engineHealth?.ok ? '' : engineStatus}`}>
            <span className="status-dot" />
            {statusLabel}
          </div>
        </div>
        <div className="engine-detail">
          <AudioLines size={13} />
          <span>{engineDetail}</span>
        </div>
      </div>
    </aside>
  );
}
