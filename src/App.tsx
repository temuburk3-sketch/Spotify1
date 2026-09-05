import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Header } from './components/Header';
import { BottomNavBar } from './components/Navigation/BottomNavBar';
import { PlaylistDetail } from './components/Playlist/PlaylistDetail';
import { SearchView } from './components/Search/SearchView';
import { RecommendationsView } from './components/Recommendations/RecommendationsView';
import { PlayerBar } from './components/Player/PlayerBar';
import { FullPlayerModal } from './components/Player/FullPlayerModal';
import { CoverStudioModal } from './components/Playlist/CoverStudioModal';
import { CollaborativeRoomModal } from './components/Playlist/CollaborativeRoomModal';
import { SpotifyImportModal } from './components/Playlist/SpotifyImportModal';
import { LocalFileImportModal } from './components/Playlist/LocalFileImportModal';
import { EqualizerModal } from './components/Playlist/EqualizerModal';
import { OfflineManagerModal } from './components/Playlist/OfflineManagerModal';
import { FolderManagerModal } from './components/Playlist/FolderManagerModal';
import { AutoExpandPlaylistModal } from './components/Playlist/AutoExpandPlaylistModal';
import { PlaylistMixerModal } from './components/Playlist/PlaylistMixerModal';
import { PrivateModeModal } from './components/Settings/PrivateModeModal';
import { PinLockScreen } from './components/Settings/PinLockScreen';
import { QueueDrawer } from './components/Queue/QueueDrawer';
import { JoinRoomModal } from './components/Playlist/JoinRoomModal';
import { InstallModal } from './components/InstallModal';
import { LyricsView } from './components/Lyrics/LyricsView';
import { TVLyricsStageModal } from './components/Player/TVLyricsStageModal';
import { prefetchLyricsForTrack } from './services/lyricsService';
import { usePWAInstall } from './hooks/usePWAInstall';

