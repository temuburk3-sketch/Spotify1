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
  Check,
  QrCode,
  PictureInPicture2,
  Monitor,
  Info,
  Smartphone,
  RadioTower,
  KeyRound,
  ArrowRight,
  Airplay,
  ArrowLeft,
  ChevronDown,
  Home
} from 'lucide-react';
import { Track } from '../../types';
import { fetchLyricsForTrack, fetchLyricsWithGemini, LyricsResponse } from '../../services/lyricsService';
import { detectTrackTheme } from '../../services/recommendationService';
import { tvSyncService } from '../../services/tvSyncService';
import { audioEngine } from '../../services/audioEngine';
import { tvCastStreamEngine } from '../../services/tvCastStreamEngine';

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
  const [showTVGuide, setShowTVGuide] = useState<boolean>(false);
  const [isPiPActive, setIsPiPActive] = useState<boolean>(false);
  const [isCastVideoActive, setIsCastVideoActive] = useState<boolean>(false);
  const [activeRoomCode, setActiveRoomCode] = useState<string>(tvSyncService.getRoomCode());
  const [roomInput, setRoomInput] = useState<string>(tvSyncService.getRoomCode());
  const [isEditingRoom, setIsEditingRoom] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const lyricsScrollRef = useRef<HTMLDivElement | null>(null);
  const liveVideoPreviewRef = useRef<HTMLVideoElement | null>(null);

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
  }, [isPlaying, Math.floor(currentTime), duration, isOpen, currentTrack?.id]);

  // Subscribe to TV Sync changes (if second screen or remote changes)
  useEffect(() => {
    const unsub = tvSyncService.subscribe((state) => {
      if (state.roomCode) {
        setActiveRoomCode(state.roomCode);
      }
    });
    return unsub;
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

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

  // Live Canvas Video Stream Loop (Renders 1080p Stage for Chromecast / Video Cast / PiP)
  useEffect(() => {
    if (!isOpen) {
      tvCastStreamEngine.stopRenderLoop();
      return;
    }

    tvCastStreamEngine.startRenderLoop(() => ({
      track: currentTrack,
      isPlaying,
      currentTime,
      duration,
      lyricsData,
      activeLineIndex: currentLineIndex,
      timedLyrics
    }));

    // Attach stream to preview video element if available
    const stream = tvCastStreamEngine.getMediaStream();
    if (liveVideoPreviewRef.current && stream) {
      liveVideoPreviewRef.current.srcObject = stream;
      liveVideoPreviewRef.current.play().catch(() => {});
    }

    return () => {
      tvCastStreamEngine.stopRenderLoop();
    };
  }, [isOpen, currentTrack, isPlaying, currentTime, duration, lyricsData, currentLineIndex, timedLyrics]);

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
    const url = `${window.location.origin}${window.location.pathname}?tv=stage&room=${encodeURIComponent(activeRoomCode)}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Picture-in-Picture with Live Video Lyrics
  const handleTogglePiP = async () => {
    const res = await tvCastStreamEngine.triggerPictureInPicture();
    setIsPiPActive(res);
  };

  // Google Cast / AirPlay Video Stream Prompt
  const handleCastVideoToTV = async () => {
    setIsCastVideoActive(true);
    const castRes = await tvCastStreamEngine.triggerRemoteCastPrompt();
    if (!castRes) {
      setShowTVGuide(true);
    }
  };

  const handleApplyRoomCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomInput.trim()) {
      const clean = roomInput.trim().toUpperCase();
      tvSyncService.setRoomCode(clean);
      setActiveRoomCode(clean);
      setIsEditingRoom(false);
    }
  };

  if (!isOpen || !currentTrack) return null;

  const currentTheme = detectTrackTheme(currentTrack);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const tvUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?tv=stage&room=${encodeURIComponent(activeRoomCode)}`
    : '';

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
        <div className="relative z-20 flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-white/10 bg-black/60 backdrop-blur-xl shrink-0 gap-2">
          {/* Left: Prominent Back to Home Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-black text-xs transition shadow-md shadow-emerald-500/20 cursor-pointer"
              title="Ana Sayfaya Dön"
            >
              <ArrowLeft className="w-4 h-4 text-black" />
              <span>Ana Sayfa</span>
            </button>

            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-white/10">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                <Tv className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xs font-black tracking-tight text-white uppercase">
                    TV & Sahne
                  </h1>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-500 text-black">
                    CANLI
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-medium">
                  <span>PIN:</span>
                  <span className="font-mono font-black text-emerald-400">
                    {activeRoomCode}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: TV Actions & Close Button (Always visible) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* TV Connect / Pin Code Button */}
            <button
              onClick={() => setShowTVGuide(true)}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-emerald-300 border border-white/15 transition cursor-pointer"
              title="TV Eşleme Kodu ve Bağlantı Rehberi"
            >
              <Cast className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">TV'ye Bağla</span>
              <span className="sm:hidden text-[11px]">PIN: {activeRoomCode}</span>
            </button>

            {/* Picture-in-Picture */}
            <button
              onClick={handleTogglePiP}
              className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                isPiPActive
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
              }`}
              title="Kayan Pencerede Canlı Sözler (PiP)"
            >
              <PictureInPicture2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Kayan TV</span>
            </button>

            {/* Popout / 2nd Screen Window */}
            <button
              onClick={handleOpenPopout}
              className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition cursor-pointer"
              title="İkinci ekranda / Harici TV monitöründe aç"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              <span>2. Ekran</span>
            </button>

            {/* Font Size Adjuster for TV */}
            <div className="hidden md:flex items-center bg-neutral-900 rounded-xl border border-neutral-700 p-0.5">
              <button
                onClick={() => setFontSize('tv-medium')}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition ${
                  fontSize === 'tv-medium' ? 'bg-emerald-500 text-black' : 'text-neutral-400 hover:text-white'
                }`}
                title="Orta Boyut"
              >
                A
              </button>
              <button
                onClick={() => setFontSize('tv-large')}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition ${
                  fontSize === 'tv-large' ? 'bg-emerald-500 text-black' : 'text-neutral-400 hover:text-white'
                }`}
                title="Büyük Boyut"
              >
                A+
              </button>
              <button
                onClick={() => setFontSize('tv-huge')}
                className={`px-2 py-0.5 rounded-lg text-xs font-black transition ${
                  fontSize === 'tv-huge' ? 'bg-emerald-500 text-black' : 'text-neutral-400 hover:text-white'
                }`}
                title="Dev Sahne Boyutu"
              >
                A++
              </button>
            </div>

            {/* Karaoke Highlighter Toggle */}
            <button
              onClick={() => setIsKaraokeHighlighter(!isKaraokeHighlighter)}
              className={`p-1.5 sm:p-2 rounded-xl border transition cursor-pointer ${
                isKaraokeHighlighter
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-700 hover:text-white'
              }`}
              title="Karaoke Vurgusu"
            >
              <Flame className="w-4 h-4" />
            </button>

            {/* Fullscreen F11 */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 sm:p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition cursor-pointer"
              title={isFullscreen ? 'Tam Ekrandan Çık' : 'Tam Ekran (TV Modu)'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Always-visible Close Button (Red Accent on hover) */}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 bg-neutral-800 hover:bg-rose-600 text-neutral-200 hover:text-white rounded-xl border border-white/15 transition cursor-pointer active:scale-90"
              title="Kapat ve Ana Sayfaya Dön"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Main TV Layout: Left (Track Artwork & Controls) + Right (Big Screen Synced Lyrics) */}
        <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 p-4 sm:p-8 md:p-12 overflow-hidden items-center">
          {/* Left Column: Huge Artwork & Playback Hub (5 cols on lg) */}
          <div className="lg:col-span-5 flex flex-col items-center lg:items-start justify-center h-full max-h-[85vh]">
            <div className="relative group w-36 sm:w-64 md:w-72 lg:w-88 aspect-square rounded-3xl overflow-hidden shadow-2xl border-2 border-white/15 bg-neutral-900 shrink-0">
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className="w-full h-full object-cover transition duration-700 group-hover:scale-105"
              />
              {isPlaying && (
                <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-full border border-white/20 flex items-center gap-1.5 shadow-lg">
                  <span className="w-1.5 h-3 bg-emerald-400 animate-pulse rounded-full" />
                  <span className="w-1.5 h-5 bg-emerald-400 animate-pulse delay-75 rounded-full" />
                  <span className="w-1.5 h-2.5 bg-emerald-400 animate-pulse delay-150 rounded-full" />
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider ml-0.5">Yayında</span>
                </div>
              )}
            </div>

            {/* Song Meta */}
            <div className="mt-4 sm:mt-6 text-center lg:text-left w-full">
              <div className="flex items-center justify-center lg:justify-start gap-2 mb-1">
                {currentTheme && (
                  <span className={`text-[10px] sm:text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${currentTheme.color}`}>
                    {currentTheme.displayName}
                  </span>
                )}
                {lyricsData?.source && (
                  <span className="text-[10px] sm:text-xs font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    {lyricsData.source === 'verified_catalog' ? 'Doğrulanmış Sözler' : 'Canlı Senkron'}
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight line-clamp-1 drop-shadow-md">
                {currentTrack.title}
              </h2>
              <p className="text-sm sm:text-lg font-bold text-emerald-400/90 truncate">
                {currentTrack.artist}
              </p>
            </div>

            {/* TV Progress Bar */}
            <div className="w-full mt-4 sm:mt-5">
              <div
                className="relative w-full h-2 sm:h-2.5 bg-white/15 rounded-full cursor-pointer overflow-hidden backdrop-blur-xs group"
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
              <div className="flex justify-between text-xs font-bold text-neutral-400 mt-1.5">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* TV Player Controls */}
            <div className="flex items-center justify-center lg:justify-start gap-3 sm:gap-4 mt-4 sm:mt-5 w-full">
              <button
                onClick={onPrev}
                className="p-2.5 sm:p-3 text-neutral-300 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer active:scale-90 shadow-md"
                title="Önceki Şarkı"
              >
                <SkipBack className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
              </button>
              <button
                onClick={onTogglePlay}
                className="p-3.5 sm:p-4 bg-gradient-to-tr from-emerald-500 to-teal-400 hover:scale-105 text-black rounded-full transition shadow-xl shadow-emerald-500/30 cursor-pointer active:scale-95"
                title={isPlaying ? 'Durdur' : 'Oynat'}
              >
                {isPlaying ? <Pause className="w-6 h-6 sm:w-7 sm:h-7 fill-black" /> : <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-black ml-0.5" />}
              </button>
              <button
                onClick={onNext}
                className="p-2.5 sm:p-3 text-neutral-300 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer active:scale-90 shadow-md"
                title="Sonraki Şarkı"
              >
                <SkipForward className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
              </button>

              {/* Volume */}
              <div className="hidden sm:flex items-center gap-2 ml-3 bg-white/5 px-3 py-1.5 rounded-2xl border border-white/10">
                <button onClick={onToggleMute} className="text-neutral-400 hover:text-white">
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
                  className="w-16 accent-emerald-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Giant Synced Karaoke Lyrics (7 cols on lg) */}
          <div className="lg:col-span-7 flex flex-col h-[50vh] lg:h-[82vh] relative overflow-hidden bg-black/30 rounded-3xl border border-white/10 p-3 sm:p-6 md:p-8 backdrop-blur-2xl shadow-2xl">
            {/* Top Fade Gradient */}
            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-neutral-950 via-neutral-950/60 to-transparent pointer-events-none z-10" />

            {/* Scrollable Lyric Lines */}
            <div
              ref={lyricsScrollRef}
              className="flex-1 overflow-y-auto no-scrollbar py-20 sm:py-28 px-1 sm:px-2 space-y-5 sm:space-y-7 scroll-smooth"
            >
              {timedLyrics.map((line, idx) => {
                const isActive = idx === currentLineIndex;
                const isPassed = idx < currentLineIndex;
                const isNext = idx === currentLineIndex + 1;

                const textSizeClass =
                  fontSize === 'tv-huge'
                    ? isActive
                      ? 'text-2xl sm:text-4xl lg:text-5xl font-black leading-tight'
                      : 'text-xl sm:text-2xl lg:text-3xl font-bold leading-normal'
                    : fontSize === 'tv-large'
                    ? isActive
                      ? 'text-xl sm:text-3xl lg:text-4xl font-black leading-tight'
                      : 'text-lg sm:text-xl lg:text-2xl font-bold leading-normal'
                    : isActive
                    ? 'text-lg sm:text-2xl lg:text-3xl font-black leading-tight'
                    : 'text-base sm:text-lg lg:text-xl font-bold leading-normal';

                return (
                  <div
                    key={`${idx}_${line.time}`}
                    data-tv-line={idx}
                    onClick={() => onSeek(line.time)}
                    className={`cursor-pointer transition-all duration-300 rounded-2xl px-3 sm:px-4 py-1.5 sm:py-2 text-left relative ${
                      isActive
                        ? `${textSizeClass} text-white drop-shadow-[0_0_25px_rgba(52,211,153,0.6)] scale-[1.02] origin-left bg-emerald-500/10 border-l-4 border-emerald-400 pl-4 sm:pl-6`
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
                      <span className="ml-2.5 inline-flex items-center align-middle">
                        <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 animate-bounce inline-block" />
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

        {/* TV Connection & Cast Guide Modal (Full Hub) */}
        {showTVGuide && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-8 max-w-xl w-full shadow-2xl relative my-auto">
              <button
                onClick={() => setShowTVGuide(false)}
                className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-full bg-neutral-800 transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-500/20">
                  <Tv className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">TV'de Canlı Sözler (Telefondan Açma)</h3>
                  <p className="text-xs text-neutral-400">Ekran paylaşımı yapmadan TV'de karaoke ve sözleri gösterin</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Method 1: TV PIN Code (Spotify Connect Style) */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-neutral-900 to-teal-950/30 border border-emerald-500/40 shadow-inner">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[10px] font-black uppercase">
                        1. YÖNTEM (EN KOLAY)
                      </span>
                      <span className="text-xs font-black text-emerald-300">TV Eşleme PIN Kodu</span>
                    </div>
                    <KeyRound className="w-4 h-4 text-emerald-400" />
                  </div>

                  <p className="text-xs text-neutral-300 leading-relaxed mb-3">
                    Televizyonunuzda sadece 1 defa tarayıcıyı açın. TV ekranı telefonunuzla anında eşleşir ve <b>telefonunuz kumanda olur</b>!
                  </p>

                  <div className="p-3 bg-black/60 rounded-xl border border-neutral-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-neutral-400">Geçerli TV PIN Kodu:</div>
                      <div className="text-2xl font-black text-emerald-400 tracking-wider font-mono">
                        {activeRoomCode}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={handleCopyTVUrl}
                        className="flex-1 sm:flex-none px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black rounded-lg transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Kopyalandı!' : 'TV Linkini Kopyala'}</span>
                      </button>

                      <button
                        onClick={() => setIsEditingRoom(!isEditingRoom)}
                        className="px-2.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-lg border border-neutral-700 transition"
                      >
                        Değiştir
                      </button>
                    </div>
                  </div>

                  {isEditingRoom && (
                    <form onSubmit={handleApplyRoomCode} className="mt-3 flex items-center gap-2">
                      <input
                        type="text"
                        value={roomInput}
                        onChange={(e) => setRoomInput(e.target.value)}
                        placeholder="Örn: SALON veya ODA"
                        maxLength={10}
                        className="flex-1 px-3 py-1.5 bg-black/80 border border-neutral-700 rounded-lg text-xs text-white uppercase font-mono outline-hidden focus:border-emerald-400"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-emerald-500 text-black text-xs font-bold rounded-lg transition"
                      >
                        Kaydet
                      </button>
                    </form>
                  )}

                  <div className="mt-2.5 text-[11px] text-neutral-400 bg-neutral-900/60 p-2 rounded-lg border border-neutral-800">
                    📺 TV Tarayıcısına yazılacak adres: <span className="font-mono text-emerald-400 select-all">{tvUrl}</span>
                  </div>
                </div>

                {/* Method 2: Live Video Cast (AirPlay / Chromecast Video with Lyrics) */}
                <div className="p-4 rounded-2xl bg-neutral-800/50 border border-neutral-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-black uppercase">
                        2. YÖNTEM
                      </span>
                      <span className="text-xs font-black text-blue-300">TV'ye Canlı Video Yayını (AirPlay / Cast)</span>
                    </div>
                    <RadioTower className="w-4 h-4 text-blue-400" />
                  </div>

                  <p className="text-xs text-neutral-300 leading-relaxed mb-3">
                    Sadece ses göndermek yerine, şarkı sözlerinin ve albüm kapağının olduğu <b>canlı video akışını</b> tek tıkla televizyonunuza aktarabilirsiniz:
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-3 bg-black/40 p-3 rounded-xl border border-neutral-800">
                    {/* Embedded Live Video Stream element */}
                    <div className="relative w-36 h-20 bg-black rounded-lg overflow-hidden border border-neutral-700 shrink-0">
                      <video
                        ref={liveVideoPreviewRef}
                        muted
                        playsInline
                        autoPlay
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 right-1 px-1 bg-emerald-500 text-black text-[8px] font-black rounded">
                        1080p
                      </span>
                    </div>

                    <div className="flex-1 text-center sm:text-left">
                      <div className="text-xs font-bold text-white mb-1">Sözlü Canlı Sahne Yayını</div>
                      <div className="text-[11px] text-neutral-400">Google Cast & AirPlay destekli akış</div>
                    </div>

                    <button
                      onClick={handleCastVideoToTV}
                      className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg flex items-center justify-center gap-2"
                    >
                      <Cast className="w-3.5 h-3.5" />
                      <span>TV'ye Gönder</span>
                    </button>
                  </div>
                </div>

                {/* Method 3: Phone Stand / Dock Mode */}
                <div className="p-4 rounded-2xl bg-neutral-800/40 border border-neutral-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-neutral-200">Telefonu Yatay Çevirin (Sahne Modu)</span>
                      <p className="text-[11px] text-neutral-400">Telefonu TV masasına veya standa koyarak karaoke yapın</p>
                    </div>
                  </div>
                  <button
                    onClick={toggleFullscreen}
                    className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-bold rounded-xl transition"
                  >
                    Tam Ekran
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowTVGuide(false)}
                className="w-full mt-5 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition cursor-pointer"
              >
                Anladım, Kapat
              </button>
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
