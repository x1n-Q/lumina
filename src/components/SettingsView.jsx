import React from 'react';
import {
  Check,
  Code2,
  ExternalLink,
  LogOut,
  Moon,
  RadioTower,
  ShieldCheck,
  X
} from 'lucide-react';

function formatUptime(seconds) {
  const totalMinutes = Math.floor((Number(seconds) || 0) / 60);
  if (totalMinutes < 1) return 'Just started';
  if (totalMinutes < 60) return `${totalMinutes}m uptime`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m uptime`;
}

export default function SettingsView({ oledMode, setOledMode, engineHealth, onLogout }) {
  const isWebPreview = engineHealth?.mode === 'web-preview';
  const engineFeatures = isWebPreview ? [
    {
      label: 'Mobile web catalog',
      value: 'Preview mode',
      ok: true
    },
    {
      label: 'Private desktop engine',
      value: 'Desktop only',
      ok: true
    },
    {
      label: 'Local favorites',
      value: 'On this device',
      ok: true
    },
    {
      label: 'Account access',
      value: 'Protected',
      ok: true
    }
  ] : [
    {
      label: 'Local audio proxy',
      value: engineHealth?.ok ? 'Connected' : 'Unavailable',
      ok: Boolean(engineHealth?.ok)
    },
    {
      label: 'yt-dlp resolver',
      value: engineHealth?.ytDlpVersion || 'Checking version',
      ok: Boolean(engineHealth?.ytDlpVersion)
    },
    {
      label: 'Resolved stream cache',
      value: `${engineHealth?.cacheEntries || 0} cached`,
      ok: Boolean(engineHealth?.ok)
    },
    {
      label: 'Playback activity',
      value: engineHealth?.activeStreams > 0
        ? `${engineHealth.activeStreams} active`
        : 'Idle',
      ok: Boolean(engineHealth?.ok)
    }
  ];

  const openPortfolio = () => {
    const url = 'https://danieldepaor.com';
    if (window.luminaDesktop?.openExternal) {
      window.luminaDesktop.openExternal(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Preferences</h1>
        <p>
          Fine-tune how Lumina looks and confirm the services powering your
          listening experience.
        </p>
      </div>

      <div className="settings-grid">
        <section className="settings-card">
          <h2 className="settings-card-title">
            <span className="settings-card-icon">
              <Moon size={16} />
            </span>
            Appearance
          </h2>
          <div className="setting-row">
            <div>
              <div className="setting-name">OLED black</div>
              <div className="setting-description">
                Use pure black surfaces for deeper contrast and reduced glow.
              </div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={oledMode}
                onChange={(event) => setOledMode(event.target.checked)}
              />
              <span className="toggle-track" />
            </label>
          </div>
        </section>

        <section className="settings-card">
          <h2 className="settings-card-title">
            <span className="settings-card-icon">
              <RadioTower size={16} />
            </span>
            Playback engine
          </h2>
          <div className="feature-list">
            {engineFeatures.map((feature) => (
              <div className="feature-item" key={feature.label}>
                <span className={`feature-check ${feature.ok ? '' : 'offline'}`}>
                  {feature.ok
                    ? <Check size={12} strokeWidth={3} />
                    : <X size={12} strokeWidth={3} />}
                </span>
                <span>{feature.label}</span>
                <strong>{feature.value}</strong>
              </div>
            ))}
          </div>
          <div className="engine-summary">
            {isWebPreview ? (
              'Playable song previews for self-hosted mobile access'
            ) : (
              <>
                {formatUptime(engineHealth?.uptimeSeconds)}
                <span>·</span>
                {engineHealth?.searches || 0} searches
                <span>·</span>
                {engineHealth?.streamRequests || 0} stream requests
              </>
            )}
          </div>
        </section>
      </div>

      <section className="settings-card">
        <h2 className="settings-card-title">
          <span className="settings-card-icon">
            <ShieldCheck size={16} />
          </span>
          Private by design
        </h2>
        <div className="setting-description" style={{ maxWidth: 620, marginTop: 14 }}>
          {isWebPreview
            ? 'The mobile web player keeps favorites and history in this browser. Its single-user login is verified by your own Vercel deployment.'
            : 'Audio is resolved by the local Lumina engine on your computer. The desktop app does not require an account or send your library to a Lumina server.'}
        </div>
      </section>

      <section className="settings-card developer-card">
        <div>
          <h2 className="settings-card-title">
            <span className="settings-card-icon">
              <Code2 size={16} />
            </span>
            Developer
          </h2>
          <div className="developer-copy">
            <strong>x1n-Q</strong>
            <span>Creator and developer of Lumina</span>
          </div>
        </div>
        <div className="developer-actions">
          <button className="developer-link" onClick={openPortfolio} type="button">
            Visit danieldepaor.com
            <ExternalLink size={14} />
          </button>
          {onLogout && (
            <button className="developer-link secondary" onClick={onLogout} type="button">
              Sign out
              <LogOut size={14} />
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
