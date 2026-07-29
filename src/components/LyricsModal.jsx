import React, { useEffect, useRef } from 'react';
import { X, Mic2, Sparkles } from 'lucide-react';

export default function LyricsModal({ isOpen, onClose, currentTrack, currentTime, lyricsData }) {
  const activeLineRef = useRef(null);

  const activeIndex = (isOpen && currentTrack ? lyricsData : []).findIndex((line, i) => {
    const nextLine = lyricsData[i + 1];
    if (nextLine) {
      return currentTime >= line.time && currentTime < nextLine.time;
    }
    return currentTime >= line.time;
  });

  useEffect(() => {
    if (isOpen && activeLineRef.current) {
      activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeIndex, isOpen]);

  if (!isOpen || !currentTrack) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(5, 6, 8, 0.92)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 900,
      padding: '32px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '8px', borderRadius: '50%', background: 'var(--primary-container)', color: 'var(--primary)' }}>
            <Mic2 size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '700' }}>{currentTrack.title}</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{currentTrack.artist} • <span style={{ color: 'var(--primary)' }}>Live LRCLIB Synced Lyrics</span></p>
          </div>
        </div>
        <button onClick={onClose} className="btn btn-secondary btn-icon">
          <X size={20} />
        </button>
      </div>

      {/* Lyrics Scroll Container */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        padding: '60px 20px',
        textAlign: 'center'
      }}>
        {lyricsData && lyricsData.length > 0 ? (
          lyricsData.map((line, idx) => {
            const isActive = idx === activeIndex;
            return (
              <p
                key={idx}
                ref={isActive ? activeLineRef : null}
                style={{
                  fontSize: isActive ? '28px' : '20px',
                  fontWeight: isActive ? '700' : '400',
                  color: isActive ? 'var(--primary)' : 'var(--text-tertiary)',
                  opacity: isActive ? 1 : 0.4,
                  transform: isActive ? 'scale(1.06)' : 'scale(1)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  textShadow: isActive ? '0 0 20px var(--primary-glow)' : 'none',
                  cursor: 'pointer',
                  maxWidth: '700px'
                }}
              >
                {line.text}
              </p>
            );
          })
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '100px', color: 'var(--text-tertiary)' }}>
            <Sparkles size={32} color="var(--primary)" />
            <p style={{ fontSize: '16px' }}>Searching LRCLIB for synchronized lyrics...</p>
          </div>
        )}
      </div>
    </div>
  );
}
