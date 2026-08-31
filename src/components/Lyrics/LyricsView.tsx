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
  Sliders,
  Globe,
  Loader2,
  CheckCircle2,
  Bot,
  ExternalLink,
  Tv
} from 'lucide-react';
import { Track } from '../../types';
import { fetchLyricsForTrack, fetchLyricsWithGemini, LyricsResponse } from '../../services/lyricsService';
import { detectTrackTheme } from '../../services/recommendationService';
import { audioEngine } from '../../services/audioEngine';
import { tvSyncService } from '../../services/tvSyncService';

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
  onOpenTVStage?: () => void;
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
  onPlayTrack,
  onOpenTVStage
}) => {
  const [lyricsData, setLyricsData] = useState<LyricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeminiSearching, setIsGeminiSearching] = useState<boolean>(false);
  const [autoFollow, setAutoFollow] = useState<boolean>(true);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'huge'>('large');
  const [viewMode, setViewMode] = useState<'synced' | 'plain'>('synced');
  const [copied, setCopied] = useState<boolean>(false);
  const [isKaraokeMode, setIsKaraokeMode] = useState<boolean>(false);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const showNotification = (msg: string) => {
    setStatusNotification(msg);
    setTimeout(() => {
      setStatusNotification((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Fetch lyrics when track changes (Immediately reset old song lyrics)
  useEffect(() => {
    if (!currentTrack) {
      setLyricsData(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    // CRITICAL: Immediately clear stale lyrics from previous song
    setLyricsData(null);
    setIsLoading(true);

    fetchLyricsForTrack(currentTrack).then((res) => {
      if (isMounted) {
        setLyricsData(res);
        setIsLoading(false);

        // Update TV / Chromecast Cast Subtitle Track
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

        // If lyrics are not authentic or were only fallback, automatically trigger Gemini Web Search
        if (res.source === 'fallback' || res.source === 'local_fallback') {
          handleSearchWithGemini(false);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentTrack?.id, currentTrack?.title, currentTrack?.artist]);

  // Handler to search internet using Gemini AI
  const handleSearchWithGemini = async (isManualClick: boolean = true) => {
    if (!currentTrack) return;
    setIsGeminiSearching(true);
    if (isManualClick) {
      showNotification('✨ Gemini şarkı sözlerini internette arıyor...');
    }

    try {
      const result = await fetchLyricsWithGemini(currentTrack, true);
      if (result && Array.isArray(result.timedLyrics) && result.timedLyrics.length > 0) {
        setLyricsData(result);
        if (isManualClick) {
          showNotification('✨ Şarkı sözleri Gemini AI ile internetten bulunup senkronize edildi!');
        }
      }
    } catch (err) {
      console.warn('Gemini search failed:', err);
      if (isManualClick) {
        showNotification('Şarkı sözleri aranırken bir sorun oluştu.');
      }
    } finally {
      setIsGeminiSearching(false);
    }
  };

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

  const isGeminiSourced = lyricsData?.source === 'gemini_search_grounded' || lyricsData?.source === 'gemini_synced';
  const isFallbackSourced = lyricsData?.source === 'fallback' || lyricsData?.source === 'local_fallback';

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-950 relative overflow-hidden select-none">
      {/* Dynamic Ambient Background Blur */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none blur-3xl scale-125 transition-all duration-1000"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 30%, #10b981 0%, #064e3b 50%, #000000 100%)`
        }}
      />

      {/* Status Toast Notification */}
      {statusNotification && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 border border-emerald-400/40 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{statusNotification}</span>
        </div>
      )}

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
          {/* Gemini AI Web Search Button */}
          <button
            onClick={() => handleSearchWithGemini(true)}
            disabled={isGeminiSearching}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer border ${
              isGeminiSearching
                ? 'bg-purple-950/70 border-purple-500/50 text-purple-300 animate-pulse'
                : isGeminiSourced
                ? 'bg-purple-900/30 border-purple-500/40 text-purple-300 hover:bg-purple-900/50'
                : 'bg-gradient-to-r from-purple-600/20 to-emerald-600/20 border-purple-500/30 text-neutral-200 hover:border-purple-400 hover:text-white'
            }`}
            title="Gemini AI ile internette şarkı sözlerini ara ve senkronize et"
          >
            {isGeminiSearching ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            )}
            <span className="hidden sm:inline">
              {isGeminiSearching ? "Gemini Aranıyor..." : isGeminiSourced ? "Gemini ile Yenile" : "Gemini ile Bul"}
            </span>
          </button>

          {/* TV & Sahne Karaoke Modu Button */}
          {onOpenTVStage && (
            <button
              onClick={onOpenTVStage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-300 border border-emerald-400/40 transition cursor-pointer shadow-md shadow-emerald-500/10"
              title="Televizyon ve Büyük Ekran Karaoke Görünümünü Aç"
            >
              <Tv className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">TV & Sahne</span>
            </button>
          )}

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
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition cursor-pointer"
            title={`Yazı Boyutu: ${fontSize}`}
          >
            {fontSize === 'huge' ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
          </button>

          {/* Copy Lyrics */}
          <button
            onClick={handleCopyLyrics}
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition cursor-pointer"
            title="Şarkı Sözlerini Kopyala"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Song Radio */}
          {onStartSongRadio && (
            <button
              onClick={() => onStartSongRadio(currentTrack)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-neutral-900 border border-neutral-700 text-amber-300 hover:border-amber-400/60 transition cursor-pointer"
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
        {/* Gemini Active Internet Search Banner */}
        {isGeminiSearching && (
          <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-gradient-to-r from-purple-900/40 via-neutral-900 to-emerald-900/40 border border-purple-500/30 backdrop-blur-md flex items-center justify-between gap-3 shadow-2xl animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-400/30 flex items-center justify-center text-purple-300 shrink-0">
                <Bot className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  <span>Gemini İnternette Şarkı Sözlerini Arıyor</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </p>
                <p className="text-[11px] text-neutral-400">
                  Resmi web veritabanları taranıyor ve zaman damgaları senkronize ediliyor...
                </p>
              </div>
            </div>
            <Loader2 className="w-5 h-5 animate-spin text-purple-400 shrink-0" />
          </div>
        )}

        {/* Sync Status Banner */}
        <div className={`flex items-center justify-between mb-4 flex-wrap gap-2 ${isKaraokeMode ? 'justify-center' : ''}`}>
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-400 flex-wrap">
            <Mic2 className="w-4 h-4 text-emerald-400" />
            <span className="flex items-center gap-1.5">
              {lyricsData?.source === 'gemini_search_grounded' ? (
                <span className="inline-flex items-center gap-1 text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-500/40">
                  <Globe className="w-3 h-3 text-purple-400" /> Gemini AI (İnternet Arama Destekli)
                </span>
              ) : lyricsData?.source === 'gemini_synced' ? (
                <span className="inline-flex items-center gap-1 text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-500/40">
                  <Sparkles className="w-3 h-3 text-purple-400" /> Gemini AI Canlı Senkronize
                </span>
              ) : lyricsData?.source === 'lrclib' ? (
                <span className="text-emerald-400">LRC Orijinal Senkronize</span>
              ) : lyricsData?.source === 'verified_catalog' ? (
                <span className="text-emerald-400">Doğrulanmış Orijinal Stüdyo Sözleri</span>
              ) : (
                <span className="text-neutral-400">Senkronize Akış</span>
              )}
            </span>

            {/* Web sources pills if available */}
            {lyricsData?.webSources && lyricsData.webSources.length > 0 && (
              <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded-full border border-neutral-800">
                <Globe className="w-2.5 h-2.5 text-neutral-400" />
                Kaynak: {lyricsData.webSources.join(', ')}
              </span>
            )}
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
            className="p-2 text-neutral-300 hover:text-white transition active:scale-90 cursor-pointer"
            title="Önceki"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={onTogglePlay}
            className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shadow-lg shadow-emerald-500/20 active:scale-95 transition cursor-pointer"
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
            className="p-2 text-neutral-300 hover:text-white transition active:scale-90 cursor-pointer"
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
