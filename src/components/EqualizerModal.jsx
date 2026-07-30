import React from 'react';
import { X, Sliders, Volume2, Gauge, Zap } from 'lucide-react';

export default function EqualizerModal({
  isOpen,
  onClose,
  eqBands,
  setEqBands,
  eqPreset,
  setEqPreset,
  bassBoost,
  setBassBoost,
  speed,
  setSpeed,
  audioNormalize,
  setAudioNormalize,
  silenceSkip,
  setSilenceSkip
}) {
  if (!isOpen) return null;

  const presets = {
    Flat: { bands: [0, 0, 0, 0, 0], bass: 0 },
    'Bass Boost': { bands: [2, 1, 0, 0, 0], bass: 6 },
    'Deep Bass': { bands: [3, 2, -1, 0, 1], bass: 10 },
    'Extreme Bass': { bands: [4, 3, -2, 0, 2], bass: 15 },
    Acoustic: { bands: [3, 2, 4, 3, 2], bass: 0 },
    'Vocal Boost': { bands: [-1, 1, 5, 4, 1], bass: 0 },
    Rock: { bands: [5, 3, -1, 3, 5], bass: 2 },
    Electronic: { bands: [4, 3, 0, 2, 4], bass: 4 },
  };

  const handlePresetSelect = (name) => {
    setEqPreset(name);
    setEqBands(presets[name].bands);
    setBassBoost(presets[name].bass);
  };

  const handleBandChange = (index, value) => {
    const newBands = [...eqBands];
    newBands[index] = parseFloat(value);
    setEqBands(newBands);
    setEqPreset('Custom');
  };

  const bandLabels = ['60 Hz', '230 Hz', '910 Hz', '3.6 kHz', '14 kHz'];
  const bandNames = ['Sub Bass', 'Bass', 'Mids', 'Upper Mid', 'Treble'];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div className="glass-card" style={{
        width: '540px',
        padding: '24px',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-surface)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sliders size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Audio Equalizer & FX</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* EQ Presets */}
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Presets</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
            {Object.keys(presets).map((p) => (
              <button
                key={p}
                onClick={() => handlePresetSelect(p)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border-subtle)',
                  background: eqPreset === p ? 'var(--primary)' : 'var(--bg-base)',
                  color: eqPreset === p ? '#050608' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: eqPreset === p ? '600' : '400',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(124, 92, 255, 0.14), var(--bg-base))',
          padding: '14px 16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(124, 92, 255, 0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700' }}>Bass strength</div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                Real low-frequency boost with automatic clipping headroom
              </div>
            </div>
            <strong style={{ color: 'var(--primary)', fontSize: '14px' }}>+{bassBoost} dB</strong>
          </div>
          <input
            aria-label="Bass boost strength"
            type="range"
            min="0"
            max="15"
            step="1"
            value={bassBoost}
            onChange={(event) => {
              setBassBoost(Number.parseInt(event.target.value, 10));
              setEqPreset('Custom');
            }}
            style={{ width: '100%' }}
          />
          {bassBoost >= 13 && (
            <div style={{ color: '#ffb84d', fontSize: '10px', marginTop: '7px' }}>
              Extreme boost can overwhelm small speakers. Lower it if you hear distortion.
            </div>
          )}
        </div>

        {/* 5 Sliders */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '180px',
          background: 'var(--bg-base)',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          {eqBands.map((val, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600' }}>
                {val > 0 ? `+${val}` : val} dB
              </span>
              <input
                type="range"
                min="-12"
                max="12"
                step="0.5"
                value={val}
                onChange={(e) => handleBandChange(idx, e.target.value)}
                style={{
                  writingMode: 'bt-lr',
                  WebkitAppearance: 'slider-vertical',
                  width: '8px',
                  height: '100px',
                }}
              />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: '600' }}>{bandLabels[idx]}</div>
                <div style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>{bandNames[idx]}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Audio Modifiers (Speed, Normalization, Silence Skip) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* Speed & Pitch */}
          <div style={{ background: 'var(--bg-base)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                <Gauge size={14} /> Tempo & Speed
              </span>
              <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '600' }}>{speed}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.05"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Lumina playback toggles */}
          <div style={{ background: 'var(--bg-base)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', cursor: 'pointer' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                <Volume2 size={14} /> Audio Normalization
              </span>
              <input
                type="checkbox"
                checked={audioNormalize}
                onChange={(e) => setAudioNormalize(e.target.checked)}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', cursor: 'pointer' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                <Zap size={14} /> Skip Silence
              </span>
              <input
                type="checkbox"
                checked={silenceSkip}
                onChange={(e) => setSilenceSkip(e.target.checked)}
              />
            </label>
          </div>
        </div>

        <button className="btn btn-primary" onClick={onClose} style={{ width: '100%', padding: '10px' }}>
          Apply & Save Equalizer Settings
        </button>
      </div>
    </div>
  );
}
