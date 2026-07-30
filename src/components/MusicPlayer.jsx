import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ListMusic,
  MessageCircle,
  Mic2,
  Moon,
  Pause,
  PictureInPicture2,
  Play,
  Repeat2,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';

function formatTime(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

export default function MusicPlayer({
  currentTrack,
  isPlaying,
  onTogglePlay,
  onNext,
  onPrev,
  currentTime,
  duration,
  onSeek,
  volume,
  setVolume,
  onOpenEqualizer,
  onOpenLyrics,
  sleepTimer,
  setSleepTimer,
  isBuffering,
  playbackError,
  onRetryPlayback,
  onShareToDiscord,
  discordShareStatus,
  queuedTracks = [],
  contextTracks = [],
  queueContextLabel = 'Current mix',
  onPlayQueuedTrack,
  onRemoveQueuedTrack,
  onMoveQueuedTrack,
  onClearQueue,
  onPlayRandom,
  shuffleEnabled = false,
  onToggleShuffle,
  repeatMode = 'off',
  onCycleRepeat,
  canOpenMiniPlayer = false,
  onOpenMiniPlayer
}) {
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [lastAudibleVolume, setLastAudibleVolume] = useState(volume || 0.8);
  const upNextCount = queuedTracks.length + contextTracks.length;

  useEffect(() => {
    if (!showQueue) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setShowQueue(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [showQueue]);

  if (!currentTrack) return null;

  const handleVolumeToggle = () => {
    if (volume > 0) {
      setLastAudibleVolume(volume);
      setVolume(0);
    } else {
      setVolume(lastAudibleVolume || 0.8);
    }
  };

  return (
    <div className="player-shell">
      <div className="player-track">
        <div className={`player-art ${isPlaying ? 'playing' : ''}`}>
          <img src={currentTrack.cover} alt={currentTrack.title} />
        </div>
        <div className="player-copy">
          <div className="player-title">{currentTrack.title}</div>
          <div className="player-artist">{currentTrack.artist}</div>
          {playbackError ? (
            <div className="player-error-row">
              <div className="player-status error">{playbackError}</div>
              <button className="player-retry" onClick={onRetryPlayback} type="button">
                Retry
              </button>
            </div>
          ) : isBuffering && isPlaying ? (
            <div className="player-status">Buffering audio…</div>
          ) : null}
        </div>
      </div>

      <div className="player-center">
        <div className="player-controls">
          <button
            className={`player-control ${shuffleEnabled ? 'active' : ''}`}
            onClick={onToggleShuffle}
            title={shuffleEnabled ? 'Turn shuffle off' : 'Shuffle this mix'}
            aria-pressed={shuffleEnabled}
          >
            <Shuffle size={14} />
          </button>
          <button className="player-control" onClick={onPrev} title="Previous track">
            <SkipBack size={17} />
          </button>
          <button className="player-play" onClick={onTogglePlay} title={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying
              ? <Pause size={19} fill="currentColor" />
              : <Play size={19} fill="currentColor" style={{ marginLeft: 2 }} />}
          </button>
          <button className="player-control" onClick={onNext} title="Next track">
            <SkipForward size={17} />
          </button>
          <button
            className={`player-control repeat-control ${repeatMode !== 'off' ? 'active' : ''}`}
            onClick={onCycleRepeat}
            title={`Repeat: ${repeatMode}`}
            aria-label={`Repeat mode: ${repeatMode}`}
          >
            <Repeat2 size={14} />
            {repeatMode === 'one' && <span className="repeat-one">1</span>}
          </button>
        </div>

        <div className="seek-row">
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={Math.min(currentTime || 0, duration || 100)}
            onChange={(event) => onSeek(Number.parseFloat(event.target.value))}
            aria-label="Track position"
          />
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="player-tools">
        <button
          className={`tool-button discord-share-tool ${discordShareStatus ? 'active' : ''}`}
          onClick={onShareToDiscord}
          title={discordShareStatus || 'Share this track to Discord'}
          aria-label="Share this track to Discord"
        >
          <MessageCircle size={17} />
        </button>
        {canOpenMiniPlayer && (
          <button
            className="tool-button mini-player-tool"
            onClick={onOpenMiniPlayer}
            title="Open floating mini player"
            aria-label="Open floating always-on-top mini player"
          >
            <PictureInPicture2 size={17} />
          </button>
        )}
        <div className="queue-tool-wrap">
          <button
            className={`tool-button queue-tool ${showQueue ? 'active' : ''}`}
            onClick={() => setShowQueue((visible) => !visible)}
            title="Open Up Next"
            aria-expanded={showQueue}
            aria-label={`Open Up Next, ${upNextCount} tracks`}
          >
            <ListMusic size={17} />
            {queuedTracks.length > 0 && (
              <span className="queue-count">{queuedTracks.length}</span>
            )}
          </button>

          {showQueue && (
            <section className="queue-panel" aria-label="Up Next queue">
              <div className="queue-panel-header">
                <div>
                  <div className="queue-eyebrow">Playback queue</div>
                  <h2>Up next</h2>
                </div>
                <div className="queue-header-actions">
                  {queuedTracks.length > 0 && (
                    <button className="queue-text-button" onClick={onClearQueue}>
                      Clear
                    </button>
                  )}
                  <button
                    className="queue-close"
                    onClick={() => setShowQueue(false)}
                    title="Close queue"
                    aria-label="Close queue"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="queue-now-playing">
                <img src={currentTrack.cover} alt="" />
                <div>
                  <span>Now playing</span>
                  <strong>{currentTrack.title}</strong>
                  <small>{currentTrack.artist}</small>
                </div>
              </div>

              <button className="queue-random" onClick={onPlayRandom}>
                <Sparkles size={14} />
                Surprise me from {queueContextLabel}
              </button>

              <div className="queue-scroll">
                {queuedTracks.length > 0 && (
                  <div className="queue-group">
                    <div className="queue-group-label">
                      <span>Manually queued</span>
                      <span>{queuedTracks.length}</span>
                    </div>
                    {queuedTracks.map((track, index) => (
                      <div className="queue-item" key={track.id}>
                        <button
                          className="queue-item-main"
                          onClick={() => onPlayQueuedTrack(track)}
                          title={`Play ${track.title} now`}
                        >
                          <span className="queue-position">{index + 1}</span>
                          <img src={track.cover} alt="" />
                          <span className="queue-item-copy">
                            <strong>{track.title}</strong>
                            <small>{track.artist} · {formatTime(track.duration)}</small>
                          </span>
                        </button>
                        <div className="queue-item-actions">
                          <button
                            onClick={() => onMoveQueuedTrack(track.id, -1)}
                            disabled={index === 0}
                            title="Move up"
                            aria-label={`Move ${track.title} up`}
                          >
                            <ChevronUp size={13} />
                          </button>
                          <button
                            onClick={() => onMoveQueuedTrack(track.id, 1)}
                            disabled={index === queuedTracks.length - 1}
                            title="Move down"
                            aria-label={`Move ${track.title} down`}
                          >
                            <ChevronDown size={13} />
                          </button>
                          <button
                            onClick={() => onRemoveQueuedTrack(track.id)}
                            title="Remove from queue"
                            aria-label={`Remove ${track.title} from queue`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="queue-group">
                  <div className="queue-group-label">
                    <span>{queueContextLabel}</span>
                    <span>Autoplay</span>
                  </div>
                  {contextTracks.length > 0 ? contextTracks.map((track) => (
                    <button
                      className="queue-item queue-context-item"
                      key={track.id}
                      onClick={() => onPlayQueuedTrack(track)}
                    >
                      <img src={track.cover} alt="" />
                      <span className="queue-item-copy">
                        <strong>{track.title}</strong>
                        <small>{track.artist} · {formatTime(track.duration)}</small>
                      </span>
                      <Play size={13} />
                    </button>
                  )) : (
                    <div className="queue-empty">
                      Add songs from any track card or use Surprise Me.
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
        <button
          className="tool-button lyrics-tool"
          onClick={onOpenLyrics}
          title="Synced lyrics"
        >
          <Mic2 size={16} />
        </button>
        <button className="tool-button" onClick={onOpenEqualizer} title="Equalizer">
          <SlidersHorizontal size={16} />
        </button>
        <div style={{ position: 'relative' }}>
          <button
            className={`tool-button sleep-tool ${sleepTimer ? 'active' : ''}`}
            onClick={() => setShowSleepMenu((visible) => !visible)}
            title="Sleep timer"
          >
            <Moon size={16} />
          </button>
          {showSleepMenu && (
            <div className="sleep-popover">
              <div className="sleep-popover-label">Stop playing after</div>
              {[null, 15, 30, 45, 60].map((minutes) => (
                <button
                  key={minutes || 'off'}
                  className={`sleep-option ${sleepTimer === minutes ? 'active' : ''}`}
                  onClick={() => {
                    setSleepTimer(minutes);
                    setShowSleepMenu(false);
                  }}
                >
                  {minutes === null ? 'Timer off' : `${minutes} minutes`}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="volume-group">
          <button className="tool-button" onClick={handleVolumeToggle} title={volume > 0 ? 'Mute' : 'Unmute'}>
            {volume > 0 ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <input
            className="volume-slider"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(event) => {
              const nextVolume = Number.parseFloat(event.target.value);
              if (nextVolume > 0) setLastAudibleVolume(nextVolume);
              setVolume(nextVolume);
            }}
            aria-label="Volume"
          />
        </div>
      </div>
      {discordShareStatus && (
        <div className="player-share-notice" role="status">{discordShareStatus}</div>
      )}
    </div>
  );
}
