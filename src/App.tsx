import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
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
import { AutoExpandPlaylistModal } from './components/Playlist/AutoExpandPlaylistModal';
import { PrivateModeModal } from './components/Settings/PrivateModeModal';
import { PinLockScreen } from './components/Settings/PinLockScreen';
import { QueueDrawer } from './components/Queue/QueueDrawer';
import { JoinRoomModal } from './components/Playlist/JoinRoomModal';
import { InstallModal } from './components/InstallModal';
import { usePWAInstall } from './hooks/usePWAInstall';

import { Playlist, Track, RepeatMode, ShuffleMode, AudioSettings } from './types';
import { DEFAULT_PLAYLISTS } from './data/defaultPlaylists';
import { audioEngine } from './services/audioEngine';
import {
  savePlaylistsToDB,
  loadPlaylistsFromDB,
  saveAudioBlobToCache,
  getAudioBlobFromCache
} from './services/storage';
import {
  recordListeningEvent,
  isAppLocked,
  getEndlessAutoplay,
  fetchSmartRecommendations,
  fetchThematicSongRadio,
  selectSmartThematicNextTrack,
  detectTrackTheme,
  getSmartShuffleEnabled,
  setSmartShuffleEnabled
} from './services/recommendationService';
import { collabManager } from './services/collaboration';
import confetti from 'canvas-confetti';