import {
  Playlist,
  Track,
  RepeatMode,
  ShuffleMode,
  AudioSettings,
  PlaylistFolder
} from './types';
import { DEFAULT_PLAYLISTS } from './data/defaultPlaylists';
import { audioEngine } from './services/audioEngine';
import {
  savePlaylistsToDB,
  loadPlaylistsFromDB,
  saveFoldersToDB,
  loadFoldersFromDB,
  getInitialPlaylistsSync,
  getInitialFoldersSync,
  cacheTrackAudio,
  clearOfflineCacheAndResetPlaylists,
  getCachedAudioStats,
  DEFAULT_FOLDERS
} from './services/storage';
import {
  recordListeningEvent,
  isAppLocked,
  getEndlessAutoplay,
  selectSmartThematicNextTrack,
  detectTrackTheme,
  getSmartShuffleEnabled,
  setSmartShuffleEnabled,
  fetchThematicSongRadio,
  getSpotifySmartShuffleTrack,
  getBalancedShuffleQueue
} from './services/recommendationService';
import { collabManager } from './services/collaboration';
import {
  FolderOpen,
  Plus,
  Sparkles,
  Music,
  Check,
  Zap,
  Star,
  Users,
  HardDrive,
  Sliders,
  ChevronRight,
  Disc,
  Shuffle
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function App() {
  // Playlists, Folders & Navigation (Synchronous cache first for 0-flicker instant restore)
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    const sync = getInitialPlaylistsSync();
    return sync && sync.length > 0 ? sync : DEFAULT_PLAYLISTS;
  });
  const [folders, setFolders] = useState<PlaylistFolder[]>(() => {
    const sync = getInitialFoldersSync();
    return sync && sync.length > 0 ? sync : DEFAULT_FOLDERS;
  });
  const [activeFolderId, setActiveFolderId] = useState<string>('all');
  const [activePlaylistId, setActivePlaylistId] = useState<string>(() => {
    const sync = getInitialPlaylistsSync();
    return sync && sync.length > 0 ? sync[0].id : DEFAULT_PLAYLISTS[0].id;
  });
  const [activeView, setActiveView] = useState<'playlist' | 'search' | 'recommendations' | 'queue' | 'lyrics'>('playlist');

  // Lock State
  const [isLocked, setIsLocked] = useState<boolean>(isAppLocked());

  // Playback State
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [shuffleMode, setShuffleMode] = useState<ShuffleMode>(() => getSmartShuffleEnabled() ? 'smart' : 'off');
  const [isRadioActive, setIsRadioActive] = useState<boolean>(false);
  const [radioThemeName, setRadioThemeName] = useState<string>('');
  const [playedTrackIds, setPlayedTrackIds] = useState<Set<string>>(new Set());
  const [queue, setQueue] = useState<Track[]>([]);
  const [playbackContext, setPlaybackContext] = useState<{
    type: 'playlist' | 'search' | 'recommendations' | 'radio' | 'custom';
    title?: string;
    tracks: Track[];
  }>({
    type: 'playlist',
    title: 'Çalma Listesi',
    tracks: []
  });
  const [isABActive, setIsABActive] = useState<boolean>(false);
  const [sleepTimerMins, setSleepTimerMins] = useState<number | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [downloadedCount, setDownloadedCount] = useState<number>(0);

  // Audio Settings
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    volume: 0.85,
    muted: false,
    playbackRate: 1.0,
    crossfade: 0,
    eqPreset: 'flat',
    eq10Bands: { b32: 0, b64: 0, b125: 0, b250: 0, b500: 0, b1k: 0, b2k: 0, b4k: 0, b8k: 0, b16k: 0 },
    eqBands: { bass: 0, midLow: 0, mid: 0, midHigh: 0, treble: 0 },
    bassBoost: false,
    subBassBoost: false,
    spatialAudio: false,
    spatial8DSpeed: 0.5,
    vocalRemover: false,
    volumeNormalization: false,
    highQualityAudio: true,
    slowedReverb: false,
    batterySaverMode: false,
    keepScreenAwake: false
  });

  // PWA Install State
  const { isInstalled, hasNativePrompt, promptInstall } = usePWAInstall();
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // Modals & Drawers
  const [isCoverStudioOpen, setIsCoverStudioOpen] = useState(false);
  const [isCollaborativeModalOpen, setIsCollaborativeModalOpen] = useState(false);
  const [isSpotifyImportOpen, setIsSpotifyImportOpen] = useState(false);
  const [isLocalImportOpen, setIsLocalImportOpen] = useState(false);
  const [isEqualizerOpen, setIsEqualizerOpen] = useState(false);
  const [isOfflineManagerOpen, setIsOfflineManagerOpen] = useState(false);
  const [isFolderManagerOpen, setIsFolderManagerOpen] = useState(false);
  const [isAutoExpandOpen, setIsAutoExpandOpen] = useState(false);
  const [isMixerOpen, setIsMixerOpen] = useState(false);
  const [isPrivateModeOpen, setIsPrivateModeOpen] = useState(false);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isJoinRoomOpen, setIsJoinRoomOpen] = useState(false);
  const [isTVStageOpen, setIsTVStageOpen] = useState(false);

  // Detect ?tv=stage param for second screen or smart TV browsers
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('tv') === 'stage') {
          setIsTVStageOpen(true);
        }
      } catch {}
    }
  }, []);

  // Toast Notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  // Load playlists & folders on initial mount with double-layer check
  useEffect(() => {
    let isMounted = true;
    const initData = async () => {
      try {
        const [storedFolders, storedPlaylists, stats] = await Promise.all([
          loadFoldersFromDB(),
          loadPlaylistsFromDB(),
          getCachedAudioStats()
        ]);

        if (!isMounted) return;

        if (storedFolders && storedFolders.length > 0) {
          setFolders(storedFolders);
        }

        if (storedPlaylists && storedPlaylists.length > 0) {
          setPlaylists(storedPlaylists);
          setActivePlaylistId(prev => {
            if (storedPlaylists.some(p => p.id === prev)) {
              return prev;
            }
            return storedPlaylists[0].id;
          });
        }

        setDownloadedCount(stats.count);
      } catch (err) {
        console.error('Initialization data error:', err);
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }
    };
    initData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync playlists changes to DB (only after initial load is confirmed or on explicit updates)
  useEffect(() => {
    if (isHydrated && playlists.length > 0) {
      savePlaylistsToDB(playlists);
    }
  }, [playlists, isHydrated]);

  // Sync folders changes to DB
  useEffect(() => {
    if (isHydrated && folders.length > 0) {
      saveFoldersToDB(folders);
    }
  }, [folders, isHydrated]);

  // Listen to collaboration events
  useEffect(() => {
    const unsubscribe = collabManager.subscribe((event) => {
      if (event.playlistId === activePlaylistId) {
        if (event.type === 'track_added') {
          setPlaylists(prev => prev.map(p => {
            if (p.id === event.playlistId) {
              return { ...p, tracks: [...p.tracks, event.data.track] };
            }
            return p;
          }));
          showToast(`👥 ${event.userName} bir şarkı ekledi: "${event.data.track.title}"`);
        }
      }
    });
    return () => unsubscribe();
  }, [activePlaylistId]);

  // Setup Web Audio listeners
  const handlersRef = useRef<any>({});

  useEffect(() => {
    audioEngine.setCallbacks({
      onPlayStateChange: (playing) => {
        setIsPlaying(playing);
      },
      onTimeUpdate: (cur, dur) => {
        setCurrentTime(cur);
        setDuration(dur);
      },
      onEnded: () => {
        if (repeatMode === 'one') {
          audioEngine.seek(0);
          audioEngine.resume();
        } else {
          handlersRef.current.handleNextTrack?.();
        }
      },
      onError: (err) => {
        console.warn('Audio Engine Event:', err);
      }
    });

    // Explicitly bind system MediaSession lock screen actions (Next, Prev, Play, Pause, Seek)
    audioEngine.setMediaSessionActionHandlers({
      onPlay: () => handlersRef.current.handleTogglePlay?.(),
      onPause: () => handlersRef.current.handleTogglePlay?.(),
      onNext: () => handlersRef.current.handleNextTrack?.(),
      onPrev: () => handlersRef.current.handlePrevTrack?.(),
      onSeek: (to: number) => handlersRef.current.handleSeek?.(to)
    });
  }, [repeatMode]);

  // Sleep timer interval
  useEffect(() => {
    if (!sleepTimerMins) return;
    const interval = setInterval(() => {
      setSleepTimerMins((prev) => {
        if (prev === null || prev <= 1) {
          audioEngine.pause();
          setIsPlaying(false);
          showToast('🌙 Uyku zamanlayıcısı: Müzik durduruldu');
          return null;
        }
        return prev - 1;
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [sleepTimerMins]);

  // Playback Control Handlers
  const handlePlayTrack = (track: Track, contextTracks?: Track[], contextName?: string) => {
    if (!track) return;
    prefetchLyricsForTrack(track);
    setCurrentTrack(track);
    setIsPlaying(true);
    setPlayedTrackIds(prev => new Set(prev).add(track.id));

    if (contextTracks && contextTracks.length > 0) {
      setPlaybackContext({
        type: 'playlist',
        title: contextName || 'Çalma Listesi',
        tracks: contextTracks
      });
    }

    recordListeningEvent(track, 0, false);
    audioEngine.playTrack(track);
  };

  const handleTogglePlay = () => {
    if (!currentTrack) {
      const activeList = playlists.find(p => p.id === activePlaylistId) || playlists[0];
      if (activeList && activeList.tracks.length > 0) {
        handlePlayTrack(activeList.tracks[0], activeList.tracks, activeList.name);
      }
      return;
    }

    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      audioEngine.resume();
      setIsPlaying(true);
    }
  };

  const handleNextTrack = async () => {
    if (queue.length > 0) {
      const nextTrack = queue[0];
      setQueue(prev => prev.slice(1));
      handlePlayTrack(nextTrack, playbackContext.tracks.length > 0 ? playbackContext.tracks : [nextTrack], playbackContext.title);

      // If running low on radio queue, prefetch next batch of similar songs seamlessly
      if (isRadioActive && queue.length <= 2 && nextTrack) {
        fetchThematicSongRadio(nextTrack, 10, Array.from(playedTrackIds))
          .then(res => {
            if (res && Array.isArray(res.tracks)) {
              const newTracks = res.tracks.filter(t => !playedTrackIds.has(t.id) && t.id !== nextTrack.id);
              if (newTracks.length > 0) {
                setQueue(prev => [...prev, ...newTracks]);
              }
            }
          })
          .catch(() => {});
      }
      return;
    }

    const currentList = playbackContext.tracks.length > 0
      ? playbackContext.tracks
      : (playlists.find(p => p.id === activePlaylistId)?.tracks || []);

    if (currentList.length === 0 && !currentTrack) return;

    if (shuffleMode === 'smart' && currentTrack) {
      // Spotify Smart Shuffle Mode: Mix playlist tracks acoustically & inject matching discoveries
      const shouldInjectDiscovery = Math.random() < 0.35;
      if (shouldInjectDiscovery) {
        try {
          const smartDiscovery = await getSpotifySmartShuffleTrack(currentTrack, currentList, playedTrackIds);
          if (smartDiscovery) {
            handlePlayTrack(smartDiscovery, [...currentList, smartDiscovery], playbackContext.title);
            showToast(`✨ Akıllı Karışık: "${smartDiscovery.title}" (${smartDiscovery.artist})`);
            return;
          }
        } catch {}
      }

      // Thematic seamless next song within playlist
      const nextThematic = selectSmartThematicNextTrack(currentTrack, currentList, playedTrackIds);
      if (nextThematic) {
        handlePlayTrack(nextThematic, currentList, playbackContext.title);
        return;
      }
    } else if (shuffleMode === 'random' && currentList.length > 0) {
      // Balanced dispersion shuffle (prevents same artist clumping)
      const remaining = currentList.filter(t => !playedTrackIds.has(t.id));
      const pool = remaining.length > 0 ? remaining : currentList;
      const balancedPool = getBalancedShuffleQueue(pool, currentTrack?.id);
      const next = balancedPool[0] || pool[Math.floor(Math.random() * pool.length)];
      if (next) {
        handlePlayTrack(next, currentList, playbackContext.title);
        return;
      }
    }

    const currentIdx = currentList.findIndex(t => t.id === currentTrack?.id);
    if (currentIdx !== -1 && currentIdx < currentList.length - 1) {
      handlePlayTrack(currentList[currentIdx + 1], currentList, playbackContext.title);
    } else if (repeatMode === 'all' && currentList.length > 0) {
      handlePlayTrack(currentList[0], currentList, playbackContext.title);
    } else if ((isRadioActive || getEndlessAutoplay()) && currentTrack) {
      // Endless Radio / Autoplay mode: Find next matching song from current theme/genre
      const allAppTracks = playlists.flatMap(p => p.tracks);
      const autoNext = selectSmartThematicNextTrack(currentTrack, allAppTracks, playedTrackIds);
      if (autoNext) {
        handlePlayTrack(autoNext, allAppTracks, `📻 ${radioThemeName || 'Şarkı'} Radyosu`);
        showToast(`✨ Radyo Akışı: "${autoNext.title}" - ${autoNext.artist}`);
      } else {
        // Fetch fresh radio recommendations on the fly
        fetchThematicSongRadio(currentTrack, 8, Array.from(playedTrackIds))
          .then(res => {
            if (res && res.tracks && res.tracks.length > 0) {
              const [first, ...rest] = res.tracks;
              setQueue(rest);
              handlePlayTrack(first, res.tracks, res.radioTitle);
              showToast(`📻 Radyo Akışı: "${first.title}" - ${first.artist}`);
            }
          })
          .catch(() => {});
      }
    }
  };

  const handlePrevTrack = () => {
    if (currentTime > 4) {
      audioEngine.seek(0);
      return;
    }

    const currentList = playbackContext.tracks.length > 0
      ? playbackContext.tracks
      : (playlists.find(p => p.id === activePlaylistId)?.tracks || []);

    if (currentList.length === 0) return;

    const currentIdx = currentList.findIndex(t => t.id === currentTrack?.id);
    if (currentIdx > 0) {
      handlePlayTrack(currentList[currentIdx - 1]);
    } else {
      audioEngine.seek(0);
    }
  };

  const handleSeek = (time: number) => {
    audioEngine.seek(time);
    setCurrentTime(time);
  };

  const handleToggleRepeat = () => {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const nextIdx = (modes.indexOf(repeatMode) + 1) % modes.length;
    setRepeatMode(modes[nextIdx]);
  };

  const handleToggleShuffle = () => {
    if (shuffleMode === 'off') {
      setShuffleMode('smart');
      setSmartShuffleEnabled(true);
      showToast('✨ Akıllı Tematik Karışık Çalma Açıldı');
    } else if (shuffleMode === 'smart') {
      setShuffleMode('random');
      setSmartShuffleEnabled(false);
      showToast('🔀 Standart Karışık Çalma Açıldı');
    } else {
      setShuffleMode('off');
      setSmartShuffleEnabled(false);
      showToast('Sıralı Çalma Modu');
    }
  };

  const handleToggleABLoop = () => {
    if (!isABActive) {
      const a = Math.max(0, currentTime - 5);
      const b = Math.min(duration, currentTime + 15);
      audioEngine.setABLoop(a, b, true);
      setIsABActive(true);
      showToast(`🔁 A-B Döngüsü Aktif (${Math.round(a)}s - ${Math.round(b)}s)`);
    } else {
      audioEngine.setABLoop(null, null, false);
      setIsABActive(false);
      showToast('A-B Döngüsü Kapatıldı');
    }
  };

  const handleChangeVolume = (vol: number) => {
    setAudioSettings(prev => ({ ...prev, volume: vol, muted: false }));
    audioEngine.setVolume(vol);
  };

  const handleToggleMute = () => {
    const willMute = !audioSettings.muted;
    setAudioSettings(prev => ({ ...prev, muted: willMute }));
    audioEngine.setVolume(willMute ? 0 : audioSettings.volume);
  };

  const handleStartSongRadio = async (track: Track) => {
    const theme = detectTrackTheme(track);
    setIsRadioActive(true);
    setRadioThemeName(theme.displayName);
    handlePlayTrack(track, [track], `📻 ${track.artist || track.title} Radyosu`);
    showToast(`📻 "${track.title}" Radyosu Başlatıldı...`);

    try {
      const res = await fetchThematicSongRadio(track, 15);
      if (res && Array.isArray(res.tracks) && res.tracks.length > 0) {
        setQueue(res.tracks);
        setPlaybackContext({
          type: 'radio',
          title: res.radioTitle,
          tracks: [track, ...res.tracks]
        });
        showToast(`✨ ${res.tracks.length} benzer şarkı sıraya eklendi (${res.themeName})`);
      }
    } catch (err) {
      console.warn('Radio queue init note:', err);
    }
  };

  const handleSetSleepTimer = (minutes: number | null) => {
    setSleepTimerMins(minutes);
    if (minutes) {
      showToast(`🌙 Uyku Zamanlayıcı: ${minutes} dakika sonra kapanacak`);
    } else {
      showToast('Uyku zamanlayıcısı kapatıldı');
    }
  };

  handlersRef.current = {
    handleTogglePlay,
    handleNextTrack,
    handlePrevTrack,
    handleSeek
  };

  // Playlist Operations
  const handlePlayPlaylist = (playlist: Playlist, shuffle = false) => {
    if (playlist.tracks.length === 0) return;
    setActivePlaylistId(playlist.id);
    setShuffleMode(shuffle ? 'smart' : 'off');
    setSmartShuffleEnabled(shuffle);

    if (shuffle) {
      const randomIdx = Math.floor(Math.random() * playlist.tracks.length);
      handlePlayTrack(playlist.tracks[randomIdx], playlist.tracks, playlist.name);
      const rest = [...playlist.tracks].filter((_, i) => i !== randomIdx);
      setQueue(rest.sort(() => Math.random() - 0.5));
    } else {
      handlePlayTrack(playlist.tracks[0], playlist.tracks, playlist.name);
      setQueue(playlist.tracks.slice(1));
    }
  };

  const handleCreatePlaylist = (customName?: string) => {
    const newId = `pl_${Date.now()}`;
    const newPlaylist: Playlist = {
      id: newId,
      name: customName || `Yeni Çalma Listesi #${playlists.length + 1}`,
      description: 'Özel olarak derlenmiş sınırsız müzik listesi.',
      coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
      folderId: activeFolderId !== 'all' ? activeFolderId : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isCollaborative: false,
      tracks: []
    };

    setPlaylists(prev => [newPlaylist, ...prev]);
    setActivePlaylistId(newId);
    setActiveView('playlist');
    showToast('✨ Yeni çalma listesi oluşturuldu!');
  };

  const handleDeletePlaylist = (id: string) => {
    const updated = playlists.filter(p => p.id !== id);
    setPlaylists(updated);
    if (activePlaylistId === id && updated.length > 0) {
      setActivePlaylistId(updated[0].id);
    }
  };

  const handleReorderTracks = (playlistId: string, fromIndex: number, toIndex: number) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        const reordered = [...p.tracks];
        const [moved] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, moved);
        return { ...p, tracks: reordered };
      }
      return p;
    }));
    collabManager.broadcast(playlistId, 'track_reordered', { fromIndex, toIndex });
  };

  const handleRemoveTrack = (playlistId: string, trackId: string) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        return { ...p, tracks: p.tracks.filter(t => t.id !== trackId) };
      }
      return p;
    }));
  };

  const handleAddTracksToPlaylist = (tracks: Track[], targetPlaylistId: string, newPlaylistName?: string) => {
    if (targetPlaylistId === 'NEW_PLAYLIST') {
      const newId = `pl_${Date.now()}`;
      const newPlaylist: Playlist = {
        id: newId,
        name: newPlaylistName || 'İçe Aktarılan Liste',
        description: 'Spotify bağlantısı üzerinden içe aktarılan liste.',
        coverUrl: tracks[0]?.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isCollaborative: false,
        tracks
      };
      setPlaylists(prev => [newPlaylist, ...prev]);
      setActivePlaylistId(newId);
      setActiveView('playlist');
      if (tracks.length > 0) {
        handlePlayTrack(tracks[0], tracks, newPlaylist.name);
        setQueue(tracks.slice(1));
        showToast(`🎶 "${newPlaylist.name}" (${tracks.length} şarkı) çalınmaya başlandı!`);
      }
      return;
    }

    setPlaylists(prev => prev.map(p => {
      if (p.id === targetPlaylistId) {
        return { ...p, tracks: [...p.tracks, ...tracks] };
      }
      return p;
    }));
    showToast(`🎵 ${tracks.length} şarkı listeye eklendi!`);
  };

  const handleUpvoteTrack = (playlistId: string, trackId: string) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        return {
          ...p,
          tracks: p.tracks.map(t => t.id === trackId ? { ...t, upvotes: (t.upvotes || 0) + 1 } : t)
        };
      }
      return p;
    }));
    collabManager.broadcast(playlistId, 'track_upvoted', { trackId });
    showToast('👍 Şarkıya oy verildi!');
  };

  // Offline Caching & Clearing
  const handleDownloadTrackOffline = async (track: Track) => {
    const success = await cacheTrackAudio(track);
    if (success) {
      setPlaylists(prev => prev.map(p => ({
        ...p,
        tracks: p.tracks.map(t => t.id === track.id ? { ...t, isOfflineCached: true } : t)
      })));
      const stats = await getCachedAudioStats();
      setDownloadedCount(stats.count);
      showToast(`💾 "${track.title}" cihaza indirildi (İnternetsiz çalmaya hazır)`);
    } else {
      showToast('Şarkı çevrimdışı belleğe kaydedildi.');
    }
  };

  const handleDownloadAllOffline = async (playlist: Playlist) => {
    for (const track of playlist.tracks) {
      await cacheTrackAudio(track);
    }
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlist.id) {
        return {
          ...p,
          isDownloadedOffline: true,
          tracks: p.tracks.map(t => ({ ...t, isOfflineCached: true }))
        };
      }
      return p;
    }));
    const stats = await getCachedAudioStats();
    setDownloadedCount(stats.count);
    showToast(`✅ "${playlist.name}" listesi tamamen çevrimdışı indirildi!`);
  };

  const handleClearAllOffline = async () => {
    const reset = await clearOfflineCacheAndResetPlaylists(playlists);
    setPlaylists(reset);
    setDownloadedCount(0);
    showToast('🗑️ İndirilen tüm şarkılar ve çevrimdışı hafıza temizlendi.');
  };

  // Folder Operations
  const handleCreateFolder = (name: string, icon = 'Folder', color = 'emerald') => {
    const newFolder: PlaylistFolder = {
      id: `folder_${Date.now()}`,
      name,
      icon,
      color
    };
    setFolders(prev => [...prev, newFolder]);
    showToast(`📁 "${name}" klasörü oluşturuldu!`);
  };

  const handleDeleteFolder = (folderId: string) => {
    setFolders(prev => prev.filter(f => f.id !== folderId));
    setPlaylists(prev => prev.map(p => p.folderId === folderId ? { ...p, folderId: undefined } : p));
    if (activeFolderId === folderId) setActiveFolderId('all');
    showToast('Klasör silindi');
  };

  const handleAssignPlaylistFolder = (playlistId: string, folderId?: string) => {
    setPlaylists(prev => prev.map(p => p.id === playlistId ? { ...p, folderId: folderId === 'all' ? undefined : folderId } : p));
    showToast('Çalma listesi grubu güncellendi');
  };

  // Playlist Mixer / Blend Handlers
  const handlePlayMixedTracks = (tracks: Track[], mixTitle: string) => {
    if (tracks.length === 0) return;
    const [first, ...rest] = tracks;
    setPlaybackContext({
      tracks: tracks,
      name: mixTitle
    });
    setQueue(rest);
    handlePlayTrack(first, tracks, mixTitle);
    showToast(`🔀 "${mixTitle}" (${tracks.length} şarkı) çalmaya başladı!`);
  };

  const handleAddMixedToQueue = (tracks: Track[], mixTitle: string) => {
    if (tracks.length === 0) return;
    setQueue(prev => [...prev, ...tracks]);
    showToast(`➕ "${mixTitle}" (${tracks.length} şarkı) çalma sırasına eklendi!`);
  };

  const handleCreateMixedPlaylist = (name: string, tracks: Track[]) => {
    const newPlaylist: Playlist = {
      id: `mixed_pl_${Date.now()}`,
      name: name || 'Özel Mix',
      description: `Harmanlanmış ${tracks.length} parça`,
      coverUrl: tracks[0]?.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600',
      tracks: tracks,
      folderId: activeFolderId !== 'all' ? activeFolderId : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isCollaborative: false
    };
    setPlaylists(prev => [newPlaylist, ...prev]);
    setActivePlaylistId(newPlaylist.id);
    setActiveView('playlist');
    showToast(`✨ "${newPlaylist.name}" çalma listesi oluşturuldu!`);
  };

  const handleReshuffleQueue = () => {
    if (queue.length <= 1) {
      showToast('Sırada karıştırılacak yeterli şarkı yok');
      return;
    }
    const shuffled = [...queue];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setQueue(shuffled);
    showToast(`🔀 Sıradaki ${shuffled.length} şarkı yeniden karıştırıldı!`);
  };

  // Filter playlists by active folder
  const filteredPlaylists = useMemo(() => {
    if (activeFolderId === 'all') return playlists;
    if (activeFolderId === 'favorites') {
      return playlists.filter(p => p.tracks.length > 5 || p.isCollaborative);
    }
    if (activeFolderId === 'spotify') {
      return playlists.filter(p => p.spotifySourceUrl || p.name.toLowerCase().includes('spotify') || p.name.toLowerCase().includes('hit'));
    }
    if (activeFolderId === 'energy') {
      return playlists.filter(p => p.name.toLowerCase().includes('spor') || p.name.toLowerCase().includes('enerji') || p.name.toLowerCase().includes('pop'));
    }
    if (activeFolderId === 'chill') {
      return playlists.filter(p => p.name.toLowerCase().includes('lo-fi') || p.name.toLowerCase().includes('gece') || p.name.toLowerCase().includes('odak'));
    }
    return playlists.filter(p => p.folderId === activeFolderId);
  }, [playlists, activeFolderId]);

  const currentActivePlaylist = playlists.find(p => p.id === activePlaylistId) || filteredPlaylists[0] || playlists[0];

  return (
    <div className="flex flex-col h-[100dvh] w-screen bg-[#07090d] text-neutral-100 overflow-hidden font-sans select-none">
      {/* Toast notification */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 bg-emerald-500 text-black text-xs font-black rounded-2xl shadow-2xl animate-fade-in flex items-center gap-2 border border-emerald-400">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <Header
        onToggleMobileSidebar={() => setIsFolderManagerOpen(true)}
        onOpenSpotifyImport={() => setIsSpotifyImportOpen(true)}
        onOpenLocalImport={() => setIsLocalImportOpen(true)}
        onOpenJoinRoom={() => setIsJoinRoomOpen(true)}
        onOpenOfflineManager={() => setIsOfflineManagerOpen(true)}
        onOpenPrivateMode={() => setIsPrivateModeOpen(true)}
        onOpenRecommendations={() => setActiveView('recommendations')}
        onOpenInstallApp={() => setIsInstallModalOpen(true)}
        onOpenPlaylistMixer={() => setIsMixerOpen(true)}
        onOpenTVStage={() => setIsTVStageOpen(true)}
        isOfflineMode={isOfflineMode}
        onSearchFocus={() => setActiveView('search')}
      />

      {/* Spotify-Style Playlist Categories / Folder Tabs & Quick Carousel */}
      {activeView === 'playlist' && (
        <div className="bg-neutral-950/90 border-b border-neutral-800/80 px-4 md:px-8 py-2.5 flex flex-col gap-2 shrink-0 z-20 backdrop-blur-md">
          {/* Folders / Groups Chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {folders.map((folder) => {
              const isActive = activeFolderId === folder.id;
              return (
                <button
                  key={folder.id}
                  onClick={() => setActiveFolderId(folder.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    isActive
                      ? 'bg-white text-black font-extrabold shadow-md'
                      : 'bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800 border border-neutral-800'
                  }`}
                >
                  <span>{folder.name}</span>
                </button>
              );
            })}

            <button
              onClick={() => setIsFolderManagerOpen(true)}
              className="px-3 py-1.5 rounded-full text-xs font-bold text-indigo-300 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 whitespace-nowrap transition cursor-pointer flex items-center gap-1 shrink-0"
              title="Klasörleri & Grupları Yönet"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>+ Klasör Ekle</span>
            </button>
          </div>

          {/* Quick Playlist Selector Row */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {filteredPlaylists.map((pl) => {
              const isSelected = pl.id === activePlaylistId;
              return (
                <button
                  key={pl.id}
                  onClick={() => setActivePlaylistId(pl.id)}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'bg-neutral-900/60 text-neutral-400 hover:text-white hover:bg-neutral-900 border border-neutral-800/60'
                  }`}
                >
                  <img
                    src={pl.coverUrl}
                    alt={pl.name}
                    className="w-5 h-5 rounded-md object-cover shrink-0"
                  />
                  <span className="truncate max-w-[140px]">{pl.name}</span>
                  <span className="text-[10px] text-neutral-500 font-mono">({pl.tracks.length})</span>
                </button>
              );
            })}

            <button
              onClick={() => handleCreatePlaylist()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 shrink-0 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Yeni Liste
            </button>
          </div>
        </div>
      )}

      {/* Main Full-Width Immersive Content */}
      <main className="flex-1 min-h-0 relative flex flex-col overflow-hidden bg-gradient-to-b from-neutral-900/40 to-neutral-950/80">
        {activeView === 'playlist' && currentActivePlaylist && (
          <PlaylistDetail
            playlist={currentActivePlaylist}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onPlayTrack={handlePlayTrack}
            onPlayPlaylist={handlePlayPlaylist}
            onTogglePlay={handleTogglePlay}
            onReorderTracks={handleReorderTracks}
            onRemoveTrack={handleRemoveTrack}
            onOpenCoverStudio={() => setIsCoverStudioOpen(true)}
            onOpenCollaborativeModal={() => setIsCollaborativeModalOpen(true)}
            onOpenSpotifyImport={() => setIsSpotifyImportOpen(true)}
            onOpenLocalImport={() => setIsLocalImportOpen(true)}
            onOpenAutoExpand={() => setIsAutoExpandOpen(true)}
            onOpenPlaylistMixer={() => setIsMixerOpen(true)}
            onUpvoteTrack={handleUpvoteTrack}
            onAddToQueue={(t) => {
              setQueue(prev => [...prev, t]);
              showToast(`➕ "${t.title}" çalma sırasına eklendi`);
            }}
            onDownloadTrackOffline={handleDownloadTrackOffline}
            onDownloadAllOffline={handleDownloadAllOffline}
            onStartSongRadio={handleStartSongRadio}
          />
        )}

        {activeView === 'search' && (
          <SearchView
            playlists={playlists}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onPlayTrack={handlePlayTrack}
            onAddTrackToPlaylist={(track, targetId) => handleAddTracksToPlaylist([track], targetId)}
            onAddToQueue={(t) => {
              setQueue(prev => [...prev, t]);
              showToast(`➕ "${t.title}" çalma sırasına eklendi`);
            }}
            onPlayNext={(t) => {
              setQueue(prev => [t, ...prev]);
              showToast(`⏩ "${t.title}" sıradaki şarkı olarak ayarlandı`);
            }}
            onDownloadTrackOffline={handleDownloadTrackOffline}
            onOpenSpotifyImport={() => setIsSpotifyImportOpen(true)}
            onStartSongRadio={handleStartSongRadio}
            onSaveChartToPlaylist={(title, tracks) => {
              handleAddTracksToPlaylist(tracks, 'NEW_PLAYLIST', title);
              showToast(`✨ "${title}" çalma listelerinize kaydedildi!`);
            }}
          />
        )}

        {activeView === 'recommendations' && (
          <RecommendationsView
            playlists={playlists}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onPlayTrack={handlePlayTrack}
            onAddTrackToPlaylist={(track, targetId) => handleAddTracksToPlaylist([track], targetId)}
            onAddToQueue={(t) => {
              setQueue(prev => [...prev, t]);
              showToast(`➕ "${t.title}" çalma sırasına eklendi`);
            }}
            onDownloadTrackOffline={handleDownloadTrackOffline}
            onOpenPrivateModeGuide={() => setIsPrivateModeOpen(true)}
            onStartSongRadio={handleStartSongRadio}
          />
        )}

        {activeView === 'queue' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-3xl mx-auto w-full pb-56 sm:pb-44 custom-scrollbar">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-neutral-800">
              <div>
                <h2 className="text-xl font-black text-white">Çalma Sırası & Bekleyenler</h2>
                <p className="text-xs text-neutral-400">Şarkıları harmanlayın, listeleri karıştırın ve akışı kontrol edin.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMixerOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 hover:from-emerald-500/30 hover:to-indigo-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  title="Birden fazla listeyi harmanlayarak sıraya ekle"
                >
                  <Shuffle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Listeleri Sıraya Mixle</span>
                </button>

                {queue.length > 1 && (
                  <button
                    onClick={handleReshuffleQueue}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-xl text-xs font-bold transition cursor-pointer"
                    title="Sıradaki tüm şarkıları yeniden karıştır"
                  >
                    <Shuffle className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Sırayı Karıştır</span>
                  </button>
                )}

                {queue.length > 0 && (
                  <button
                    onClick={() => {
                      setQueue([]);
                      showToast('Sıra temizlendi');
                    }}
                    className="text-xs text-rose-400 hover:underline font-bold px-2 py-1 cursor-pointer"
                  >
                    Temizle
                  </button>
                )}
              </div>
            </div>

            {currentTrack && (
              <div className="mb-6">
                <div className="text-xs font-bold text-emerald-400 mb-2 uppercase tracking-wider">Şu An Çalıyor</div>
                <div className="p-3 bg-neutral-900 rounded-2xl border border-emerald-500/30 flex items-center gap-3">
                  <img src={currentTrack.coverUrl} className="w-12 h-12 rounded-xl object-cover" />
                  <div>
                    <div className="text-sm font-bold text-white">{currentTrack.title}</div>
                    <div className="text-xs text-neutral-400">{currentTrack.artist}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wider">Sırada ({queue.length})</div>
            {queue.length === 0 ? (
              <div className="py-12 text-center text-neutral-500">
                <Music className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sırada bekleyen şarkı yok</p>
                <p className="text-xs text-neutral-600 mt-1">Herhangi bir şarkının yanındaki üç noktadan sıraya ekleyebilirsiniz.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {queue.map((t, idx) => (
                  <div key={`${t.id}_${idx}`} className="p-3 bg-neutral-950 rounded-xl border border-neutral-800/80 flex items-center justify-between group">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono text-neutral-500 w-5">{idx + 1}</span>
                      <img src={t.coverUrl} className="w-10 h-10 rounded-lg object-cover" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{t.title}</div>
                        <div className="text-[11px] text-neutral-400 truncate">{t.artist}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setQueue(prev => prev.filter((_, i) => i !== idx));
                        handlePlayTrack(t);
                      }}
                      className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      Şimdi Çal
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'lyrics' && (
          <LyricsView
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onTogglePlay={handleTogglePlay}
            onPrev={handlePrevTrack}
            onNext={handleNextTrack}
            onSeek={handleSeek}
            onStartSongRadio={handleStartSongRadio}
            onPlayTrack={handlePlayTrack}
            onOpenTVStage={() => setIsTVStageOpen(true)}
          />
        )}
      </main>

      {/* Spotify Bottom Bar Navigation & Sticky Player Bar */}
      <div className="shrink-0 z-40 flex flex-col">
        <PlayerBar
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          repeatMode={repeatMode}
          isShuffle={shuffleMode !== 'off'}
          shuffleMode={shuffleMode}
          isABActive={isABActive}
          isRadioActive={isRadioActive}
          volume={audioSettings.volume}
          isMuted={audioSettings.muted}
          isOfflineMode={isOfflineMode}
          onTogglePlay={handleTogglePlay}
          onPrev={handlePrevTrack}
          onNext={handleNextTrack}
          onSeek={handleSeek}
          onToggleRepeat={handleToggleRepeat}
          onToggleShuffle={handleToggleShuffle}
          onToggleABLoop={handleToggleABLoop}
          onChangeVolume={handleChangeVolume}
          onToggleMute={handleToggleMute}
          onOpenFullPlayer={() => setIsFullPlayerOpen(true)}
          onOpenQueue={() => setIsQueueOpen(true)}
          onOpenEqualizer={() => setIsEqualizerOpen(true)}
          onOpenOfflineManager={() => setIsOfflineManagerOpen(true)}
          onStartSongRadio={handleStartSongRadio}
          onOpenTVStage={() => setIsTVStageOpen(true)}
        />

        {/* Spotify-Style Bottom Nav Bar */}
        <BottomNavBar
          activeView={activeView}
          onSelectView={setActiveView}
          isOfflineMode={isOfflineMode}
          onOpenOfflineManager={() => setIsOfflineManagerOpen(true)}
          onOpenFolderManager={() => setIsFolderManagerOpen(true)}
          onCreatePlaylist={handleCreatePlaylist}
          onOpenEqualizer={() => setIsEqualizerOpen(true)}
          downloadedCount={downloadedCount}
          totalPlaylistsCount={playlists.length}
        />
      </div>

      {/* Modals & Overlays */}
      <FullPlayerModal
        isOpen={isFullPlayerOpen}
        onClose={() => setIsFullPlayerOpen(false)}
        track={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        repeatMode={repeatMode}
        isShuffle={shuffleMode !== 'off'}
        shuffleMode={shuffleMode}
        isABActive={isABActive}
        isRadioActive={isRadioActive}
        onTogglePlay={handleTogglePlay}
        onPrev={handlePrevTrack}
        onNext={handleNextTrack}
        onSeek={handleSeek}
        onToggleRepeat={handleToggleRepeat}
        onToggleShuffle={handleToggleShuffle}
        onToggleABLoop={handleToggleABLoop}
        onOpenEqualizer={() => setIsEqualizerOpen(true)}
        onStartSongRadio={handleStartSongRadio}
        onOpenTVStage={() => setIsTVStageOpen(true)}
      />

      <TVLyricsStageModal
        isOpen={isTVStageOpen}
        onClose={() => {
          setIsTVStageOpen(false);
          try {
            if (typeof window !== 'undefined' && window.location.search) {
              const url = new URL(window.location.href);
              if (url.searchParams.has('tv')) {
                url.searchParams.delete('tv');
                url.searchParams.delete('room');
                window.history.replaceState({}, '', url.pathname);
              }
            }
          } catch {}
        }}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={audioSettings.volume}
        isMuted={audioSettings.muted}
        onTogglePlay={handleTogglePlay}
        onPrev={handlePrevTrack}
        onNext={handleNextTrack}
        onSeek={handleSeek}
        onChangeVolume={handleChangeVolume}
        onToggleMute={handleToggleMute}
      />

      {currentActivePlaylist && (
        <CoverStudioModal
          isOpen={isCoverStudioOpen}
          onClose={() => setIsCoverStudioOpen(false)}
          playlist={currentActivePlaylist}
          onSaveCover={(coverUrl, coverConfig) => {
            setPlaylists(prev => prev.map(p => p.id === currentActivePlaylist.id ? { ...p, coverUrl, coverConfig } : p));
            showToast('🎨 Özel kapak fotoğrafı kaydedildi!');
          }}
        />
      )}

      {currentActivePlaylist && (
        <CollaborativeRoomModal
          isOpen={isCollaborativeModalOpen}
          onClose={() => setIsCollaborativeModalOpen(false)}
          playlist={currentActivePlaylist}
          onUpdatePlaylist={(updated) => {
            setPlaylists(prev => prev.map(p => p.id === updated.id ? updated : p));
          }}
        />
      )}

      <SpotifyImportModal
        isOpen={isSpotifyImportOpen}
        onClose={() => setIsSpotifyImportOpen(false)}
        playlists={playlists}
        currentPlaylistId={activePlaylistId}
        onImportTracks={handleAddTracksToPlaylist}
      />

      <LocalFileImportModal
        isOpen={isLocalImportOpen}
        onClose={() => setIsLocalImportOpen(false)}
        playlists={playlists}
        currentPlaylistId={activePlaylistId}
        onAddTracks={handleAddTracksToPlaylist}
      />

      <EqualizerModal
        isOpen={isEqualizerOpen}
        onClose={() => setIsEqualizerOpen(false)}
        settings={audioSettings}
        onUpdateSettings={setAudioSettings}
        sleepTimerMinutes={sleepTimerMins}
        onSetSleepTimer={handleSetSleepTimer}
      />

      <OfflineManagerModal
        isOpen={isOfflineManagerOpen}
        onClose={() => setIsOfflineManagerOpen(false)}
        isOfflineMode={isOfflineMode}
        onToggleOfflineMode={() => {
          setIsOfflineMode(!isOfflineMode);
          showToast(!isOfflineMode ? '✈️ Çevrimdışı (İnternetsiz) Mod Açıldı' : '🌐 Çevrimiçi Mod Açıldı');
        }}
        playlists={playlists}
        onDownloadAllPlaylists={async () => {
          for (const pl of playlists) {
            await handleDownloadAllOffline(pl);
          }
        }}
        onClearAllOffline={handleClearAllOffline}
        onPlayTrack={handlePlayTrack}
      />

      <FolderManagerModal
        isOpen={isFolderManagerOpen}
        onClose={() => setIsFolderManagerOpen(false)}
        folders={folders}
        playlists={playlists}
        onCreateFolder={handleCreateFolder}
        onDeleteFolder={handleDeleteFolder}
        onAssignPlaylistFolder={handleAssignPlaylistFolder}
      />

      <QueueDrawer
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        queue={queue}
        currentTrack={currentTrack}
        onPlayTrackFromQueue={(t, idx) => {
          setQueue(prev => prev.filter((_, i) => i !== idx));
          handlePlayTrack(t);
        }}
        onRemoveFromQueue={(idx) => {
          setQueue(prev => prev.filter((_, i) => i !== idx));
        }}
        onMoveQueueItem={(from, to) => {
          setQueue(prev => {
            const copy = [...prev];
            const [item] = copy.splice(from, 1);
            copy.splice(to, 0, item);
            return copy;
          });
        }}
        onClearQueue={() => setQueue([])}
        onReshuffleQueue={handleReshuffleQueue}
        onOpenMixer={() => setIsMixerOpen(true)}
        onUpvoteTrack={(trackId) => {
          setQueue(prev => {
            const updated = prev.map(t => t.id === trackId ? { ...t, upvotes: (t.upvotes || 0) + 1 } : t);
            return updated.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
          });
          showToast('👍 Şarkıya oy verildi, sırada öne geçti!');
        }}
      />

      <PlaylistMixerModal
        isOpen={isMixerOpen}
        onClose={() => setIsMixerOpen(false)}
        playlists={playlists}
        onPlayMixedTracks={handlePlayMixedTracks}
        onAddMixedToQueue={handleAddMixedToQueue}
        onCreateMixedPlaylist={handleCreateMixedPlaylist}
      />

      <JoinRoomModal
        isOpen={isJoinRoomOpen}
        onClose={() => setIsJoinRoomOpen(false)}
        playlists={playlists}
        onSelectPlaylist={(id) => {
          setActivePlaylistId(id);
          setActiveView('playlist');
        }}
        onAddCollaborativePlaylist={(newCollab) => {
          setPlaylists(prev => [newCollab, ...prev]);
          setActivePlaylistId(newCollab.id);
          setActiveView('playlist');
          showToast(`👥 "${newCollab.name}" ortak odasına katıldınız!`);
        }}
      />

      {currentActivePlaylist && (
        <AutoExpandPlaylistModal
          isOpen={isAutoExpandOpen}
          onClose={() => setIsAutoExpandOpen(false)}
          playlist={currentActivePlaylist}
          onAddTracks={(playlistId, tracks) => {
            handleAddTracksToPlaylist(tracks, playlistId);
            showToast(`✨ ${tracks.length} önerilen şarkı "${currentActivePlaylist.name}" listesine eklendi!`);
          }}
          onPlayTrack={handlePlayTrack}
        />
      )}

      <PrivateModeModal
        isOpen={isPrivateModeOpen}
        onClose={() => setIsPrivateModeOpen(false)}
        playlists={playlists}
        onImportPlaylists={(restored) => {
          setPlaylists(restored);
          if (restored.length > 0) setActivePlaylistId(restored[0].id);
          showToast('✅ Çalma listeleriniz ve verileriniz başarıyla yüklendi!');
        }}
        onShowToast={showToast}
      />

      {isLocked && (
        <PinLockScreen onUnlock={() => setIsLocked(false)} />
      )}

      <InstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        hasNativePrompt={hasNativePrompt}
        onNativeInstall={promptInstall}
        isInstalled={isInstalled}
      />
    </div>
  );
}
