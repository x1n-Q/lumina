import React, { useEffect, useRef } from 'react';
import { Play } from 'lucide-react';

let iframeApiPromise = null;

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (iframeApiPromise) return iframeApiPromise;

  iframeApiPromise = new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      resolve(window.YT);
    };
    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (existing) return;
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => reject(new Error('The YouTube player could not be loaded.'));
    document.head.appendChild(script);
  });
  return iframeApiPromise;
}

export default function YouTubePlayerSurface({
  track,
  isPlaying,
  volume,
  speed,
  onController,
  onPlaying,
  onPaused,
  onBuffering,
  onEnded,
  onError,
  onProgress
}) {
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const initialVideoIdRef = useRef(track.videoId);
  const callbacksRef = useRef({});
  const playbackRef = useRef({});
  callbacksRef.current = {
    onController,
    onPlaying,
    onPaused,
    onBuffering,
    onEnded,
    onError,
    onProgress
  };
  playbackRef.current = { isPlaying, volume, speed };

  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !hostRef.current || playerRef.current) return;
      playerRef.current = new YT.Player(hostRef.current, {
        width: '100%',
        height: '100%',
        videoId: initialVideoIdRef.current,
        playerVars: {
          playsinline: 1,
          rel: 0,
          origin: window.location.origin
        },
        events: {
          onReady: (event) => {
            callbacksRef.current.onController?.(event.target);
            event.target.setVolume(
              Math.round((Number(playbackRef.current.volume) || 0) * 100)
            );
            event.target.setPlaybackRate(Number(playbackRef.current.speed) || 1);
            if (playbackRef.current.isPlaying) event.target.playVideo();
          },
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.PLAYING) callbacksRef.current.onPlaying?.();
            if (event.data === YT.PlayerState.PAUSED) callbacksRef.current.onPaused?.();
            if (event.data === YT.PlayerState.BUFFERING) callbacksRef.current.onBuffering?.();
            if (event.data === YT.PlayerState.ENDED) callbacksRef.current.onEnded?.();
          },
          onAutoplayBlocked: () => callbacksRef.current.onPaused?.(),
          onError: () => callbacksRef.current.onError?.()
        }
      });
    }).catch(() => callbacksRef.current.onError?.());

    return () => {
      cancelled = true;
      callbacksRef.current.onController?.(null);
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!player?.loadVideoById) return;
    player.loadVideoById({ videoId: track.videoId, startSeconds: 0 });
  }, [track.videoId]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    if (isPlaying) player.playVideo?.();
    else player.pauseVideo?.();
  }, [isPlaying]);

  useEffect(() => {
    playerRef.current?.setVolume?.(Math.round(Math.min(1, Math.max(0, Number(volume) || 0)) * 100));
  }, [volume]);

  useEffect(() => {
    playerRef.current?.setPlaybackRate?.(Number(speed) || 1);
  }, [speed]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const player = playerRef.current;
      if (!player?.getCurrentTime) return;
      callbacksRef.current.onProgress?.({
        currentTime: Number(player.getCurrentTime()) || 0,
        duration: Number(player.getDuration?.()) || Number(track.duration) || 0
      });
    }, 500);
    return () => window.clearInterval(interval);
  }, [track.duration]);

  return (
    <section className="youtube-player-surface" aria-label="Full YouTube player">
      <div className="youtube-player-heading">
        <span><Play size={15} fill="currentColor" /> Complete song</span>
        <strong>{track.title}</strong>
      </div>
      <div className="youtube-player-frame" ref={hostRef} />
    </section>
  );
}
