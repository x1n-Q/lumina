import { useCallback, useEffect, useRef } from 'react';

const EQ_FREQUENCIES = [60, 230, 910, 3600, 14000];

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(Number(value) || 0, minimum), maximum);
}

export function useAudioEffects({
  audioRef,
  eqBands,
  bassBoost,
  audioNormalize
}) {
  const contextRef = useRef(null);
  const sourceRef = useRef(null);
  const filtersRef = useRef([]);
  const compressorRef = useRef(null);
  const preampRef = useRef(null);
  const settingsRef = useRef({ eqBands, bassBoost, audioNormalize });
  settingsRef.current = { eqBands, bassBoost, audioNormalize };

  const applySettings = useCallback(() => {
    const context = contextRef.current;
    if (!context) return;
    const settings = settingsRef.current;
    const bass = clamp(settings.bassBoost, 0, 15);
    const bassCurve = [bass, bass * 0.62, bass * 0.12, 0, 0];
    let highestBoost = 0;

    filtersRef.current.forEach((filter, index) => {
      const bandGain = clamp(settings.eqBands?.[index], -12, 12);
      const combinedGain = clamp(bandGain + bassCurve[index], -12, 18);
      highestBoost = Math.max(highestBoost, combinedGain);
      filter.gain.setTargetAtTime(combinedGain, context.currentTime, 0.015);
    });

    const compressor = compressorRef.current;
    if (compressor) {
      compressor.threshold.setTargetAtTime(
        settings.audioNormalize ? -20 : 0,
        context.currentTime,
        0.02
      );
      compressor.knee.setTargetAtTime(settings.audioNormalize ? 18 : 0, context.currentTime, 0.02);
      compressor.ratio.setTargetAtTime(settings.audioNormalize ? 3 : 1, context.currentTime, 0.02);
      compressor.attack.setTargetAtTime(0.01, context.currentTime, 0.02);
      compressor.release.setTargetAtTime(0.24, context.currentTime, 0.02);
    }

    // Positive EQ gain needs headroom so strong bass stays punchy without digital clipping.
    const preampGain = Math.pow(10, -highestBoost / 40);
    preampRef.current?.gain.setTargetAtTime(preampGain, context.currentTime, 0.02);
  }, []);

  const activateAudioEffects = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return false;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;

    if (!contextRef.current) {
      const context = new AudioContextClass();
      const source = context.createMediaElementSource(audio);
      const filters = EQ_FREQUENCIES.map((frequency, index) => {
        const filter = context.createBiquadFilter();
        filter.type = index === 0 ? 'lowshelf' : 'peaking';
        filter.frequency.value = frequency;
        filter.Q.value = index === 0 ? 0.7 : 0.9;
        return filter;
      });
      const compressor = context.createDynamicsCompressor();
      const preamp = context.createGain();

      source.connect(filters[0]);
      filters.forEach((filter, index) => {
        filter.connect(filters[index + 1] || compressor);
      });
      compressor.connect(preamp);
      preamp.connect(context.destination);

      contextRef.current = context;
      sourceRef.current = source;
      filtersRef.current = filters;
      compressorRef.current = compressor;
      preampRef.current = preamp;
      applySettings();
    }

    if (contextRef.current.state === 'suspended') {
      await contextRef.current.resume();
    }
    return true;
  }, [applySettings, audioRef]);

  useEffect(() => {
    applySettings();
  }, [applySettings, audioNormalize, bassBoost, eqBands]);

  useEffect(() => () => {
    const context = contextRef.current;
    contextRef.current = null;
    sourceRef.current = null;
    filtersRef.current = [];
    compressorRef.current = null;
    preampRef.current = null;
    context?.close().catch(() => {});
  }, []);

  return activateAudioEffects;
}
