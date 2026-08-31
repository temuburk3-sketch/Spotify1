import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  Mic2,
  Sliders,
  Radio,
  Sparkles,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Loader2,
  Volume2,
  Disc3,
  Compass,
  Heart,
  UserCheck,
  UserPlus,
  Share2,
  Flame,
  Tv,
  ArrowLeft,
  X
} from 'lucide-react';
import { Track, RepeatMode, ShuffleMode } from '../../types';
import { AudioVisualizer } from './AudioVisualizer';
import { detectTrackTheme } from '../../services/recommendationService';
import { fetchLyricsForTrack, LyricsResponse } from '../../services/lyricsService';
import {
  isTrackFollowed,
  toggleFollowTrack,
  isArtistFollowed,
  toggleFollowArtist,
  subscribeToFollowChanges
} from '../../services/followService';

interface FullPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  shuffleMode?: ShuffleMode;
  isABActive: boolean;
  isRadioActive?: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onToggleRepeat: () => void;
  onToggleShuffle: () => void;
  onToggleABLoop: () => void;
  onOpenEqualizer: () => void;
  onStartSongRadio?: (track: Track) => void;
  onOpenTVStage?: () => void;
}

export const FullPlayerModal: React.FC<FullPlayerModalProps> = ({
  isOpen,
  onClose,
  track,
  isPlaying,
  currentTime,
  duration,
  repeatMode,
  isShuffle,
  shuffleMode = isShuffle ? 'smart' : 'off',
  isABActive,
  isRadioActive = false,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onToggleRepeat,
  onToggleShuffle,
  onToggleABLoop,
  onOpenEqualizer,
  onStartSongRadio,
  onOpenTVStage
}) => {
  const [lyricsData, setLyricsData] = useState<LyricsResponse | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState<boolean>(false);
  const [isImmersiveLyrics, setIsImmersiveLyrics] = useState<boolean>(false);
  const [autoFollow, setAutoFollow] = useState<boolean>(true);
  const [isFollowed, setIsFollowed] = useState<boolean>(false);
  const [isFollowedArtist, setIsFollowedArtist] = useState<boolean>(false);
  const [showFollowToast, setShowFollowToast] = useState<string | null>(null);

  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);
  const activeLyricRef = useRef<HTMLDivElement | null>(null);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync follow status
  useEffect(() => {
    if (!track) return;
    setIsFollowed(isTrackFollowed(track.id) || isTrackFollowed(track.title));
    setIsFollowedArtist(isArtistFollowed(track.artist));

    const unsubscribe = subscribeToFollowChanges(() => {
      setIsFollowed(isTrackFollowed(track.id) || isTrackFollowed(track.title));
      setIsFollowedArtist(isArtistFollowed(track.artist));
    });

    return unsubscribe;
  }, [track?.id, track?.title, track?.artist]);

  const handleToggleFollow = () => {
    if (!track) return;
    const nowFollowed = toggleFollowTrack(track);
    setIsFollowed(nowFollowed);
    setShowFollowToast(nowFollowed ? 'Şarkı Takip Edilenlere Eklendi 💖' : 'Takip Kaldırıldı');
    setTimeout(() => setShowFollowToast(null), 2500);
  };

  const handleToggleFollowArtist = () => {
    if (!track || !track.artist) return;
    const nowFollowed = toggleFollowArtist(track.artist);
    setIsFollowedArtist(nowFollowed);
    setShowFollowToast(nowFollowed ? `${track.artist} Takip Ediliyor ⭐` : `${track.artist} Takipten Çıkarıldı`);
    setTimeout(() => setShowFollowToast(null), 2500);
  };

  // Fetch real lyrics on track load (Immediately clear old song lyrics)
  useEffect(() => {
    if (!track || !isOpen) {
      setLyricsData(null);
      setIsLoadingLyrics(false);
      return;
    }

    let isMounted = true;
    // CRITICAL: Clear stale lyrics from previous song immediately
    setLyricsData(null);
    setIsLoadingLyrics(true);

    fetchLyricsForTrack(track).then((res) => {
      if (isMounted) {
        setLyricsData(res);
        setIsLoadingLyrics(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [track?.id, track?.title, track?.artist, isOpen]);

  // Timed lines from fetched data or track fallback
  const timedLyrics = lyricsData?.timedLyrics || track?.timedLyrics || [
    { time: 0, text: `🎵 ${track?.title || 'Şarkı'}` },
    { time: 8, text: track?.artist || 'Sanatçı' },
    { time: 20, text: 'Şarkının sözleri yükleniyor...' },
    { time: 45, text: 'SoundPulse Senkronize Deneyim' }
  ];

  // Active lyric index based on current playback time
  const currentLyricIndex = timedLyrics.reduce((prevIdx, item, idx) => {
    if (currentTime >= item.time) return idx;
    return prevIdx;
  }, 0);

  // Auto-scroll to active lyric line with exact vertical center locking
  useEffect(() => {
    if (!autoFollow || !lyricsContainerRef.current) return;

    const activeEl = lyricsContainerRef.current.querySelector<HTMLElement>(`[data-lyric-idx="${currentLyricIndex}"]`);
    if (activeEl) {
      const container = lyricsContainerRef.current;
      // Calculate target scroll so active line sits precisely in container vertical center
      const containerRect = container.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();
      const relativeTop = activeRect.top - containerRect.top + container.scrollTop;
      const targetScroll = relativeTop - (container.clientHeight / 2) + (activeEl.clientHeight / 2);

      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth'
      });
    }
  }, [currentLyricIndex, autoFollow, isImmersiveLyrics]);

  // Pause auto-follow briefly if user manually scrolls
  const handleUserScroll = () => {
    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen || !track) return null;

  const currentTheme = detectTrackTheme(track);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950/98 backdrop-blur-2xl text-neutral-100 overflow-hidden select-none">
        {/* Ambient dynamic background artwork glow */}
        <div
          className="absolute inset-0 opacity-25 blur-3xl scale-125 pointer-events-none transition-all duration-1000"
          style={{
            backgroundImage: `url(${track.coverUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/80 via-neutral-950/90 to-neutral-950 pointer-events-none" />

        {/* Top Header Bar */}
        <div className="relative z-10 flex items-center justify-between px-3 sm:px-6 py-3 border-b border-white/10 bg-black/50 backdrop-blur-md">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-black rounded-xl transition text-xs shadow-md shadow-emerald-500/20 cursor-pointer"
            title="Ana Sayfaya Dön"
          >
            <ArrowLeft className="w-4 h-4 text-black" />
            <span>Ana Sayfa</span>
          </button>

          <div className="text-center min-w-0 px-2 flex-1 max-w-xs sm:max-w-md">
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-[10px] uppercase font-black text-emerald-400 tracking-widest block truncate">
                {isRadioActive ? 'ŞARKI RADYOSU ÇALIYOR' : 'ŞU AN ÇALINIYOR'}
              </span>
              {isRadioActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              )}
            </div>
            <h2 className="text-xs sm:text-sm font-bold text-white truncate">{track.title}</h2>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {onOpenTVStage && (
              <button
                onClick={onOpenTVStage}
                className="p-1.5 sm:p-2 text-neutral-400 hover:text-emerald-400 rounded-xl hover:bg-white/10 transition cursor-pointer"
                title="Televizyon ve Sahne Modunda Aç"
              >
                <Tv className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 animate-pulse" />
              </button>
            )}
            <button
              onClick={() => setIsImmersiveLyrics(!isImmersiveLyrics)}
              className={`p-1.5 sm:p-2 rounded-xl transition cursor-pointer ${
                isImmersiveLyrics
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
              title={isImmersiveLyrics ? 'Kapak Görünümüne Dön' : 'Tam Ekran Şarkı Sözleri'}
            >
              <Mic2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={onOpenEqualizer}
              className="p-1.5 sm:p-2 text-neutral-400 hover:text-emerald-400 rounded-xl hover:bg-white/10 transition cursor-pointer"
              title="Ekolayzer & Ses Ayarları"
            >
              <Sliders className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 bg-neutral-800 hover:bg-rose-600 text-neutral-300 hover:text-white rounded-xl border border-white/15 transition cursor-pointer active:scale-90"
              title="Kapat"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Center Main Body */}
        <div className="relative z-10 flex-1 flex flex-col md:flex-row items-center justify-center px-4 sm:px-6 md:px-10 py-4 md:py-6 gap-6 md:gap-8 max-w-6xl mx-auto w-full min-h-0 overflow-y-auto md:overflow-hidden">
          {/* Cover & Audio Details (Hidden in pure immersive lyrics view on small screens) */}
          {!isImmersiveLyrics && (
            <div className="flex flex-col items-center max-w-xs sm:max-w-sm w-full shrink-0">
              <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-72 md:h-72 rounded-2xl overflow-hidden shadow-2xl border border-white/10 group bg-neutral-950">
                <img
                  src={track.coverUrl}
                  alt={track.title}
                  className="w-full h-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono font-bold text-emerald-400 truncate">
                      {track.album || track.genre || 'SoundPulse Audio'}
                    </span>
                    <button
                      onClick={handleToggleFollow}
                      className={`p-2 rounded-full backdrop-blur-md transition ${
                        isFollowed
                          ? 'bg-rose-500/30 text-rose-400 border border-rose-500/50'
                          : 'bg-black/50 text-white/70 hover:text-white border border-white/20'
                      }`}
                      title={isFollowed ? 'Şarkıyı Takipten Çıkar' : 'Şarkıyı Takip Et'}
                    >
                      <Heart className={`w-4 h-4 ${isFollowed ? 'fill-rose-500 text-rose-500' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Real-time Frequency Visualizer */}
              <div className="w-full mt-3 px-2">
                <AudioVisualizer isPlaying={isPlaying} color="#10b981" type="bars" className="w-full h-8 sm:h-10" />
              </div>
            </div>
          )}

          {/* Synchronized Lyrics & Follow-Along Panel */}
          <div className="flex-1 w-full flex flex-col h-full min-h-0 justify-between">
            {/* Header info & Follow Buttons */}
            <div className="mb-3 shrink-0 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {/* Title & Follow Song Button */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight truncate">
                    {track.title}
                  </h1>

                  {/* Song Follow Button */}
                  <button
                    onClick={handleToggleFollow}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer border ${
                      isFollowed
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                        : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:text-white hover:border-neutral-500'
                    }`}
                    title={isFollowed ? 'Şarkıyı Takipten Çıkar' : 'Şarkıyı Takip Et (Favorilere Ekle)'}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isFollowed ? 'fill-rose-500 text-rose-500' : ''}`} />
                    <span>{isFollowed ? 'Takip Ediliyor' : 'Şarkıyı Takip Et'}</span>
                  </button>

                  {isRadioActive && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <Radio className="w-3 h-3" /> Radyo
                    </span>
                  )}
                </div>

                {/* Artist & Follow Artist Button */}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <p className="text-sm md:text-base font-semibold text-emerald-400 truncate">{track.artist}</p>
                  
                  {track.artist && (
                    <button
                      onClick={handleToggleFollowArtist}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition border cursor-pointer ${
                        isFollowedArtist
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                          : 'bg-neutral-900/80 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                      }`}
                      title={isFollowedArtist ? 'Sanatçıyı Takipten Çıkar' : 'Sanatçıyı Takip Et'}
                    >
                      {isFollowedArtist ? <UserCheck className="w-3 h-3 text-indigo-400" /> : <UserPlus className="w-3 h-3" />}
                      <span>{isFollowedArtist ? 'Sanatçı Takipte' : 'Sanatçıyı Takip Et'}</span>
                    </button>
                  )}
                </div>

                {/* Theme badges & Radio shortcut */}
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {currentTheme && (
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentTheme.color}`}>
                      {currentTheme.displayName}
                    </span>
                  )}
                  {onStartSongRadio && (
                    <button
                      onClick={() => onStartSongRadio(track)}
                      className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-neutral-900 border border-neutral-700 hover:border-amber-400/60 text-amber-300 transition cursor-pointer"
                      title="Bu tarzda sonsuz şarkı akışı başlat"
                    >
                      <Radio className="w-3 h-3" /> Şarkı Radyosu
                    </button>
                  )}
                </div>
              </div>

              {/* Status / Lyrics Follow-Along toggle */}
              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                <button
                  onClick={() => setAutoFollow(!autoFollow)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer border ${
                    autoFollow
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                  }`}
                  title="Şarkı çalarken sözleri otomatik takip et"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{autoFollow ? 'Söz Takibi Açık' : 'Söz Takibi Kapalı'}</span>
                </button>
              </div>
            </div>

            {/* Lyrics Stream Container */}
            <div
              ref={lyricsContainerRef}
              onScroll={handleUserScroll}
              className={`flex-1 bg-black/40 rounded-2xl p-4 sm:p-6 border border-white/10 overflow-y-auto space-y-4 relative scroll-smooth transition-all ${
                isImmersiveLyrics ? 'max-h-[60vh] md:max-h-[68vh]' : 'max-h-[36vh] sm:max-h-[42vh] md:max-h-[48vh]'
              }`}
            >
              {/* Lyrics metadata bar */}
              <div className="sticky top-0 z-20 -mt-2 pb-2 bg-gradient-to-b from-neutral-950 via-neutral-950/90 to-transparent flex items-center justify-between text-xs font-bold text-neutral-400">
                <div className="flex items-center gap-2">
                  <Mic2 className="w-4 h-4 text-emerald-400" />
                  <span>CANLI SENKRONİZE SÖZLER</span>
                </div>
                {isLoadingLyrics ? (
                  <span className="flex items-center gap-1.5 text-[11px] text-purple-300 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" /> Gemini Sözleri Arıyor...
                  </span>
                ) : lyricsData?.source === 'gemini_search_grounded' || lyricsData?.source === 'gemini_synced' ? (
                  <span className="flex items-center gap-1 text-[11px] text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-500/40">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Gemini AI Web Senkron
                  </span>
                ) : lyricsData?.synced ? (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> LRC Senkron Aktif
                  </span>
                ) : null}
              </div>

              {/* Timed Lyrics Lines with center padding and dynamic focus */}
              <div className="py-[32vh] space-y-4 sm:space-y-5">
                {timedLyrics.map((line, idx) => {
                  const isActive = idx === currentLyricIndex;
                  const distance = Math.abs(idx - currentLyricIndex);

                  let opacityClass = 'opacity-85 text-neutral-300';
                  let scaleClass = 'scale-95';

                  if (isActive) {
                    opacityClass = 'opacity-100 text-white';
                    scaleClass = 'scale-105 sm:scale-108';
                  } else if (distance === 1) {
                    opacityClass = 'opacity-65 text-neutral-400';
                    scaleClass = 'scale-98';
                  } else if (distance === 2) {
                    opacityClass = 'opacity-40 text-neutral-500';
                    scaleClass = 'scale-95';
                  } else {
                    opacityClass = 'opacity-20 text-neutral-600';
                    scaleClass = 'scale-90';
                  }

                  return (
                    <div
                      key={idx}
                      data-lyric-idx={idx}
                      onClick={() => onSeek(line.time)}
                      className={`group flex items-start gap-3 cursor-pointer transition-all duration-500 ease-out rounded-2xl p-3 sm:p-4 origin-left ${scaleClass} ${
                        isActive
                          ? 'font-black text-lg sm:text-xl md:text-2xl bg-gradient-to-r from-emerald-500/20 via-white/10 to-transparent pl-5 sm:pl-6 border-l-4 border-emerald-400 shadow-2xl shadow-emerald-500/20'
                          : 'font-medium text-xs sm:text-sm md:text-base hover:opacity-90 hover:text-neutral-200'
                      } ${opacityClass}`}
                    >
                      <span className="text-[10px] font-mono text-neutral-500 opacity-0 group-hover:opacity-100 transition mt-1 shrink-0">
                        {formatTime(line.time)}
                      </span>
                      <span className="flex-1 leading-relaxed">{line.text}</span>
                    </div>
                  );
                })}
              </div>

              {/* Resume auto follow pill if user scrolled away */}
              {!autoFollow && (
                <div className="sticky bottom-3 flex justify-center z-20">
                  <button
                    onClick={() => setAutoFollow(true)}
                    className="px-4 py-2 bg-emerald-500 text-black text-xs font-bold rounded-full shadow-2xl hover:bg-emerald-400 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Şarkı Akışını Tekrar Takip Et
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Follow Toast */}
        <AnimatePresence>
          {showFollowToast && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-neutral-900/95 text-white border border-neutral-700 shadow-2xl text-xs font-bold flex items-center gap-2 backdrop-blur-md"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>{showFollowToast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Playback Controls */}
        <div
          className="relative z-10 px-6 pt-4 pb-8 sm:pb-5 border-t border-white/10 bg-black/60 max-w-4xl mx-auto w-full shrink-0"
          style={{
            paddingBottom: 'max(1.75rem, calc(env(safe-area-inset-bottom, 16px) + 0.75rem))'
          }}
        >
          {/* Progress Bar */}
          <div className="space-y-1.5 mb-3">
            <div className="relative group">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => onSeek(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-emerald-400 hover:h-2 transition-all"
              />
            </div>
            <div className="flex justify-between text-xs font-mono text-neutral-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={onToggleShuffle}
              className={`p-2.5 rounded-full transition relative flex items-center justify-center cursor-pointer ${
                shuffleMode === 'smart'
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : shuffleMode === 'random'
                  ? 'text-cyan-400 bg-cyan-500/10'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title={
                shuffleMode === 'smart'
                  ? '✨ Akıllı Tematik Karışık Çalma'
                  : shuffleMode === 'random'
                  ? '🔀 Rastgele Karışık Çalma'
                  : 'Karışık Çalma Kapalı'
              }
            >
              <Shuffle className="w-5 h-5" />
              {shuffleMode === 'smart' && (
                <span className="absolute -top-0.5 -right-0.5 text-[9px] font-black text-emerald-400">✨</span>
              )}
            </button>

            <div className="flex items-center gap-4">
              <button
                onClick={onPrev}
                className="p-3 text-neutral-300 hover:text-white rounded-full hover:bg-white/10 transition cursor-pointer"
                title="Önceki Şarkı"
              >
                <SkipBack className="w-6 h-6 fill-current" />
              </button>

              <button
                onClick={onTogglePlay}
                className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center transition transform hover:scale-105 shadow-xl shadow-emerald-500/30 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
              </button>

              <button
                onClick={onNext}
                className="p-3 text-neutral-300 hover:text-white rounded-full hover:bg-white/10 transition cursor-pointer"
                title="Sonraki Şarkı"
              >
                <SkipForward className="w-6 h-6 fill-current" />
              </button>
            </div>

            <button
              onClick={onToggleRepeat}
              className={`p-2.5 rounded-full transition relative cursor-pointer ${
                repeatMode !== 'off' ? 'text-emerald-400 bg-emerald-500/10' : 'text-neutral-400 hover:text-white'
              }`}
              title="Tekrar Modu"
            >
              <Repeat className="w-5 h-5" />
              {repeatMode === 'one' && (
                <span className="absolute top-1 right-1 text-[9px] font-black text-emerald-400">1</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
};

