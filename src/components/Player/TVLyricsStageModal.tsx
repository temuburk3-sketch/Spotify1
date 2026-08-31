import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Tv,
  Maximize2,
  Minimize2,
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Mic2,
  Flame,
  Volume2,
  VolumeX,
  Sparkles,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Radio,
  Cast,
  Layers,
  Music2,
  Share2,
  Check
} from 'lucide-react';
import { Track } from '../../types';
import { fetchLyricsForTrack, fetchLyricsWithGemini, LyricsResponse } from '../../services/lyricsService';
import { detectTrackTheme } from '../../services/recommendationService';
import { tvSyncService } from '../../services/tvSyncService';
import { audioEngine } from '../../services/audioEngine';

interface TVLyricsStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onChangeVolume: (vol: number) => void;
  onToggleMute: () => void;
}

export const TVLyricsStageModal: React.FC<TVLyricsStageModalProps> = ({
  isOpen,
  onClose,
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onChangeVolume,
  onToggleMute
}) => {
  const [lyricsData, setLyricsData] = useState<LyricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<'tv-medium' | 'tv-large' | 'tv-huge'>('tv-large');
  const [isKaraokeHighlighter, setIsKaraokeHighlighter] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [castConnected, setCastConnected] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const lyricsScrollRef = useRef<HTMLDivElement | null>(null);

  // Fetch & Synchronize lyrics whenever track changes
  useEffect(() => {
    if (!currentTrack || !isOpen) return;

    let isMounted = true;
    // CRITICAL: Immediately clear stale lyrics from previous song
    setLyricsData(null);
    setIsLoading(true);

    fetchLyricsForTrack(currentTrack).then((res) => {
      if (isMounted) {
        setLyricsData(res);
        setIsLoading(false);
        // Update TV Sync & WebVTT Cast subtitle track
        if (res.timedLyrics && res.timedLyrics.length > 0) {
          audioEngine.updateLyricsForCast(res.timedLyrics);
          tvSyncService.broadcastState({
            currentTrack,
            isPlaying,
            currentTime,
            duration,
            lyricsData: res
          });
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentTrack?.id, currentTrack?.title, currentTrack?.artist, isOpen]);

  // Broadcast state changes for multi-screen TV sync
  useEffect(() => {
    if (isOpen && currentTrack) {
      tvSyncService.broadcastState({
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        lyricsData
      });
    }
  }, [currentTime, isPlaying, isOpen, currentTrack?.id]);

  // Handle Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Timed lines
  const timedLyrics = useMemo(() => {
    if (lyricsData?.timedLyrics && lyricsData.timedLyrics.length > 0) {
      return lyricsData.timedLyrics;
    }
    if (currentTrack?.timedLyrics && currentTrack.timedLyrics.length > 0) {
      return currentTrack.timedLyrics;
    }
    return [
      { time: 0, text: `🎵 ${currentTrack?.title || 'Şarkı'}` },
      { time: 6, text: currentTrack?.artist ? `🎤 ${currentTrack.artist}` : 'Sanatçı' },
      { time: 18, text: isLoading ? 'Şarkı sözleri televizyona aktarılıyor...' : 'SoundPulse TV Canlı Sahne' },
      { time: 45, text: 'Senkronize Büyük Ekran Deneyimi' }
    ];
  }, [lyricsData, currentTrack, isLoading]);

  // Find active line index
  const currentLineIndex = useMemo(() => {
    if (!timedLyrics || timedLyrics.length === 0) return 0;
    return timedLyrics.reduce((prevIdx, item, idx) => {
      if (currentTime >= item.time) return idx;
      return prevIdx;
    }, 0);
  }, [timedLyrics, currentTime]);

  // Auto-scroll smooth to active lyric line in TV mode
  useEffect(() => {
    if (!lyricsScrollRef.current) return;

    const activeEl = lyricsScrollRef.current.querySelector<HTMLElement>(`[data-tv-line="${currentLineIndex}"]`);
    if (activeEl) {
      const container = lyricsScrollRef.current;
      const containerRect = container.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();
      const relativeTop = activeRect.top - containerRect.top + container.scrollTop;
      const targetScroll = relativeTop - (container.clientHeight / 2) + (activeEl.clientHeight / 2);

      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth'
      });
    }
  }, [currentLineIndex, fontSize, isKaraokeHighlighter]);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleOpenPopout = () => {
    tvSyncService.openTVPopoutWindow();
  };

  const handleCopyTVUrl = () => {
    const url = `${window.location.origin}${window.location.pathname}?tv=stage`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Google Cast / Remote Playback API trigger
  const handleCastMedia = async () => {
    if (typeof (navigator as any).presentation !== 'undefined' || typeof (window as any).chrome !== 'undefined') {
      try {
        if ('remote' in (audioEngine as any)) {
          await (audioEngine as any).remote.prompt();
          setCastConnected(true);
        } else {
          // Native browser cast prompt
          handleOpenPopout();
        }
      } catch (e) {
        handleOpenPopout();
      }
    } else {
      handleOpenPopout();
    }
  };

  if (!isOpen || !currentTrack) return null;

  const currentTheme = detectTrackTheme(currentTrack);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <AnimatePresence>
      <div
        ref={containerRef}
        className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-white overflow-hidden select-none font-sans"
      >
        {/* Dynamic Atmospheric Blurred Canvas */}
        <div
          className="absolute inset-0 opacity-40 blur-3xl scale-125 pointer-events-none transition-all duration-1000"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 40%, #059669 0%, #047857 25%, #0f172a 65%, #000000 100%), url(${currentTrack.coverUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundBlendMode: 'overlay'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/95 via-neutral-950/85 to-neutral-950/95 pointer-events-none" />

        {/* TV Top Bar Controls */}
        <div className="relative z-20 flex items-center justify-between px-6 sm:px-12 py-5 border-b border-white/10 bg-black/40 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
              <Tv className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                  SoundPulse TV & Sahne
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-black shadow-xs">
                  CANLI SÖZLER
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-medium">Televizyon ve Büyük Ekran Karaoke Modu</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Popout / 2nd Screen Window */}
            <button
              onClick={handleOpenPopout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition cursor-pointer"
              title="İkinci ekranda / Harici TV monitöründe aç"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">İkinci Ekranda Aç</span>
            </button>

            {/* Copy TV URL for Smart TV browser */}
            <button
              onClick={handleCopyTVUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 transition cursor-pointer"
              title="Smart TV tarayıcısından bağlanmak için bağlantıyı kopyala"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedLink ? 'Kopyalandı!' : 'TV Linki'}</span>
            </button>

            {/* Font Size Adjuster for TV distance */}
            <div className="flex items-center bg-neutral-900/90 rounded-full border border-neutral-700 p-0.5">
              <button
                onClick={() => setFontSize('tv-medium')}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition ${
                  fontSize === 'tv-medium' ? 'bg-emerald-500 text-black' : 'text-neutral-400 hover:text-white'
                }`}
                title="Orta TV Yazı Boyutu"
              >
                A
              </button>
              <button
                onClick={() => setFontSize('tv-large')}
                className={`px-2.5 py-1 rounded-full text-xs font-black transition ${
                  fontSize === 'tv-large' ? 'bg-emerald-500 text-black' : 'text-neutral-400 hover:text-white'
                }`}
                title="Büyük TV Yazı Boyutu"
              >
                A+
              </button>
              <button
                onClick={() => setFontSize('tv-huge')}
                className={`px-2.5 py-1 rounded-full text-sm font-black transition ${
                  fontSize === 'tv-huge' ? 'bg-emerald-500 text-black' : 'text-neutral-400 hover:text-white'
                }`}
                title="Dev Sahne Yazı Boyutu"
              >
                A++
              </button>
            </div>

            {/* Karaoke Highlighter Toggle */}
            <button
              onClick={() => setIsKaraokeHighlighter(!isKaraokeHighlighter)}
              className={`p-2 rounded-full border transition cursor-pointer ${
                isKaraokeHighlighter
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-700 hover:text-white'
              }`}
              title="Karaoke Parlama Vurgusu"
            >
              <Flame className="w-4 h-4" />
            </button>

            {/* Fullscreen F11 */}
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition cursor-pointer"
              title={isFullscreen ? 'Tam Ekrandan Çık' : 'Tam Ekran (TV Modu)'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 bg-neutral-900 hover:bg-rose-900/60 text-neutral-300 hover:text-white rounded-full border border-neutral-800 transition cursor-pointer"
              title="TV Modunu Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main TV Layout: Left (Track Artwork & Controls) + Right (Big Screen Synced Lyrics) */}
        <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 p-6 sm:p-12 overflow-hidden items-center">
          {/* Left Column: Huge Artwork & Playback Hub (5 cols on lg) */}
          <div className="lg:col-span-5 flex flex-col items-center lg:items-start justify-center h-full max-h-[85vh]">
            <div className="relative group w-48 sm:w-72 md:w-80 lg:w-96 aspect-square rounded-3xl overflow-hidden shadow-2xl border-2 border-white/15 bg-neutral-900 shrink-0">
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className="w-full h-full object-cover transition duration-700 group-hover:scale-105"
              />
              {isPlaying && (
                <div className="absolute top-4 right-4 px-3 py-1 bg-black/70 backdrop-blur-md rounded-full border border-white/20 flex items-center gap-1.5 shadow-lg">
                  <span className="w-1.5 h-4 bg-emerald-400 animate-pulse rounded-full" />
                  <span className="w-1.5 h-6 bg-emerald-400 animate-pulse delay-75 rounded-full" />
                  <span className="w-1.5 h-3 bg-emerald-400 animate-pulse delay-150 rounded-full" />
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider ml-1">Oynatılıyor</span>
                </div>
              )}
            </div>

            {/* Song Meta */}
            <div className="mt-6 text-center lg:text-left w-full">
              <div className="flex items-center justify-center lg:justify-start gap-2 mb-1.5">
                {currentTheme && (
                  <span className={`text-[10px] sm:text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${currentTheme.color}`}>
                    {currentTheme.displayName}
                  </span>
                )}
                {lyricsData?.source && (
                  <span className="text-[10px] sm:text-xs font-bold text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    {lyricsData.source === 'verified_catalog' ? 'Doğrulanmış Sözler' : 'Canlı Senkron'}
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight line-clamp-2 drop-shadow-md">
                {currentTrack.title}
              </h2>
              <p className="text-base sm:text-xl font-bold text-emerald-400/90 mt-1 truncate">
                {currentTrack.artist}
              </p>
            </div>

            {/* TV Progress Bar */}
            <div className="w-full mt-6">
              <div
                className="relative w-full h-2.5 bg-white/15 rounded-full cursor-pointer overflow-hidden backdrop-blur-xs group"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  onSeek(pct * (duration || 100));
                }}
              >
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-150"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs font-bold text-neutral-400 mt-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* TV Player Controls */}
            <div className="flex items-center justify-center lg:justify-start gap-4 mt-6 w-full">
              <button
                onClick={onPrev}
                className="p-3 text-neutral-300 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer active:scale-90 shadow-md"
                title="Önceki Şarkı"
              >
                <SkipBack className="w-6 h-6 fill-current" />
              </button>
              <button
                onClick={onTogglePlay}
                className="p-5 bg-gradient-to-tr from-emerald-500 to-teal-400 hover:scale-105 text-black rounded-full transition shadow-xl shadow-emerald-500/30 cursor-pointer active:scale-95"
                title={isPlaying ? 'Durdur' : 'Oynat'}
              >
                {isPlaying ? <Pause className="w-8 h-8 fill-black" /> : <Play className="w-8 h-8 fill-black ml-0.5" />}
              </button>
              <button
                onClick={onNext}
                className="p-3 text-neutral-300 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer active:scale-90 shadow-md"
                title="Sonraki Şarkı"
              >
                <SkipForward className="w-6 h-6 fill-current" />
              </button>

              {/* Volume */}
              <div className="hidden sm:flex items-center gap-2 ml-4 bg-white/5 px-3 py-2 rounded-2xl border border-white/10">
                <button onClick={onToggleMute} className="text-neutral-400 hover:text-white">
                  {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
                  className="w-20 accent-emerald-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Giant Synced Karaoke Lyrics (7 cols on lg) */}
          <div className="lg:col-span-7 flex flex-col h-[55vh] lg:h-[82vh] relative overflow-hidden bg-black/30 rounded-3xl border border-white/10 p-4 sm:p-8 backdrop-blur-2xl shadow-2xl">
            {/* Top Fade Gradient */}
            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-neutral-950 via-neutral-950/60 to-transparent pointer-events-none z-10" />

            {/* Scrollable Lyric Lines */}
            <div
              ref={lyricsScrollRef}
              className="flex-1 overflow-y-auto no-scrollbar py-28 px-2 space-y-6 sm:space-y-8 scroll-smooth"
            >
              {timedLyrics.map((line, idx) => {
                const isActive = idx === currentLineIndex;
                const isPassed = idx < currentLineIndex;
                const isNext = idx === currentLineIndex + 1;

                const textSizeClass =
                  fontSize === 'tv-huge'
                    ? isActive
                      ? 'text-3xl sm:text-5xl lg:text-6xl font-black leading-tight'
                      : 'text-2xl sm:text-3xl lg:text-4xl font-bold leading-normal'
                    : fontSize === 'tv-large'
                    ? isActive
                      ? 'text-2xl sm:text-4xl lg:text-5xl font-black leading-tight'
                      : 'text-xl sm:text-2xl lg:text-3xl font-bold leading-normal'
                    : isActive
                    ? 'text-xl sm:text-3xl lg:text-4xl font-black leading-tight'
                    : 'text-lg sm:text-xl lg:text-2xl font-bold leading-normal';

                return (
                  <div
                    key={`${idx}_${line.time}`}
                    data-tv-line={idx}
                    onClick={() => onSeek(line.time)}
                    className={`cursor-pointer transition-all duration-300 rounded-2xl px-4 py-2 text-left relative ${
                      isActive
                        ? `${textSizeClass} text-white drop-shadow-[0_0_25px_rgba(52,211,153,0.6)] scale-[1.03] origin-left bg-emerald-500/10 border-l-4 border-emerald-400 pl-6`
                        : isPassed
                        ? `${textSizeClass} text-neutral-500/70 hover:text-neutral-300 opacity-60 hover:opacity-100`
                        : isNext
                        ? `${textSizeClass} text-neutral-300 opacity-80 hover:opacity-100`
                        : `${textSizeClass} text-neutral-600 hover:text-neutral-400 opacity-40 hover:opacity-100`
                    }`}
                  >
                    <span
                      className={`inline-block ${
                        isActive && isKaraokeHighlighter
                          ? 'bg-gradient-to-r from-emerald-300 via-teal-100 to-white bg-clip-text text-transparent drop-shadow-lg'
                          : ''
                      }`}
                    >
                      {line.text}
                    </span>
                    {isActive && (
                      <span className="ml-3 inline-flex items-center align-middle">
                        <Flame className="w-5 h-5 text-amber-400 animate-bounce inline-block" />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Fade Gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent pointer-events-none z-10" />
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
};
