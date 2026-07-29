import React, { useEffect, useRef } from 'react';
import { RadioTower, Search, X } from 'lucide-react';

const ACCENTS = [
  { id: 'indigo', label: 'Violet', color: '#7c6cff' },
  { id: 'emerald', label: 'Emerald', color: '#34d399' },
  { id: 'crimson', label: 'Rose', color: '#fb7185' },
  { id: 'amber', label: 'Amber', color: '#fbbf24' },
  { id: 'cyan', label: 'Cyan', color: '#22d3ee' },
];

const TAB_TITLES = {
  home: ['Made for listening', 'Discover'],
  explore: ['Find something new', 'Explore'],
  library: ['Your collection', 'Library'],
  downloads: ['Available offline', 'Downloads'],
  favorites: ['Saved for later', 'Favorites'],
  settings: ['Make it yours', 'Preferences'],
};

export default function Header({
  searchQuery,
  setSearchQuery,
  accent,
  setAccent,
  activeTab = 'home',
  engineHealth
}) {
  const searchRef = useRef(null);
  const [eyebrow, title] = TAB_TITLES[activeTab] || TAB_TITLES.home;

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-context">
        <div className="topbar-eyebrow">{eyebrow}</div>
        <div className="topbar-title">{title}</div>
      </div>

      <div className="search-shell">
        <Search className="search-icon" size={16} />
        <input
          ref={searchRef}
          className="search-input"
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search songs, artists, or YouTube"
          aria-label="Search music"
        />
        {searchQuery ? (
          <button
            className="search-action"
            onClick={() => setSearchQuery('')}
            title="Clear search"
          >
            <X size={13} />
          </button>
        ) : (
          <span className="search-shortcut">Ctrl K</span>
        )}
      </div>

      <div className="topbar-actions">
        <div className={`live-pill ${engineHealth?.ok ? '' : engineHealth?.status || 'checking'}`}>
          <RadioTower size={13} />
          {engineHealth?.ok
            ? engineHealth.activeStreams > 0
              ? 'Streaming now'
              : 'Engine ready'
            : engineHealth?.status === 'offline'
              ? 'Engine offline'
              : 'Connecting'}
        </div>
        <div className="accent-picker" aria-label="Accent color">
          {ACCENTS.map((item) => (
            <button
              key={item.id}
              className={`accent-dot ${accent === item.id ? 'active' : ''}`}
              onClick={() => setAccent(item.id)}
              title={`${item.label} accent`}
              style={{ background: item.color }}
            />
          ))}
        </div>
      </div>
    </header>
  );
}
