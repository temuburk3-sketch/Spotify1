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
  Compass
} from 'lucide-react';
import { Track, RepeatMode, ShuffleMode } from '../../types';
import { AudioVisualizer } from './AudioVisualizer';
import { detectTrackTheme } from '../../services/recommendationService';
import { fetchLyricsForTrack, LyricsResponse } from '../../services/lyricsService';

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
  onStartSongRadio
}) => {
  const [lyricsData, setLyricsData] = useState<LyricsResponse | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState<boolean>(false);
  const [isImmersiveLyrics, setIsImmersiveLyrics] = useState<boolean>(false);
  const [autoFollow, setAutoFollow] = useState<boolean>(true);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);
  const activeLyricRef = useRef<HTMLDivElement | null>(null);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch real lyrics on track load
  useEffect(() => {
    if (!track || !isOpen) return;

    let isMounted = true;
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

  // Auto-scroll to active lyric line
  useEffect(() => {
    if (!autoFollow || !lyricsContainerRef.current) return;

    const activeEl = lyricsContainerRef.current.querySelector<HTMLElement>(`[data-lyric-idx="${currentLyricIndex}"]`);
    if (activeEl) {
      const container = lyricsContainerRef.current;
      const topOffset = activeEl.offsetTop - container.offsetTop - container.clientHeight / 2 + activeEl.clientHeight / 2;
      container.scrollTo({
        top: Math.max(0, topOffset),
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
        <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40">
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-white/10 transition cursor-pointer"
            title="Kapat"
          >
            <ChevronDown className="w-6 h-6" />
          </button>

          <div className="text-center min-w-0 px-4">
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-[10px] uppercase font-black text-emerald-400 tracking-widest block">
                {isRadioActive ? 'ŞARKI RADYOSU ÇALIYOR' : 'ŞU AN ÇALINIYOR'}
              </span>
              {isRadioActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </div>
            <h2 className="text-sm font-bold text-white truncate max-w-sm">{track.title}</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsImmersiveLyrics(!isImmersiveLyrics)}
              className={`p-2 rounded-full transition cursor-pointer ${
                isImmersiveLyrics
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
              title={isImmersiveLyrics ? 'Kapak Görünümüne Dön' : 'Tam Ekran Şarkı Sözleri'}
            >
              <Mic2 className="w-5 h-5" />
            </button>
            <button
              onClick={onOpenEqualizer}
              className="p-2 text-neutral-400 hover:text-emerald-400 rounded-full hover:bg-white/10 transition cursor-pointer"
              title="Ekolayzer & Ses Ayarları"
            >
              <Sliders className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center Main Body */}
        <div className="relative z-10 flex-1 flex flex-col md:flex-row items-center justify-center p-6 md:p-10 gap-8 max-w-6xl mx-auto w-full min-h-0 overflow-hidden">
          {/* Cover & Audio Details (Hidden in pure immersive lyrics view on small screens) */}
          {!isImmersiveLyrics && (
            <div className="flex flex-col items-center max-w-sm w-full shrink-0">
              <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">
                <img
                  src={track.coverUrl}
                  alt={track.title}
                  className="w-full h-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {track.album || track.genre || 'SoundPulse Master Audio'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Real-time Frequency Visualizer */}
              <div className="w-full mt-4 px-2">
                <AudioVisualizer isPlaying={isPlaying} color="#10b981" type="bars" className="w-full h-10" />
              </div>
            </div>
          )}

          {/* Synchronized Lyrics & Follow-Along Panel */}
          <div className="flex-1 w-full flex flex-col h-full min-h-0 justify-between">
            {/* Header info */}
            <div className="mb-3 shrink-0 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl md:text-3xl font-extrabold text-white tracking-tight truncate">
                    {track.title}
                  </h1>
                  {isRadioActive && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <Radio className="w-3 h-3" /> Radyo
                    </span>
                  )}
                </div>
                <p className="text-sm md:text-base font-semibold text-emerald-400 mt-0.5 truncate">{track.artist}</p>

                {currentTheme && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${currentTheme.color}`}>
                      {currentTheme.displayName}
                    </span>
                    {onStartSongRadio && (
                      <button
                        onClick={() => onStartSongRadio(track)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-neutral-900 border border-neutral-700 hover:border-amber-400/60 text-amber-300 transition cursor-pointer"
                        title="Bu tarzda sonsuz şarkı akışı başlat"
                      >
                        <Radio className="w-3 h-3" /> Şarkı Radyosu
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Status / Follow-Along toggle */}
              <div className="flex items-center gap-2 shrink-0">
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
                  <span>{autoFollow ? 'Takip Açık' : 'Takip Kapalı'}</span>
                </button>
              </div>
            </div>

            {/* Lyrics Stream Container */}
            <div
              ref={lyricsContainerRef}
              onScroll={handleUserScroll}
              className={`flex-1 bg-black/40 rounded-2xl p-6 border border-white/10 overflow-y-auto space-y-4 relative scroll-smooth transition-all ${
                isImmersiveLyrics ? 'max-h-[60vh] md:max-h-[68vh]' : 'max-h-[42vh] md:max-h-[48vh]'
              }`}
            >
              {/* Lyrics metadata bar */}
              <div className="sticky top-0 z-20 -mt-2 pb-2 bg-gradient-to-b from-neutral-950 via-neutral-950/90 to-transparent flex items-center justify-between text-xs font-bold text-neutral-400">
                <div className="flex items-center gap-2">
                  <Mic2 className="w-4 h-4 text-emerald-400" />
                  <span>CANLI SENKRONİZE SÖZLER</span>
                </div>
                {isLoadingLyrics ? (
                  <span className="flex items-center gap-1 text-[11px] text-neutral-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" /> Sözler aktarılıyor...
                  </span>
                ) : lyricsData?.synced ? (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> LRC Senkron Aktif
                  </span>
                ) : null}
              </div>

              {/* Timed Lyrics Lines */}
              <div className="py-8 space-y-5">
                {timedLyrics.map((line, idx) => {
                  const isActive = idx === currentLyricIndex;
                  const isPast = idx < currentLyricIndex;

                  return (
                    <div
                      key={idx}
                      data-lyric-idx={idx}
                      onClick={() => onSeek(line.time)}
                      className={`group flex items-start gap-3 cursor-pointer transition-all duration-300 rounded-xl p-3 ${
                        isActive
                          ? 'text-white font-extrabold text-lg md:text-2xl scale-102 bg-white/10 pl-4 border-l-4 border-emerald-400 shadow-lg shadow-emerald-500/10'
                          : isPast
                          ? 'text-neutral-500 font-semibold text-sm md:text-base hover:text-neutral-300 opacity-60'
                          : 'text-neutral-400 font-semibold text-sm md:text-base hover:text-white opacity-80'
                      }`}
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

