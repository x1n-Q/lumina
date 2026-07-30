import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import HomeView from './components/HomeView';
import SettingsView from './components/SettingsView';
import MusicPlayer from './components/MusicPlayer';
import EqualizerModal from './components/EqualizerModal';
import LyricsModal from './components/LyricsModal';

import { SAMPLE_TRACKS } from './data/sampleTracks';
import { fetchLyricsFromLRCLIB, parseLrc } from './services/lrclib';
import {
  downloadTrack,
  getDownloadedTracks,
  getEngineHealth,
  MUSIC_GENRES,
  removeDownloadedTrack,
  searchLiveMusic
} from './services/musicEngine';
import { usePersistentState } from './hooks/usePersistentState';

const DEFAULT_GENRE_ID = MUSIC_GENRES[0]?.id || '';
const MAX_RECENT_TRACKS = 24;
const MAX_QUEUED_TRACKS = 100;
const DISCOVERY_QUERIES = [
  'indie hidden gems music mix',
  'dreamy alternative music discovery',
  'late night electronic hidden gems',
  'feel good global music discoveries',
  'soulful acoustic new artists',
  'cinematic instrumental music discovery',
  'underrated r&b and neo soul mix',
  'modern jazz and chill fusion',
  'Japanese city pop hidden gems',
  'ambient focus music discovery',
  'alternative rock deep cuts',
  'fresh dance and electronic discoveries'
];
const DISCOVERY_MODIFIERS = [
  'deep cuts',
  'underrated artists',
  'listener favorites',
  'fresh finds',
  'album tracks',
  'new discoveries',
  'cult classics',
  'editor picks'
];
const INITIAL_ENGINE_HEALTH = {
  ok: false,
  status: 'checking',
  uptimeSeconds: 0,
  ytDlpVersion: null,
  cacheEntries: 0,
  savedTracks: 0,
  savedBytes: 0,
  searches: 0,
  streamRequests: 0,
  activeStreams: 0
};