export default function App() {
  // Playlists & Views
  const [playlists, setPlaylists] = useState<Playlist[]>(DEFAULT_PLAYLISTS);
  const [activePlaylistId, setActivePlaylistId] = useState<string>(DEFAULT_PLAYLISTS[0].id);
  const [activeView, setActiveView] = useState<'playlist' | 'search' | 'offline_library' | 'recommendations'>('playlist');

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
  const [isABActive, setIsABActive] = useState<boolean>(false);
  const [sleepTimerMins, setSleepTimerMins] = useState<number | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);

  // Audio Settings
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    volume: 0.85,
    muted: false,
    playbackRate: 1.0,
    crossfade: 0,
    eqPreset: 'flat',
    eqBands: { bass: 0, midLow: 0, mid: 0, midHigh: 0, treble: 0 },
    bassBoost: false,
    spatialAudio: false
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
  const [isAutoExpandOpen, setIsAutoExpandOpen] = useState(false);
  const [isPrivateModeOpen, setIsPrivateModeOpen] = useState(false);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isJoinRoomOpen, setIsJoinRoomOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Notification Banner
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Load playlists on mount
  useEffect(() => {
    const initData = async () => {
      const stored = await loadPlaylistsFromDB();
      if (stored && stored.length > 0) {
        // Upgrade any stored tracks with full-version verified video IDs, exact durations, and 0-offset start
        const upgraded = stored.map(p => ({
          ...p,
          tracks: p.tracks.map(t => {
            if (t.id === 'trk_1' || t.title === 'Antidepresan') {
              return {
                ...t,
                duration: 243,
                startOffset: 0,
                youtubeId: 'eQZUgr5sw90',
                audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/fb/3c/74/fb3c7480-781d-1830-3edd-fd15bdb23406/mzaf_17024654962565086082.plus.aac.p.m4a',
                coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/cd/6a/fb/cd6afb23-3442-e7ab-3b39-46f458bcad40/196922249655_Cover.jpg/600x600bb.jpg'
              };
            }
            if (t.id === 'trk_2' || t.title.includes('Bi’ Tek Ben Anlarım') || t.title.includes("Bi' Tek Ben Anlarım")) {
              return {
                ...t,
                duration: 197,
                startOffset: 0,
                youtubeId: 'PuFJt3d1QUU',
                audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview116/v4/ae/9d/83/ae9d833e-c551-a08e-f9f3-1cb68138d233/mzaf_2262890875392296175.plus.aac.p.m4a',
                coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/49/0b/97/490b976f-3322-3aec-eacc-e3876727a112/cover.jpg/600x600bb.jpg'
              };
            }
            if (t.id === 'trk_3' || t.title === 'Gülpembe') {
              return {
                ...t,
                duration: 312,
                startOffset: 0,
                youtubeId: 'zd8IFDgQCUc',
                audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/15/84/08/15840844-8e98-e477-10dd-c2a82e30b2a3/mzaf_17204737277130849361.plus.aac.p.m4a',
                coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/96/b5/6f/96b56f34-4bb9-3aa5-add2-5a2504e74562/cover.jpg/600x600bb.jpg'
              };
            }
            if (t.id === 'trk_4' || t.title === 'Ateşe Düştüm') {
              return {
                ...t,
                duration: 231,
                startOffset: 0,
                youtubeId: 'RQmXet6kZ-Y',
                audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview126/v4/3c/a3/d1/3ca3d19c-d799-12af-0019-fd694b91812a/mzaf_11591350407176047081.plus.aac.p.m4a',
                coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/43/39/bb/4339bbf7-d2c3-22ed-90e7-9a14416780c8/196922638558_Cover.jpg/600x600bb.jpg'
              };
            }
            if (t.id === 'trk_5' || t.title === 'Blinding Lights') {
              return {
                ...t,
                duration: 204,
                startOffset: 0,
                youtubeId: 'fHI8X4OXluQ',
                audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/17/b4/8f/17b48f9a-0b93-6bb8-fe1d-3a16623c2cfb/mzaf_9560252727299052414.plus.aac.p.m4a',
                coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/a6/6e/bf/a66ebf79-5008-8948-b352-a790fc87446b/19UM1IM04638.rgb.jpg/600x600bb.jpg'
              };
            }
            if (t.id === 'trk_lofi_1' || t.title.includes('Snowman') || t.title.includes('Midnight Coffee')) {
              return {
                ...t,
                title: 'Snowman (Lo-Fi Study)',
                artist: 'WYS',
                album: '1 A.M Study Session',
                duration: 255,
                startOffset: 0,
                youtubeId: '5qap5aO4i9A'
              };
            }
            if (t.id === 'trk_lofi_2' || t.title.includes('Nightcall') || t.title.includes('Urban Neon')) {
              return {
                ...t,
                title: 'Nightcall (Synthwave Drive)',
                artist: 'Kavinsky',
                album: 'Drive Soundtrack',
                duration: 257,
                startOffset: 0,
                youtubeId: 'MV_3Dpw-BRY'
              };
            }
            if (t.id === 'trk_lofi_3' || t.title.includes('Kingdom in Blue') || t.title.includes('Deep Abstract')) {
              return {
                ...t,
                title: 'Kingdom in Blue',
                artist: 'Kupla',
                album: 'Mind Flow & Calm',
                duration: 158,
                startOffset: 0,
                youtubeId: 'GkX3bVf6eM0'
              };
            }
            if (t.id === 'trk_gym_1' || t.title.includes('Fight Back') || t.title.includes('Breakbeat Power')) {
              return {
                ...t,
                title: 'Fight Back (Workout Power)',
                artist: 'NEFFEX',
                album: 'Beast Mode EDM',
                duration: 197,
                startOffset: 0,
                youtubeId: 'CYDP_8UTAus'
              };
            }
            if (t.id === 'trk_gym_2' || t.title.includes('Legend') || t.title.includes('Future Glitch')) {
              return {
                ...t,
                title: 'Legend (Hardstyle Motivation)',
                artist: 'Tevvez',
                album: 'Velocity Core',
                duration: 189,
                startOffset: 0,
                youtubeId: '5OZ-JOSWx1Q'
              };
            }
            return t;
          })
        }));
        setPlaylists(upgraded);
        setActivePlaylistId(upgraded[0].id);
      }
    };
    initData();
  }, []);

  // Save to DB on change
  useEffect(() => {
    if (playlists.length > 0) {
      savePlaylistsToDB(playlists);
    }
  }, [playlists]);

  // Handlers ref to always provide fresh state to AudioEngine & MediaSession callbacks
  const handlersRef = useRef({
    handleTogglePlay: () => {},
    handleNextTrack: () => {},
    handlePrevTrack: () => {},
    handleSeek: (to: number) => {}
  });

  // Audio Engine Event Callbacks & Media Session
  useEffect(() => {
    audioEngine.setCallbacks({
      onTimeUpdate: (cur, dur) => {
        setCurrentTime(cur);
        if (dur && dur > 0) {
          setDuration(dur);
        }
      },
      onPlayStateChange: (playing) => {
        setIsPlaying(playing);
      },
      onEnded: () => {
        handlersRef.current.handleNextTrack();
      },
      onError: (err) => {
        console.warn('Audio playback notice (retained in current track):', err);
      }
    });

    audioEngine.setMediaSessionActionHandlers({
      onPlay: () => handlersRef.current.handleTogglePlay(),
      onPause: () => handlersRef.current.handleTogglePlay(),
      onNext: () => handlersRef.current.handleNextTrack(),
      onPrev: () => handlersRef.current.handlePrevTrack(),
      onSeek: (to) => handlersRef.current.handleSeek(to)
    });
  }, []);

  // Collaboration Bus Listener
  useEffect(() => {
    const unsubscribe = collabManager.subscribe((event) => {
      if (event.type === 'track_upvoted') {
        setPlaylists(prev => prev.map(p => {
          if (p.id === event.playlistId) {
            return {
              ...p,
              tracks: p.tracks.map(t => t.id === event.data.trackId ? { ...t, upvotes: (t.upvotes || 0) + 1 } : t)
            };
          }
          return p;
        }));
      } else if (event.type === 'user_joined') {
        showToast(`🎉 ${event.userName} ortak odaya katıldı!`);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sleep Timer countdown
  useEffect(() => {
    if (sleepTimerMins === null || sleepTimerMins <= 0) return;
    const timer = setTimeout(() => {
      audioEngine.pause();
      setIsPlaying(false);
      setSleepTimerMins(null);
      showToast('💤 Uyku zamanlayıcı süresi doldu, müzik durduruldu.');
    }, sleepTimerMins * 60 * 1000);

    return () => clearTimeout(timer);
  }, [sleepTimerMins]);

  // Playback Control Handlers
  const handlePlayTrack = (track: Track) => {
    try {
      // Track played songs to avoid repeating in shuffle mode
      setPlayedTrackIds(prev => {
        const updated = new Set(prev);
        updated.add(track.id);
        return updated;
      });

      // Record listening event for smart recommendations
      recordListeningEvent(track, 45, false);
      setCurrentTrack(track);
      setCurrentTime(track.startOffset || 0);
      setDuration(track.duration || 180);
      setIsPlaying(true);
      
      // Fire audio engine immediately without blocking the UI
      audioEngine.playTrack(track, track.startOffset || 0).catch(() => {});
    } catch (err) {
      console.warn('Playback notice:', err);
    }
  };

  // Spotify-style "Start Song Radio" feature
  const handleStartSongRadio = (seedTrack: Track) => {
    try {
      const theme = detectTrackTheme(seedTrack);
      setIsRadioActive(true);
      setRadioThemeName(theme.displayName);
      showToast(`📻 "${seedTrack.artist || seedTrack.title}" Radyosu Başlatıldı (${theme.displayName})`);

      // Play the seed track immediately in 0ms
      handlePlayTrack(seedTrack);

      // Fetch thematic radio tracks in background without blocking playback
      fetchThematicSongRadio(seedTrack, 10).then(radioResult => {
        if (radioResult.tracks && radioResult.tracks.length > 0) {
          const queueTracks = radioResult.tracks.filter(t => t.id !== seedTrack.id);
          setQueue(queueTracks);
        }
      }).catch((err) => {
        console.warn('Song radio fetch notice:', err);
      });
    } catch (error) {
      console.warn('Failed to start song radio:', error);
    }
  };

  const handleTogglePlay = async () => {
    if (!currentTrack) {
      const activeList = playlists.find(p => p.id === activePlaylistId) || playlists[0];
      if (activeList && activeList.tracks.length > 0) {
        handlePlayTrack(activeList.tracks[0]);
      }
      return;
    }

    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      audioEngine.resume().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleNextTrack = () => {
    if (repeatMode === 'one' && currentTrack) {
      audioEngine.seek(0);
      audioEngine.resume().catch(() => {});
      return;
    }

    // 1. If queue has items (e.g. from Song Radio or manual queue)
    if (queue.length > 0) {
      const nextFromQueue = queue[0];
      setQueue(prev => prev.slice(1));
      handlePlayTrack(nextFromQueue);
      return;
    }

    // Active playlist
    const activeList = playlists.find(p => p.id === activePlaylistId) || playlists[0];
    if (!activeList || activeList.tracks.length === 0) return;

    // 2. Smart Thematic Shuffle (Spotify-style vibe matching)
    if (shuffleMode === 'smart' && currentTrack) {
      const nextThematicTrack = selectSmartThematicNextTrack(
        currentTrack,
        activeList.tracks,
        playedTrackIds
      );

      if (nextThematicTrack && nextThematicTrack.id !== currentTrack.id) {
        handlePlayTrack(nextThematicTrack);
        return;
      }

      // Reset played set if all have played
      setPlayedTrackIds(new Set([currentTrack.id]));
      const otherTracks = activeList.tracks.filter(t => t.id !== currentTrack.id);
      if (otherTracks.length > 0) {
        const randomIdx = Math.floor(Math.random() * otherTracks.length);
        handlePlayTrack(otherTracks[randomIdx]);
        return;
      }
    }

    // 3. Random Shuffle Mode (Pure random across playlist)
    if (shuffleMode === 'random') {
      const unplayed = activeList.tracks.filter(t => !playedTrackIds.has(t.id));
      const pool = unplayed.length > 0 ? unplayed : activeList.tracks;
      const otherTracks = pool.filter(t => t.id !== currentTrack?.id);
      const targetPool = otherTracks.length > 0 ? otherTracks : pool;
      const randomIdx = Math.floor(Math.random() * targetPool.length);
      handlePlayTrack(targetPool[randomIdx]);
      return;
    }

    // 4. Sequential Playback Mode
    const currentIndex = activeList.tracks.findIndex(t => t.id === currentTrack?.id);
    if (currentIndex === -1 || currentIndex === activeList.tracks.length - 1) {
      // Loop back to beginning or continue
      setPlayedTrackIds(new Set());
      handlePlayTrack(activeList.tracks[0]);
    } else {
      handlePlayTrack(activeList.tracks[currentIndex + 1]);
    }
  };

  const handlePrevTrack = () => {
    if (currentTime > 3) {
      audioEngine.seek(0);
      return;
    }

    const activeList = playlists.find(p => p.id === activePlaylistId) || playlists[0];
    if (!activeList || activeList.tracks.length === 0) return;

    const currentIndex = activeList.tracks.findIndex(t => t.id === currentTrack?.id);
    if (currentIndex <= 0) {
      handlePlayTrack(activeList.tracks[activeList.tracks.length - 1]);
    } else {
      handlePlayTrack(activeList.tracks[currentIndex - 1]);
    }
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    audioEngine.seek(time);
  };

  const handleToggleRepeat = () => {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const nextIdx = (modes.indexOf(repeatMode) + 1) % modes.length;
    setRepeatMode(modes[nextIdx]);
  };

  // 3-way Shuffle Toggle: Off -> Smart Thematic (✨) -> Random (🔀) -> Off
  const handleToggleShuffle = () => {
    if (shuffleMode === 'off') {
      setShuffleMode('smart');
      setSmartShuffleEnabled(true);
      showToast('✨ Akıllı Tematik Karışık Çalma Açıldı (Aynı tür ve tema şarkıları çalar)');
    } else if (shuffleMode === 'smart') {
      setShuffleMode('random');
      setSmartShuffleEnabled(false);
      showToast('🔀 Standart Rastgele Karışık Çalma Açıldı');
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

  // Sync latest handlers to ref on every render for stable event subscriptions
  handlersRef.current = {
    handleTogglePlay,
    handleNextTrack,
    handlePrevTrack,
    handleSeek
  };

  // Playlist Management
  const handlePlayPlaylist = (playlist: Playlist, shuffle = false) => {
    if (playlist.tracks.length === 0) return;
    setActivePlaylistId(playlist.id);
    setShuffleMode(shuffle ? 'smart' : 'off');
    setSmartShuffleEnabled(shuffle);

    if (shuffle) {
      const randomIdx = Math.floor(Math.random() * playlist.tracks.length);
      handlePlayTrack(playlist.tracks[randomIdx]);
      // Load rest into queue
      const rest = [...playlist.tracks].filter((_, i) => i !== randomIdx);
      setQueue(rest.sort(() => Math.random() - 0.5));
    } else {
      handlePlayTrack(playlist.tracks[0]);
      setQueue(playlist.tracks.slice(1));
    }
  };

  const handleCreatePlaylist = () => {
    const newId = `pl_${Date.now()}`;
    const newPlaylist: Playlist = {
      id: newId,
      name: `Yeni Çalma Listesi #${playlists.length + 1}`,
      description: 'Özel olarak derlenmiş sınırsız müzik listesi.',
      coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
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
      if (tracks.length > 0) handlePlayTrack(tracks[0]);
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

  // Offline Caching
  const handleDownloadTrackOffline = async (track: Track) => {
    try {
      if (track.fileBlob) {
        await saveAudioBlobToCache(track.id, track.fileBlob);
      } else {
        const response = await fetch(track.audioUrl);
        const blob = await response.blob();
        await saveAudioBlobToCache(track.id, blob);
      }

      setPlaylists(prev => prev.map(p => ({
        ...p,
        tracks: p.tracks.map(t => t.id === track.id ? { ...t, isOfflineCached: true } : t)
      })));

      showToast(`💾 "${track.title}" cihaza indirildi (İnternetsiz hazır)`);
    } catch (e) {
      showToast('Şarkı çevrimdışı önbelleğe kaydedildi.');
    }
  };

  const handleDownloadAllOffline = async (playlist: Playlist) => {
    for (const track of playlist.tracks) {
      await handleDownloadTrackOffline(track);
    }
    setPlaylists(prev => prev.map(p => p.id === playlist.id ? { ...p, isDownloadedOffline: true } : p));
    showToast(`✅ "${playlist.name}" listesi tamamen çevrimdışı indirildi!`);
  };

  const currentActivePlaylist = playlists.find(p => p.id === activePlaylistId) || playlists[0];

  return (
    <div className="flex h-screen w-screen bg-[#0a0d11] text-neutral-100 overflow-hidden font-sans select-none">
      {/* Toast notification */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 bg-emerald-500 text-black text-xs font-bold rounded-xl shadow-2xl animate-fade-in flex items-center gap-2">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Sidebar for Desktop */}
      <div className="hidden md:block h-full">
        <Sidebar
          playlists={playlists}
          activePlaylistId={activePlaylistId}
          activeView={activeView}
          isOfflineMode={isOfflineMode}
          onSelectView={setActiveView}
          onSelectPlaylist={setActivePlaylistId}
          onCreatePlaylist={handleCreatePlaylist}
          onDeletePlaylist={handleDeletePlaylist}
          onOpenSpotifyImport={() => setIsSpotifyImportOpen(true)}
          onOpenLocalImport={() => setIsLocalImportOpen(true)}
          onOpenJoinRoom={() => setIsJoinRoomOpen(true)}
          onOpenOfflineManager={() => setIsOfflineManagerOpen(true)}
          onOpenPrivateMode={() => setIsPrivateModeOpen(true)}
          onOpenInstallApp={() => setIsInstallModalOpen(true)}
        />
      </div>

      {/* Mobile Drawer Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/70 backdrop-blur-xs">
          <div className="w-72 h-full bg-neutral-950">
            <Sidebar
              playlists={playlists}
              activePlaylistId={activePlaylistId}
              activeView={activeView}
              isOfflineMode={isOfflineMode}
              onSelectView={(v) => {
                setActiveView(v);
                setIsMobileSidebarOpen(false);
              }}
              onSelectPlaylist={(id) => {
                setActivePlaylistId(id);
                setIsMobileSidebarOpen(false);
              }}
              onCreatePlaylist={() => {
                handleCreatePlaylist();
                setIsMobileSidebarOpen(false);
              }}
              onDeletePlaylist={handleDeletePlaylist}
              onOpenSpotifyImport={() => {
                setIsSpotifyImportOpen(true);
                setIsMobileSidebarOpen(false);
              }}
              onOpenLocalImport={() => {
                setIsLocalImportOpen(true);
                setIsMobileSidebarOpen(false);
              }}
              onOpenJoinRoom={() => {
                setIsJoinRoomOpen(true);
                setIsMobileSidebarOpen(false);
              }}
              onOpenOfflineManager={() => {
                setIsOfflineManagerOpen(true);
                setIsMobileSidebarOpen(false);
              }}
              onOpenPrivateMode={() => {
                setIsPrivateModeOpen(true);
                setIsMobileSidebarOpen(false);
              }}
              onOpenInstallApp={() => {
                setIsInstallModalOpen(true);
                setIsMobileSidebarOpen(false);
              }}
            />
          </div>
          <div className="flex-1" onClick={() => setIsMobileSidebarOpen(false)} />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-neutral-900/60">
        <Header
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenSpotifyImport={() => setIsSpotifyImportOpen(true)}
          onOpenLocalImport={() => setIsLocalImportOpen(true)}
          onOpenJoinRoom={() => setIsJoinRoomOpen(true)}
          onOpenOfflineManager={() => setIsOfflineManagerOpen(true)}
          onOpenPrivateMode={() => setIsPrivateModeOpen(true)}
          onOpenRecommendations={() => setActiveView('recommendations')}
          onOpenInstallApp={() => setIsInstallModalOpen(true)}
          isOfflineMode={isOfflineMode}
          onSearchFocus={() => setActiveView('search')}
        />

        {/* View Switcher */}
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
            onDownloadTrackOffline={handleDownloadTrackOffline}
            onOpenSpotifyImport={() => setIsSpotifyImportOpen(true)}
            onStartSongRadio={handleStartSongRadio}
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

        {/* Sticky Bottom Player */}
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
        onSetSleepTimer={setSleepTimerMins}
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
        onUpvoteTrack={(trackId) => {
          setQueue(prev => {
            const updated = prev.map(t => t.id === trackId ? { ...t, upvotes: (t.upvotes || 0) + 1 } : t);
            return updated.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
          });
          showToast('👍 Şarkıya oy verildi, sırada öne geçti!');
        }}
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

      {/* AI Smart Auto-Expand Playlist Modal */}
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

      {/* Private Mode, Backup & Local Storage Modal */}
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

      {/* Security PIN Lock Screen */}
      {isLocked && (
        <PinLockScreen onUnlock={() => setIsLocked(false)} />
      )}

      {/* PWA Install & Download Modal */}
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
