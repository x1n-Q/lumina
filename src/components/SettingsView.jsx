import React, { useEffect, useState } from 'react';
import {
  Check,
  Code2,
  Download,
  ExternalLink,
  LogOut,
  Moon,
  RadioTower,
  RefreshCw,
  Share2,
  ShieldCheck,
  Smartphone,
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
  const isWebMode = String(engineHealth?.mode || '').startsWith('web-');
  const isWebYouTube = engineHealth?.mode === 'web-youtube';
  const desktop = window.luminaDesktop;
  const [updateState, setUpdateState] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalledPwa, setIsInstalledPwa] = useState(
    window.matchMedia?.('(display-mode: standalone)').matches
      || window.navigator.standalone === true
  );
  const isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  useEffect(() => {
    if (!desktop?.getUpdateState) return undefined;
    let active = true;
    desktop.getUpdateState().then((state) => {
      if (active && state) setUpdateState(state);
    }).catch(() => {});
    const unsubscribe = desktop.onUpdateStatus?.((state) => {
      if (active) setUpdateState(state);
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [desktop]);

  useEffect(() => {
    if (desktop) return undefined;
    const capturePrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const markInstalled = () => {
      setInstallPrompt(null);
      setIsInstalledPwa(true);
    };
    window.addEventListener('beforeinstallprompt', capturePrompt);
    window.addEventListener('appinstalled', markInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', capturePrompt);
      window.removeEventListener('appinstalled', markInstalled);
    };
  }, [desktop]);

  const installPwa = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') setInstallPrompt(null);
  };

  const runUpdateAction = async (action) => {
    try {
      await action();
    } catch {
      setUpdateState((state) => ({
        ...state,
        status: 'error',
        message: 'The update service is unavailable. Open GitHub Releases to update manually.'
      }));
    }
  };
  const engineFeatures = isWebMode ? [
    {
      label: 'Mobile web catalog',
      value: isWebYouTube ? 'Complete songs' : '30-sec previews',
      ok: true
    },
    {
      label: 'YouTube web player',
      value: isWebYouTube ? 'Configured' : 'API key needed',
      ok: isWebYouTube
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
            {isWebMode ? (
              isWebYouTube
                ? 'Complete songs use the official embedded YouTube player'
                : 'Add YOUTUBE_API_KEY in Vercel to replace 30-second previews'
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
          {isWebMode
            ? 'The shared deployment account supports many simultaneous users. Favorites and history remain separate in each browser.'
            : 'Audio is resolved by the local Lumina engine on your computer. The desktop app does not require an account or send your library to a Lumina server.'}
        </div>
      </section>

      <section className="settings-card update-card">
        <div>
          <h2 className="settings-card-title">
            <span className="settings-card-icon">
              <Download size={16} />
            </span>
            App updates
          </h2>
          <div className="update-copy">
            <strong>
              {desktop
                ? `Lumina ${updateState?.currentVersion || 'desktop'}`
                : 'Managed by your web deployment'}
            </strong>
            <span>
              {desktop
                ? (updateState?.message || 'Loading update service…')
                : 'Redeploy the repository in Vercel to publish web updates.'}
            </span>
          </div>
          {updateState?.status === 'downloading' && (
            <div className="update-progress" aria-label={`Update ${Math.round(updateState.percent || 0)} percent downloaded`}>
              <span style={{ width: `${updateState.percent || 0}%` }} />
            </div>
          )}
        </div>
        {desktop && (
          <div className="developer-actions">
            {updateState?.status === 'available' && (
              <button
                className="developer-link"
                onClick={() => runUpdateAction(desktop.downloadUpdate)}
                type="button"
              >
                Download {updateState.availableVersion}
                <Download size={14} />
              </button>
            )}
            {updateState?.status === 'downloaded' && (
              <button className="developer-link" onClick={desktop.installUpdate} type="button">
                Restart & install
                <RefreshCw size={14} />
              </button>
            )}
            {!['available', 'downloaded', 'downloading'].includes(updateState?.status) && (
              <button
                className="developer-link"
                onClick={() => runUpdateAction(desktop.checkForUpdates)}
                disabled={updateState?.status === 'checking'}
                type="button"
              >
                {updateState?.status === 'checking' ? 'Checking…' : 'Check for updates'}
                <RefreshCw size={14} />
              </button>
            )}
            <button
              className="developer-link secondary"
              onClick={() => runUpdateAction(desktop.openReleases)}
              type="button"
            >
              GitHub Releases
              <ExternalLink size={14} />
            </button>
          </div>
        )}
      </section>

      {!desktop && (
        <section className="settings-card update-card">
          <div>
            <h2 className="settings-card-title">
              <span className="settings-card-icon">
                <Smartphone size={16} />
              </span>
              Install Lumina
            </h2>
            <div className="update-copy">
              <strong>{isInstalledPwa ? 'Installed on this device' : 'Use Lumina like an app'}</strong>
              <span>
                {isInstalledPwa
                  ? 'Lumina is running from your Home Screen in standalone mode.'
                  : isAppleMobile
                    ? 'In Safari, tap Share and choose Add to Home Screen.'
                    : installPrompt
                      ? 'Install the private player for a standalone, full-screen experience.'
                      : 'Open your browser menu and choose Install app or Add to Home Screen.'}
              </span>
            </div>
          </div>
          {!isInstalledPwa && (
            <div className="developer-actions">
              {installPrompt ? (
                <button className="developer-link" onClick={installPwa} type="button">
                  Install app
                  <Smartphone size={14} />
                </button>
              ) : isAppleMobile ? (
                <div className="pwa-ios-hint">
                  <Share2 size={14} />
                  Share → Add to Home Screen
                </div>
              ) : null}
            </div>
          )}
        </section>
      )}

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
