import React from 'react';

export default function YouTubePlayer({ currentTrack, isPlaying, useFullYouTube }) {
  if (!currentTrack || !useFullYouTube || !isPlaying) return null;

  const searchQuery = encodeURIComponent(`${currentTrack.artist} ${currentTrack.title} official audio`);
  const iframeSrc = `https://www.youtube-nocookie.com/embed?listType=search&list=${searchQuery}&autoplay=1`;

  return (
    <div style={{ position: 'fixed', bottom: -100, right: -100, opacity: 0, pointerEvents: 'none' }}>
      <iframe
        width="1"
        height="1"
        src={iframeSrc}
        title="YouTube Audio Player"
        allow="autoplay"
        frameBorder="0"
      />
    </div>
  );
}
