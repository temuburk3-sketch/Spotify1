import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import {
  Mic2,
  Sparkles,
  Search,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Radio,
  Share2,
  Flame,
  Volume2,
  RefreshCw,
  Sliders
} from 'lucide-react';
import { Track } from '../../types';
import { fetchLyricsForTrack, LyricsResponse } from '../../services/lyricsService';
import { detectTrackTheme } from '../../services/recommendationService';

interface LyricsViewProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onStartSongRadio?: (track: Track) => void;
  onPlayTrack?: (track: Track) => void;
}

export const LyricsView: React.FC<LyricsViewProps> = memo(({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onStartSongRadio,
  onPlayTrack
}) => {
  const [lyricsData, setLyricsData] = useState<LyricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [autoFollow, setAutoFollow] = useState<boolean>(true);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'huge'>('large');
  const [viewMode, setViewMode] = useState<'synced' | 'plain'>('synced');
  const [copied, setCopied] = useState<boolean>(false);
  const [isKaraokeMode, setIsKaraokeMode] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fetch lyrics when track changes
  useEffect(() => {
    if (!currentTrack) {
      setLyricsData(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    fetchLyricsForTrack(currentTrack).then((res) => {
      if (isMounted) {
        setLyricsData(res);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentTrack?.id, currentTrack?.title, currentTrack?.artist]);

  // Timed lines from response or fallback
  const timedLyrics = useMemo(() => {
    if (lyricsData?.timedLyrics && lyricsData.timedLyrics.length > 0) {
      return lyricsData.timedLyrics;
    }
    if (currentTrack?.timedLyrics && currentTrack.timedLyrics.length > 0) {
      return currentTrack.timedLyrics;
    }
    return [
      { time: 0, text: `🎵 ${currentTrack?.title || 'Şarkı'}` },
      { time: 8, text: currentTrack?.artist || 'Sanatçı' },
      { time: 20, text: 'Şarkı sözleri yükleniyor...' },
      { time: 45, text: 'SoundPulse Senkronize Karaoke Akışı' }
    ];
  }, [lyricsData, currentTrack]);

  // Find active line index based on playback time
  const currentLineIndex = useMemo(() => {
    if (!timedLyrics || timedLyrics.length === 0) return 0;
    return timedLyrics.reduce((prevIdx, item, idx) => {
      if (currentTime >= item.time) return idx;
      return prevIdx;
    }, 0);
  }, [timedLyrics, currentTime]);

  // Auto-scroll smooth to active lyric line with exact center locking
  useEffect(() => {
    if (!autoFollow || !containerRef.current || viewMode !== 'synced') return;

    const activeEl = containerRef.current.querySelector<HTMLElement>(`[data-lyric-line="${currentLineIndex}"]`);
    if (activeEl) {
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();
      const relativeTop = activeRect.top - containerRect.top + container.scrollTop;
      const targetScroll = relativeTop - (container.clientHeight / 2) + (activeEl.clientHeight / 2);

      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth'
      });
    }
  }, [currentLineIndex, autoFollow, viewMode, fontSize, isKaraokeMode]);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleCopyLyrics = () => {
    const textToCopy = lyricsData?.plainLyrics || timedLyrics.map(t => t.text).join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentTheme = currentTrack ? detectTrackTheme(currentTrack) : null;

  if (!currentTrack) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-neutral-950">
        <div className="w-20 h-20 rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-5 shadow-2xl text-emerald-400">
          <Mic2 className="w-10 h-10 animate-pulse" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight mb-2">Canlı Senkronize Şarkı Sözleri</h2>
        <p className="text-neutral-400 text-sm max-w-md mb-6 leading-relaxed">
          Şarkı sözlerini ve karaoke akışını görmek için bir şarkı çalmaya başlayın.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-950 relative overflow-hidden select-none">
      {/* Dynamic Ambient Background Blur */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none blur-3xl scale-125 transition-all duration-1000"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 30%, #10b981 0%, #064e3b 50%, #000000 100%)`
        }}
      />

      {/* Top Header Controls Bar */}
      <div className="relative z-10 px-4 sm:px-8 py-4 border-b border-white/10 bg-neutral-950/80 backdrop-blur-xl flex items-center justify-between gap-3 shrink-0">
        {/* Track Title & Artist Info */}
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={currentTrack.coverUrl}
            alt={currentTrack.title}
            className="w-12 h-12 rounded-xl object-cover shadow-lg border border-white/10 shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white truncate">{currentTrack.title}</h2>
              {currentTheme && (
                <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentTheme.color}`}>
                  {currentTheme.displayName}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm font-semibold text-emerald-400 truncate">{currentTrack.artist}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Karaoke Sing-Along Mode Toggle */}
          <button
            onClick={() => setIsKaraokeMode(!isKaraokeMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition cursor-pointer border ${
              isKaraokeMode
                ? 'bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/20'
                : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:text-white'
            }`}
            title="Büyük Ekran Karaoke Şarkı Söyleme Modu"
          >
            <Flame className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isKaraokeMode ? 'Karaoke Açık' : 'Karaoke'}</span>
          </button>

          {/* Synced vs Plain view toggle */}
          <div className="flex items-center bg-neutral-900 p-0.5 rounded-xl border border-neutral-800">
            <button
              onClick={() => setViewMode('synced')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'synced' ? 'bg-emerald-500 text-black shadow' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Senkronize
            </button>
            <button
              onClick={() => setViewMode('plain')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'plain' ? 'bg-emerald-500 text-black shadow' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Tam Metin
            </button>
          </div>

          {/* Font Size Zoom */}
          <button
            onClick={() => {
              if (fontSize === 'normal') setFontSize('large');
              else if (fontSize === 'large') setFontSize('huge');
              else setFontSize('normal');
            }}
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition"
            title={`Yazı Boyutu: ${fontSize}`}
          >
            {fontSize === 'huge' ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
          </button>

          {/* Copy Lyrics */}
          <button
            onClick={handleCopyLyrics}
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition"
            title="Şarkı Sözlerini Kopyala"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Song Radio */}
          {onStartSongRadio && (
            <button
              onClick={() => onStartSongRadio(currentTrack)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-neutral-900 border border-neutral-700 text-amber-300 hover:border-amber-400/60 transition"
              title="Bu şarkının tarzında benzer şarkılar radyosu başlat"
            >
              <Radio className="w-3.5 h-3.5" /> Şarkı Radyosu
            </button>
          )}
        </div>
      </div>

      {/* Main Lyrics Display Area */}
      <div
        ref={containerRef}
        className={`relative z-10 flex-1 overflow-y-auto px-4 sm:px-12 py-10 space-y-6 scroll-smooth ${
          isKaraokeMode ? 'text-center' : ''
        }`}
      >
        {/* Sync Status Banner */}
        <div className={`flex items-center justify-between mb-4 ${isKaraokeMode ? 'justify-center' : ''}`}>
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-400">
            <Mic2 className="w-4 h-4 text-emerald-400" />
            <span>
              {lyricsData?.source === 'lrclib'
                ? 'LRC Orijinal Senkronize'
                : lyricsData?.source === 'gemini_synced'
                ? 'Gemini AI Canlı Senkronize'
                : lyricsData?.source === 'verified_catalog'
                ? 'Doğrulanmış Orijinal Stüdyo Sözleri'
                : 'Senkronize Canlı Akış'}
            </span>
          </div>

          {!isKaraokeMode && (
            <button
              onClick={() => setAutoFollow(!autoFollow)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition border cursor-pointer ${
                autoFollow
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{autoFollow ? 'Otomatik Kaydırma Açık' : 'Kaydırma Kapalı'}</span>
            </button>
          )}
        </div>

        {/* View Mode: Synchronized Karaoke */}
        {viewMode === 'synced' ? (
          <div className="space-y-6 max-w-3xl mx-auto py-[35vh]">
            {timedLyrics.map((line, idx) => {
              const isActive = idx === currentLineIndex;
              const distance = Math.abs(idx - currentLineIndex);

              let sizeClass = 'text-lg md:text-xl';
              if (fontSize === 'large') sizeClass = 'text-xl md:text-3xl';
              if (fontSize === 'huge') sizeClass = 'text-2xl md:text-4xl';

              let opacityClass = 'opacity-80 text-neutral-300';
              let scaleClass = 'scale-95';

              if (isActive) {
                opacityClass = 'opacity-100 text-white';
                scaleClass = 'scale-105 sm:scale-110';
              } else if (distance === 1) {
                opacityClass = 'opacity-65 text-neutral-400';
                scaleClass = 'scale-98';
              } else if (distance === 2) {
                opacityClass = 'opacity-35 text-neutral-500';
                scaleClass = 'scale-95';
              } else {
                opacityClass = 'opacity-15 text-neutral-600';
                scaleClass = 'scale-90';
              }

              return (
                <div
                  key={idx}
                  data-lyric-line={idx}
                  onClick={() => onSeek(line.time)}
                  className={`group cursor-pointer transition-all duration-500 ease-out rounded-3xl p-4 sm:p-5 flex items-start gap-4 origin-left ${scaleClass} ${
                    isKaraokeMode ? 'justify-center text-center origin-center' : ''
                  } ${
                    isActive
                      ? `font-black ${sizeClass} bg-gradient-to-r from-emerald-500/20 via-white/10 to-transparent border-l-4 border-emerald-400 shadow-2xl shadow-emerald-500/20 pl-6 sm:pl-8`
                      : `font-semibold ${sizeClass} hover:opacity-90 hover:text-neutral-200`
                  } ${opacityClass}`}
                >
                  {!isKaraokeMode && (
                    <span className="text-[11px] font-mono text-neutral-500 opacity-0 group-hover:opacity-100 transition mt-1.5 shrink-0">
                      {formatTime(line.time)}
                    </span>
                  )}
                  <span className="leading-relaxed tracking-tight">{line.text}</span>
                </div>
              );
            })}
          </div>
        ) : (
          /* View Mode: Plain Text */
          <div className="max-w-2xl mx-auto py-8 bg-neutral-900/60 rounded-3xl p-8 border border-neutral-800 text-neutral-200 whitespace-pre-line leading-loose text-base md:text-lg font-medium">
            {lyricsData?.plainLyrics || timedLyrics.map(t => t.text).join('\n')}
          </div>
        )}

        {/* Follow Resume Pill if disabled */}
        {!autoFollow && viewMode === 'synced' && (
          <div className="sticky bottom-6 flex justify-center z-20">
            <button
              onClick={() => setAutoFollow(true)}
              className="px-5 py-2.5 bg-emerald-500 text-black text-xs font-black rounded-full shadow-2xl hover:bg-emerald-400 transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Sparkles className="w-4 h-4" /> Şarkı Akışına Geri Dön
            </button>
          </div>
        )}
      </div>

      {/* Floating Karaoke Quick Bar at Bottom */}
      <div className="relative z-10 px-6 py-3 border-t border-white/10 bg-black/80 backdrop-blur-xl flex items-center justify-between gap-4 max-w-4xl mx-auto w-full shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onPrev}
            className="p-2 text-neutral-300 hover:text-white transition active:scale-90"
            title="Önceki"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={onTogglePlay}
            className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shadow-lg shadow-emerald-500/20 active:scale-95 transition"
            title={isPlaying ? 'Duraklat' : 'Çal'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={onNext}
            className="p-2 text-neutral-300 hover:text-white transition active:scale-90"
            title="Sonraki"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>
        </div>

        {/* Time Progress */}
        <div className="flex-1 flex items-center gap-3 max-w-md">
          <span className="text-[11px] font-mono text-neutral-400">{formatTime(currentTime)}</span>
          <div className="relative flex-1">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
          <span className="text-[11px] font-mono text-neutral-400">{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
});

LyricsView.displayName = 'LyricsView';
