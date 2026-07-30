const cover = document.getElementById('cover');
const title = document.getElementById('title');
const artist = document.getElementById('artist');
const playButton = document.getElementById('play');
const progress = document.getElementById('progress');

function updatePlayer(state = {}) {
  const track = state.track || {};
  title.textContent = track.title || 'Nothing playing';
  artist.textContent = track.artist || 'Open Lumina and choose a song';
  cover.src = track.cover || '';
  cover.hidden = !track.cover;

  const isPlaying = Boolean(state.isPlaying);
  playButton.textContent = isPlaying ? 'Ⅱ' : '▶';
  playButton.title = isPlaying ? 'Pause' : 'Play';
  playButton.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');

  const currentTime = Number(state.currentTime) || 0;
  const duration = Number(state.duration) || 0;
  const percentage = duration > 0
    ? Math.min(Math.max((currentTime / duration) * 100, 0), 100)
    : 0;
  progress.style.width = `${percentage}%`;
}

document.querySelectorAll('[data-command]').forEach((button) => {
  button.addEventListener('click', () => {
    const command = button.dataset.command;
    if (command === 'hide') {
      window.luminaDesktop.hideMiniPlayer();
      return;
    }
    if (command === 'show-main') {
      window.luminaDesktop.showMainWindow();
      return;
    }
    window.luminaDesktop.sendMiniPlayerCommand(command);
  });
});

window.luminaDesktop.onPlaybackState(updatePlayer);
