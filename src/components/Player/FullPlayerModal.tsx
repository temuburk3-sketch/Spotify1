import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, Mic2, Activity, Sliders, ChevronDown, Flame, BookmarkCheck, Radio, Sparkles, Repeat1 } from 'lucide-react';
import { Track, RepeatMode, ShuffleMode, AudioSettings } from '../../types';
import { AudioVisualizer } from './AudioVisualizer';
import { audioEngine } from '../../services/audioEngine';
import { detectTrackTheme } from '../../services/recommendationService';

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
  const [activeTab, setActiveTab] = useState<'cover' | 'lyrics'>('cover');
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen || !track) return null;

  const currentTheme = detectTrackTheme(track);

  const timedLyrics = track.timedLyrics || [
    { time: 0, text: '🎵 ' + track.title },
    { time: 10, text: 'Sözler otomatik senkronize ediliyor...' },
    { time: 25, text: 'Şarkının ritmini hisset' },
    { time: 45, text: 'SoundPulse Premium Deneyimi' },
    { time: 70, text: 'Kesintisiz, reklamsız müzik keyfi' },
    { time: 110, text: 'Arka planda ve internetsiz çalmaya hazır' }
  ];

  const currentLyricIndex = timedLyrics.reduce((prevIdx, item, idx) => {
    if (currentTime >= item.time) return idx;
    return prevIdx;
  }, 0);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950/95 backdrop-blur-xl text-neutral-100 overflow-hidden">
        {/* Ambient background glow */}
        <div
          className="absolute inset-0 opacity-20 blur-3xl scale-110 pointer-events-none transition-all duration-1000"
          style={{
            backgroundImage: `url(${track.coverUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />

        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/20">
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-white/10 transition"
          >
            <ChevronDown className="w-6 h-6" />
          </button>

          <div className="text-center">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest block">
              ŞU AN ÇALINIYOR
            </span>
            <h2 className="text-sm font-bold text-white truncate max-w-xs">{track.album || track.title}</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenEqualizer}
              className="p-2 text-neutral-400 hover:text-emerald-400 rounded-full hover:bg-white/10 transition"
              title="Ekolayzer"
            >
              <Sliders className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center Content */}
        <div className="relative z-10 flex-1 flex flex-col md:flex-row items-center justify-center p-6 md:p-12 gap-8 max-w-5xl mx-auto w-full overflow-y-auto">
          {/* Track Cover / Visualizer */}
          <div className="flex flex-col items-center max-w-sm w-full">
            <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">
              <img
                src={track.coverUrl}
                alt={track.title}
                className="w-full h-full object-cover transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>

            {/* Frequency Visualizer */}
            <div className="w-full mt-4 px-2">
              <AudioVisualizer isPlaying={isPlaying} color="#1ed760" type="bars" className="w-full h-10" />
            </div>
          </div>

          {/* Lyrics / Details Panel */}
          <div className="flex-1 w-full max-w-lg flex flex-col h-full justify-between">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">{track.title}</h1>
                    {isRadioActive && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Radio className="w-3 h-3" /> Radyo Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-sm md:text-base font-semibold text-emerald-400 mt-1">{track.artist}</p>
                  {currentTheme && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${currentTheme.color}`}>
                        {currentTheme.displayName}
                      </span>
                      {onStartSongRadio && (
                        <button
                          onClick={() => onStartSongRadio(track)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-700 hover:border-amber-400/60 text-amber-300 transition"
                          title="Bu şarkının tarzında sonsuz radyo akışı başlat"
                        >
                          <Radio className="w-3 h-3" /> Şarkı Radyosunu Başlat
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onToggleABLoop}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition border ${
                      isABActive
                        ? 'bg-amber-500 text-black border-amber-400'
                        : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white'
                    }`}
                    title="A-B Bölüm Tekrarlayıcı"
                  >
                    A-B Tekrar
                  </button>
                </div>
              </div>
            </div>

            {/* Synchronized Lyrics Container */}
            <div
              ref={lyricsContainerRef}
              className="flex-1 bg-black/30 rounded-2xl p-6 border border-white/10 overflow-y-auto max-h-64 space-y-4 scroll-smooth"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                <Mic2 className="w-4 h-4 text-emerald-400" /> Senkronize Şarkı Sözleri
              </div>
              {timedLyrics.map((line, idx) => {
                const isActive = idx === currentLyricIndex;
                return (
                  <div
                    key={idx}
                    onClick={() => onSeek(line.time)}
                    className={`cursor-pointer transition-all duration-300 rounded-xl p-2 text-sm md:text-base ${
                      isActive
                        ? 'text-white font-extrabold scale-102 bg-white/10 pl-3 border-l-4 border-emerald-400'
                        : 'text-neutral-500 font-medium hover:text-neutral-300'
                    }`}
                  >
                    {line.text}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Playback Controls */}
        <div className="relative z-10 px-6 py-6 border-t border-white/10 bg-black/40 max-w-4xl mx-auto w-full">
          {/* Progress Bar */}
          <div className="space-y-1 mb-4">
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
              className={`p-2 rounded-full transition relative flex items-center justify-center ${
                shuffleMode === 'smart'
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : shuffleMode === 'random'
                  ? 'text-cyan-400 bg-cyan-500/10'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title={
                shuffleMode === 'smart'
                  ? '✨ Akıllı Tematik Karışık Çalma (Aynı tarz & tema şarkıları çalar)'
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
                className="p-3 text-neutral-300 hover:text-white rounded-full hover:bg-white/10 transition"
                title="Önceki Şarkı"
              >
                <SkipBack className="w-6 h-6 fill-current" />
              </button>

              <button
                onClick={onTogglePlay}
                className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center transition transform hover:scale-105 shadow-xl shadow-emerald-500/30"
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
              </button>

              <button
                onClick={onNext}
                className="p-3 text-neutral-300 hover:text-white rounded-full hover:bg-white/10 transition"
                title="Sonraki Şarkı (Sınırsız Atlama)"
              >
                <SkipForward className="w-6 h-6 fill-current" />
              </button>
            </div>

            <button
              onClick={onToggleRepeat}
              className={`p-2 rounded-full transition relative ${
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
