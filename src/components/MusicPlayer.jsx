import React, { useState } from 'react';
import {
  Mic2,
  Moon,
  Pause,
  Play,
  Repeat2,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Volume2,
  VolumeX
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
  playbackError
}) {
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [lastAudibleVolume, setLastAudibleVolume] = useState(volume || 0.8);

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
          {(playbackError || (isBuffering && isPlaying)) && (
            <div className={`player-status ${playbackError ? 'error' : ''}`}>
              {playbackError || 'Buffering audio…'}
            </div>
          )}
        </div>
      </div>

      <div className="player-center">
        <div className="player-controls">
          <button className="player-control" title="Shuffle">
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
          <button className="player-control" title="Repeat">
            <Repeat2 size={14} />
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
    </div>
  );
}