function normalizeTrackCollection(value) {
  return Array.isArray(value) ? value.filter((track) => track?.id && track?.streamUrl) : [];
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getDailyDiscoveryKey(deviceSeed) {
  const date = new Date();
  const day = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
  return `${deviceSeed}:${day}`;
}

function buildDiscoveryQuery(deviceSeed, favorites, history) {
  const dailyKey = getDailyDiscoveryKey(deviceSeed);
  const listeningProfile = [...favorites, ...history];
  const artists = [...new Set(listeningProfile.map((track) => track.artist).filter(Boolean))];
  const genres = [...new Set(listeningProfile.map((track) => track.genre).filter(Boolean))];
  const modifier = DISCOVERY_MODIFIERS[
    hashString(`${dailyKey}:modifier`) % DISCOVERY_MODIFIERS.length
  ];

  if (artists.length > 0) {
    const artist = artists[hashString(`${dailyKey}:artist`) % artists.length];
    const genre = genres.length > 0
      ? genres[hashString(`${dailyKey}:genre`) % genres.length]
      : '';
    return `music similar to ${artist} ${genre} ${modifier}`.trim();
  }

  const base = DISCOVERY_QUERIES[
    hashString(`${dailyKey}:query`) % DISCOVERY_QUERIES.length
  ];
  return `${base} ${modifier}`;
}

function personalizeTrackOrder(tracks, discoveryKey) {
  if (!discoveryKey) return tracks;
  return [...tracks].sort((first, second) => (
    hashString(`${discoveryKey}:${first.id}`)
    - hashString(`${discoveryKey}:${second.id}`)
  ));
}

export default function App({ onLogout = null }) {
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const initialDiscoverySeed = useMemo(
    () => globalThis.crypto?.randomUUID?.()
      || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    []
  );
  const [discoverySeed] = usePersistentState(
    'lumina:discovery-seed',
    initialDiscoverySeed
  );
  const [accent, setAccent] = usePersistentState(
    'lumina:accent',
    'indigo',
    ['metrolist:accent']
  );
  const [oledMode, setOledMode] = usePersistentState(
    'lumina:oled',
    false,
    ['metrolist:oled']
  );
  const [activeGenre, setActiveGenre] = usePersistentState(
    'lumina:active-genre',
    DEFAULT_GENRE_ID,
    ['metrolist:active-genre']
  );

  const [tracks, setTracks] = useState(SAMPLE_TRACKS);
  const [isLoading, setIsLoading] = useState(false);
  const [searchMeta, setSearchMeta] = useState({
    source: 'Local starter mix',
    degraded: false,
    message: ''
  });
  const [engineHealth, setEngineHealth] = useState(INITIAL_ENGINE_HEALTH);
  const [likedTracks, setLikedTracks] = usePersistentState(
    'lumina:favorites',
    [],
    ['metrolist:favorites']
  );
  const [recentTracks, setRecentTracks] = usePersistentState(
    'lumina:history',
    [],
    ['metrolist:history']
  );
  const [downloadedTracks, setDownloadedTracks] = useState([]);
  const [downloadStates, setDownloadStates] = useState({});
  const [downloadNotice, setDownloadNotice] = useState(null);

  const [playingTrack, setPlayingTrack] = useState(null);
  const [playingQueue, setPlayingQueue] = useState([]);
  const [playingQueueIndex, setPlayingQueueIndex] = useState(0);
  const [queuedTracks, setQueuedTracks] = usePersistentState(
    'lumina:playback-queue',
    []
  );
  const [shuffleEnabled, setShuffleEnabled] = usePersistentState(
    'lumina:shuffle',
    false
  );
  const [repeatMode, setRepeatMode] = usePersistentState(
    'lumina:repeat',
    'off'
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = usePersistentState(
    'lumina:volume',
    0.8,
    ['metrolist:volume']
  );
  const [speed, setSpeed] = usePersistentState(
    'lumina:speed',
    1,
    ['metrolist:speed']
  );
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackError, setPlaybackError] = useState('');
  const [playbackAttempt, setPlaybackAttempt] = useState(0);

  const [isEqOpen, setIsEqOpen] = useState(false);
  const [eqBands, setEqBands] = usePersistentState(
    'lumina:eq-bands',
    [0, 0, 0, 0, 0],
    ['metrolist:eq-bands']
  );
  const [eqPreset, setEqPreset] = usePersistentState(
    'lumina:eq-preset',
    'Flat',
    ['metrolist:eq-preset']
  );
  const [audioNormalize, setAudioNormalize] = usePersistentState(
    'lumina:normalize',
    true,
    ['metrolist:normalize']
  );
  const [silenceSkip, setSilenceSkip] = usePersistentState(
    'lumina:silence-skip',
    false,
    ['metrolist:silence-skip']
  );

  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [lyricsData, setLyricsData] = useState([]);
  const [sleepTimer, setSleepTimer] = useState(null);
  const musicRequestRef = useRef(0);

  const audioRef = useRef(null);
  if (!audioRef.current) {
    audioRef.current = new Audio();
  }

  const favorites = useMemo(() => normalizeTrackCollection(likedTracks), [likedTracks]);
  const history = useMemo(() => normalizeTrackCollection(recentTracks), [recentTracks]);
  const manualQueue = useMemo(
    () => normalizeTrackCollection(queuedTracks).slice(0, MAX_QUEUED_TRACKS),
    [queuedTracks]
  );
  const likedSongIds = useMemo(() => favorites.map((track) => track.id), [favorites]);
  const queuedSongIds = useMemo(() => manualQueue.map((track) => track.id), [manualQueue]);
  const downloadedSongIds = useMemo(
    () => downloadedTracks.map((track) => track.id),
    [downloadedTracks]
  );
  const discoveryKey = getDailyDiscoveryKey(discoverySeed);
  const discoveryQuery = useMemo(
    () => buildDiscoveryQuery(discoverySeed, favorites, history),
    [discoverySeed, favorites, history]
  );

  const visibleTracks = useMemo(() => {
    if (activeTab === 'favorites') return favorites;
    if (activeTab === 'library') return history;
    if (activeTab === 'downloads') return downloadedTracks;
    return tracks;
  }, [activeTab, downloadedTracks, favorites, history, tracks]);

  const viewMode = ['favorites', 'library', 'downloads', 'explore'].includes(activeTab)
    ? activeTab
    : 'home';
  const contextUpNext = useMemo(() => {
    if (playingQueue.length < 2) return [];
    const remainingTracks = playingQueue.slice(playingQueueIndex + 1);
    const repeatingTracks = repeatMode === 'all'
      ? playingQueue.slice(0, playingQueueIndex)
      : [];
    return [...remainingTracks, ...repeatingTracks]
      .filter((track) => track.id !== playingTrack?.id && !queuedSongIds.includes(track.id))
      .slice(0, 6);
  }, [playingQueue, playingQueueIndex, playingTrack?.id, queuedSongIds, repeatMode]);
  const queueContextLabel = searchQuery.trim()
    ? `Search: “${searchQuery.trim()}”`
    : activeTab === 'home'
      ? 'Your Discover mix'
      : activeTab === 'explore'
        ? MUSIC_GENRES.find((genre) => genre.id === activeGenre)?.name || 'Explore'
        : activeTab === 'library'
          ? 'Recently played'
          : activeTab.charAt(0).toUpperCase() + activeTab.slice(1);

  const refreshDownloadedTracks = useCallback(async () => {
    try {
      const savedTracks = await getDownloadedTracks();
      setDownloadedTracks(normalizeTrackCollection(savedTracks));
    } catch {
      // The engine health indicator handles temporary backend outages.
    }
  }, []);

  const refreshEngineHealth = useCallback(async () => {
    try {
      const health = await getEngineHealth();
      setEngineHealth({ ...INITIAL_ENGINE_HEALTH, ...health });
    } catch {
      setEngineHealth((current) => ({
        ...current,
        ok: false,
        status: 'offline',
        activeStreams: 0
      }));
    }
  }, []);

  useEffect(() => {
    refreshEngineHealth();
    refreshDownloadedTracks();
    const interval = window.setInterval(refreshEngineHealth, 15000);
    window.addEventListener('online', refreshEngineHealth);
    window.addEventListener('focus', refreshEngineHealth);
    window.addEventListener('focus', refreshDownloadedTracks);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', refreshEngineHealth);
      window.removeEventListener('focus', refreshEngineHealth);
      window.removeEventListener('focus', refreshDownloadedTracks);
    };
  }, [refreshDownloadedTracks, refreshEngineHealth]);

  const loadMusicCategory = useCallback(async (query, trackOrderKey = '') => {
    const requestId = musicRequestRef.current + 1;
    musicRequestRef.current = requestId;
    setIsLoading(true);
    try {
      const result = await searchLiveMusic(query);
      if (requestId !== musicRequestRef.current) return;
      setTracks(personalizeTrackOrder(result.tracks, trackOrderKey));
      setSearchMeta({
        source: result.source,
        degraded: result.degraded,
        message: result.message
      });
    } finally {
      if (requestId === musicRequestRef.current) {
        setIsLoading(false);
        refreshEngineHealth();
      }
    }
  }, [refreshEngineHealth]);

  useEffect(() => {
    if (activeTab !== 'home') return undefined;
    const timer = window.setTimeout(
      () => loadMusicCategory(discoveryQuery, discoveryKey),
      0
    );
    return () => window.clearTimeout(timer);
  }, [
    activeTab,
    discoveryKey,
    discoveryQuery,
    loadMusicCategory
  ]);

  useEffect(() => {
    if (activeTab !== 'explore') return undefined;
    const genre = MUSIC_GENRES.find((item) => item.id === activeGenre) || MUSIC_GENRES[0];
    const typedQuery = searchQuery.trim();
    const query = typedQuery || genre?.query || 'music';
    const timer = window.setTimeout(
      () => loadMusicCategory(query),
      typedQuery ? 400 : 0
    );
    return () => window.clearTimeout(timer);
  }, [activeGenre, activeTab, loadMusicCategory, searchQuery]);

  const handleSearchQueryChange = (value) => {
    setSearchQuery(value);
    if (value.trim() && activeTab !== 'explore') {
      setActiveTab('explore');
    }
  };

  const handleSelectGenre = (genre) => {
    setActiveGenre(genre.id);
    setSearchQuery('');
    setActiveTab('explore');
  };

  const handleToggleLike = (track) => {
    setLikedTracks((currentValue) => {
      const current = normalizeTrackCollection(currentValue);
      return current.some((item) => item.id === track.id)
        ? current.filter((item) => item.id !== track.id)
        : [track, ...current];
    });
  };

  const handleToggleDownload = async (track) => {
    const isDownloaded = downloadedSongIds.includes(track.id);
    setDownloadStates((current) => ({
      ...current,
      [track.id]: isDownloaded ? 'removing' : 'downloading'
    }));
    setDownloadNotice(null);

    try {
      if (isDownloaded) {
        await removeDownloadedTrack(track);
        setDownloadedTracks((current) => current.filter((item) => item.id !== track.id));
        setDownloadNotice({ type: 'success', text: `Removed “${track.title}” from downloads.` });
      } else {
        const savedTrack = await downloadTrack(track);
        setDownloadedTracks((current) => [
          savedTrack,
          ...current.filter((item) => item.id !== savedTrack.id)
        ]);
        setDownloadNotice({
          type: 'success',
          text: `Saved “${track.title}” for local playback.`
        });
      }
      refreshEngineHealth();
    } catch (error) {
      setDownloadNotice({
        type: 'error',
        text: error.message || 'The track could not be saved.'
      });
    } finally {
      setDownloadStates((current) => {
        const next = { ...current };
        delete next[track.id];
        return next;
      });
    }
  };

  const recordRecentTrack = useCallback((track) => {
    setRecentTracks((currentValue) => {
      const current = normalizeTrackCollection(currentValue);
      return [
        track,
        ...current.filter((item) => item.id !== track.id)
      ].slice(0, MAX_RECENT_TRACKS);
    });
  }, [setRecentTracks]);

  const beginTrack = useCallback((track) => {
    if (!track) return;
    setPlaybackError('');
    setCurrentTime(0);
    setDuration(track.duration || 0);
    recordRecentTrack(track);

    if (playingTrack?.id === track.id) {
      audioRef.current.currentTime = 0;
    } else {
      setPlaybackAttempt(0);
      setPlayingTrack(track);
    }
    setIsPlaying(true);
  }, [playingTrack?.id, recordRecentTrack]);

  const handleSelectTrack = (track, sourceTracks = visibleTracks) => {
    const playableSource = normalizeTrackCollection(sourceTracks);
    const contextQueue = playableSource.length > 0 ? playableSource : tracks;
    const index = contextQueue.findIndex((item) => item.id === track.id);
    setPlayingQueue([...contextQueue]);
    setPlayingQueueIndex(index !== -1 ? index : 0);
    beginTrack(track);
  };

  const handleNextTrack = useCallback(() => {
    if (manualQueue.length > 0) {
      const nextTrack = manualQueue[0];
      setQueuedTracks((currentValue) => (
        normalizeTrackCollection(currentValue).filter((track) => track.id !== nextTrack.id)
      ));
      const contextIndex = playingQueue.findIndex((track) => track.id === nextTrack.id);
      if (contextIndex !== -1) setPlayingQueueIndex(contextIndex);
      beginTrack(nextTrack);
      return;
    }

    const contextQueue = playingQueue.length > 0 ? playingQueue : tracks;
    if (contextQueue.length === 0) return;

    let nextIndex;
    if (shuffleEnabled && contextQueue.length > 1) {
      const choices = contextQueue
        .map((track, index) => ({ track, index }))
        .filter(({ track }) => track.id !== playingTrack?.id);
      nextIndex = choices[Math.floor(Math.random() * choices.length)].index;
    } else if (playingQueueIndex + 1 < contextQueue.length) {
      nextIndex = playingQueueIndex + 1;
    } else if (repeatMode === 'all') {
      nextIndex = 0;
    } else {
      setIsPlaying(false);
      return;
    }

    setPlayingQueueIndex(nextIndex);
    beginTrack(contextQueue[nextIndex]);
  }, [
    beginTrack,
    manualQueue,
    playingQueue,
    playingQueueIndex,
    playingTrack?.id,
    repeatMode,
    setQueuedTracks,
    shuffleEnabled,
    tracks
  ]);

  const handlePrevTrack = useCallback(() => {
    const contextQueue = playingQueue.length > 0 ? playingQueue : tracks;
    if (contextQueue.length === 0) return;
    const previousIndex = (playingQueueIndex - 1 + contextQueue.length) % contextQueue.length;
    setPlayingQueueIndex(previousIndex);
    beginTrack(contextQueue[previousIndex]);
  }, [beginTrack, playingQueue, playingQueueIndex, tracks]);

  const handleQueueTrack = useCallback((track) => {
    if (!playingTrack) {
      setPlayingQueue([track]);
      setPlayingQueueIndex(0);
      beginTrack(track);
      return;
    }
    setQueuedTracks((currentValue) => [
      ...normalizeTrackCollection(currentValue).filter((item) => item.id !== track.id),
      track
    ].slice(0, MAX_QUEUED_TRACKS));
  }, [beginTrack, playingTrack, setQueuedTracks]);

  const handleRemoveQueuedTrack = useCallback((trackId) => {
    setQueuedTracks((currentValue) => (
      normalizeTrackCollection(currentValue).filter((track) => track.id !== trackId)
    ));
  }, [setQueuedTracks]);

  const handleMoveQueuedTrack = useCallback((trackId, direction) => {
    setQueuedTracks((currentValue) => {
      const nextQueue = normalizeTrackCollection(currentValue);
      const currentIndex = nextQueue.findIndex((track) => track.id === trackId);
      const nextIndex = currentIndex + direction;
      if (currentIndex === -1 || nextIndex < 0 || nextIndex >= nextQueue.length) {
        return nextQueue;
      }
      [nextQueue[currentIndex], nextQueue[nextIndex]] = [
        nextQueue[nextIndex],
        nextQueue[currentIndex]
      ];
      return [...nextQueue];
    });
  }, [setQueuedTracks]);

  const handlePlayQueuedTrack = useCallback((track) => {
    handleRemoveQueuedTrack(track.id);
    const contextIndex = playingQueue.findIndex((item) => item.id === track.id);
    if (contextIndex !== -1) setPlayingQueueIndex(contextIndex);
    beginTrack(track);
  }, [beginTrack, handleRemoveQueuedTrack, playingQueue]);

  const handlePlayRandom = useCallback((sourceTracks = visibleTracks) => {
    const candidates = normalizeTrackCollection(sourceTracks);
    if (candidates.length === 0) return;
    const alternatives = candidates.filter((track) => track.id !== playingTrack?.id);
    const randomPool = alternatives.length > 0 ? alternatives : candidates;
    const randomTrack = randomPool[Math.floor(Math.random() * randomPool.length)];
    setPlayingQueue([...candidates]);
    setPlayingQueueIndex(candidates.findIndex((track) => track.id === randomTrack.id));
    beginTrack(randomTrack);
  }, [beginTrack, playingTrack?.id, visibleTracks]);

  const handleCycleRepeat = () => {
    setRepeatMode((currentMode) => (
      currentMode === 'off' ? 'all' : currentMode === 'all' ? 'one' : 'off'
    ));
  };

  const handleTogglePlay = useCallback(() => {
    setPlaybackError('');
    setIsPlaying((currentlyPlaying) => !currentlyPlaying);
  }, []);

  const handleRetryPlayback = useCallback(() => {
    if (!playingTrack?.streamUrl) return;
    audioRef.current.pause();
    setPlaybackError('');
    setCurrentTime(0);
    setIsBuffering(true);
    setPlaybackAttempt((attempt) => attempt + 1);
    setIsPlaying(true);
  }, [playingTrack?.streamUrl]);

  const handleSeek = (time) => {
    if (!Number.isFinite(time)) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!playingTrack?.streamUrl) return;

    audio.pause();
    const shouldRefreshStream = playbackAttempt > 0 && Boolean(playingTrack.videoId);
    const separator = playingTrack.streamUrl.includes('?') ? '&' : '?';
    audio.src = shouldRefreshStream
      ? `${playingTrack.streamUrl}${separator}refresh=1&attempt=${playbackAttempt}`
      : playingTrack.streamUrl;
    audio.load();
    setCurrentTime(0);
    setDuration(playingTrack.duration || 0);
    setPlaybackError('');
    setIsBuffering(true);
  }, [playbackAttempt, playingTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!playingTrack?.streamUrl) return;

    if (!isPlaying) {
      audio.pause();
      return;
    }

    let cancelled = false;
    audio.play().catch((error) => {
      if (cancelled || error?.name === 'AbortError') return;
      console.error('Audio playback failed:', error);
      setPlaybackError('Unable to play this track. Check the audio engine or try another song.');
      setIsBuffering(false);
      setIsPlaying(false);
      refreshEngineHealth();
    });

    return () => {
      cancelled = true;
    };
  }, [isPlaying, playingTrack, refreshEngineHealth]);

  useEffect(() => {
    const audio = audioRef.current;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };
    const onCanPlay = () => {
      setIsBuffering(false);
      refreshEngineHealth();
    };
    const onWaiting = () => setIsBuffering(true);
    const onError = () => {
      setIsBuffering(false);
      setIsPlaying(false);
      setPlaybackError('The audio stream could not be loaded. Try the track again.');
      refreshEngineHealth();
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onDurationChange);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('playing', onCanPlay);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('stalled', onWaiting);
    audio.addEventListener('error', onError);
    const onEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        setCurrentTime(0);
        setIsPlaying(true);
        audio.play().catch(() => setIsPlaying(false));
        return;
      }
      handleNextTrack();
    };

    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onDurationChange);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('playing', onCanPlay);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('stalled', onWaiting);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('ended', onEnded);
    };
  }, [handleNextTrack, refreshEngineHealth, repeatMode]);

  useEffect(() => {
    const nextVolume = Number(volume);
    audioRef.current.volume = Number.isFinite(nextVolume)
      ? Math.min(Math.max(nextVolume, 0), 1)
      : 0.8;
  }, [volume]);

  useEffect(() => {
    const nextSpeed = Number(speed);
    audioRef.current.playbackRate = Number.isFinite(nextSpeed) ? nextSpeed : 1;
  }, [speed]);

  useEffect(() => {
    const desktop = window.luminaDesktop;
    if (!desktop?.sendPlaybackState) return;
    desktop.sendPlaybackState({
      track: playingTrack && {
        id: playingTrack.id,
        title: playingTrack.title,
        artist: playingTrack.artist,
        cover: playingTrack.cover
      },
      isPlaying,
      currentTime,
      duration
    });
  }, [currentTime, duration, isPlaying, playingTrack]);

  useEffect(() => {
    const desktop = window.luminaDesktop;
    if (!desktop?.onMiniPlayerCommand) return undefined;
    return desktop.onMiniPlayerCommand((command) => {
      if (command === 'previous') handlePrevTrack();
      if (command === 'toggle') handleTogglePlay();
      if (command === 'next') handleNextTrack();
    });
  }, [handleNextTrack, handlePrevTrack, handleTogglePlay]);

  useEffect(() => {
    if (!playingTrack) return;

    let cancelled = false;
    if (playingTrack.lyrics) {
      setLyricsData(parseLrc(playingTrack.lyrics));
    } else {
      setLyricsData([]);
      fetchLyricsFromLRCLIB(playingTrack.title, playingTrack.artist).then((result) => {
        if (!cancelled && result?.synced) {
          setLyricsData(result.synced);
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [playingTrack]);

  useEffect(() => {
    if (!sleepTimer) return;
    const timeout = window.setTimeout(() => {
      audioRef.current.pause();
      setIsPlaying(false);
      setSleepTimer(null);
      window.alert('Sleep timer completed. Playback paused.');
    }, sleepTimer * 60 * 1000);

    return () => window.clearTimeout(timeout);
  }, [sleepTimer]);

  useEffect(() => () => {
    const audio = audioRef.current;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }, []);

  return (
    <div
      className="app-container"
      data-accent={accent}
      data-theme={oledMode ? 'oled' : 'dark'}
      data-platform={window.luminaDesktop ? 'desktop' : 'web'}
    >
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenEqualizer={() => setIsEqOpen(true)}
        engineHealth={engineHealth}
        favoriteCount={favorites.length}
        historyCount={history.length}
        downloadCount={downloadedTracks.length}
      />

      <div className="main-wrapper">
        <Header
          searchQuery={searchQuery}
          setSearchQuery={handleSearchQueryChange}
          accent={accent}
          setAccent={setAccent}
          activeTab={activeTab}
          engineHealth={engineHealth}
        />

        <main className="content-area">
          {activeTab !== 'settings' && (
            <HomeView
              tracks={visibleTracks}
              currentTrack={playingTrack}
              isPlaying={isPlaying}
              onSelectTrack={handleSelectTrack}
              searchQuery={searchQuery}
              activeGenre={activeGenre}
              onSelectGenre={handleSelectGenre}
              isLoading={isLoading && activeTab === 'explore'}
              likedSongs={likedSongIds}
              onToggleLike={handleToggleLike}
              downloadedSongs={downloadedSongIds}
              downloadStates={downloadStates}
              downloadNotice={downloadNotice}
              onToggleDownload={handleToggleDownload}
              viewMode={viewMode}
              engineHealth={engineHealth}
              savedCount={favorites.length}
              recentCount={history.length}
              downloadCount={downloadedTracks.length}
              dataSource={searchMeta.source}
              notice={searchMeta.message}
              dashboardTracks={history}
              onOpenExplore={() => setActiveTab('explore')}
              queuedSongs={queuedSongIds}
              onQueueTrack={handleQueueTrack}
              onPlayRandom={handlePlayRandom}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              oledMode={oledMode}
              setOledMode={setOledMode}
              engineHealth={engineHealth}
              onLogout={onLogout}
            />
          )}
        </main>
      </div>

      <MusicPlayer
        currentTrack={playingTrack}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onNext={handleNextTrack}
        onPrev={handlePrevTrack}
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeek}
        volume={Number(volume) || 0}
        setVolume={setVolume}
        onOpenEqualizer={() => setIsEqOpen(true)}
        onOpenLyrics={() => setIsLyricsOpen(true)}
        sleepTimer={sleepTimer}
        setSleepTimer={setSleepTimer}
        isBuffering={isBuffering}
        playbackError={playbackError}
        onRetryPlayback={handleRetryPlayback}
        queuedTracks={manualQueue}
        contextTracks={contextUpNext}
        queueContextLabel={queueContextLabel}
        onPlayQueuedTrack={handlePlayQueuedTrack}
        onRemoveQueuedTrack={handleRemoveQueuedTrack}
        onMoveQueuedTrack={handleMoveQueuedTrack}
        onClearQueue={() => setQueuedTracks([])}
        onPlayRandom={() => handlePlayRandom(visibleTracks)}
        shuffleEnabled={Boolean(shuffleEnabled)}
        onToggleShuffle={() => setShuffleEnabled((enabled) => !enabled)}
        repeatMode={repeatMode}
        onCycleRepeat={handleCycleRepeat}
        canOpenMiniPlayer={Boolean(window.luminaDesktop?.openMiniPlayer)}
        onOpenMiniPlayer={() => window.luminaDesktop?.openMiniPlayer()}
      />

      <EqualizerModal
        isOpen={isEqOpen}
        onClose={() => setIsEqOpen(false)}
        eqBands={eqBands}
        setEqBands={setEqBands}
        eqPreset={eqPreset}
        setEqPreset={setEqPreset}
        speed={Number(speed) || 1}
        setSpeed={setSpeed}
        audioNormalize={audioNormalize}
        setAudioNormalize={setAudioNormalize}
        silenceSkip={silenceSkip}
        setSilenceSkip={setSilenceSkip}
      />

      <LyricsModal
        isOpen={isLyricsOpen}
        onClose={() => setIsLyricsOpen(false)}
        currentTrack={playingTrack}
        currentTime={currentTime}
        lyricsData={lyricsData}
      />
    </div>
  );
}
