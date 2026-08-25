import React, { useState, memo } from 'react';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, VolumeX, Maximize2, Mic2, ListMusic, Sliders, WifiOff, HardDrive, Repeat1, Radio, Sparkles } from 'lucide-react';
import { Track, RepeatMode, ShuffleMode, AudioSettings } from '../../types';
import { detectTrackTheme } from '../../services/recommendationService';

interface PlayerBarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  shuffleMode?: ShuffleMode;
  isABActive: boolean;
  volume: number;
  isMuted: boolean;
  isOfflineMode: boolean;
  isRadioActive?: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onToggleRepeat: () => void;
  onToggleShuffle: () => void;
  onToggleABLoop: () => void;
  onChangeVolume: (vol: number) => void;
  onToggleMute: () => void;
  onOpenFullPlayer: () => void;
  onOpenQueue: () => void;
  onOpenEqualizer: () => void;
  onOpenOfflineManager: () => void;
  onStartSongRadio?: (track: Track) => void;
}

export const PlayerBar: React.FC<PlayerBarProps> = memo(({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  repeatMode,
  isShuffle,
  shuffleMode = isShuffle ? 'smart' : 'off',
  isABActive,
  volume,
  isMuted,
  isOfflineMode,
  isRadioActive = false,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onToggleRepeat,
  onToggleShuffle,
  onToggleABLoop,
  onChangeVolume,
  onToggleMute,
  onOpenFullPlayer,
  onOpenQueue,
  onOpenEqualizer,
  onOpenOfflineManager,
  onStartSongRadio
}) => {
  const [isHoveringSeek, setIsHoveringSeek] = useState(false);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentTheme = currentTrack ? detectTrackTheme(currentTrack) : null;

  return (
    <div className="h-20 md:h-22 bg-neutral-950/95 border-t border-neutral-800/80 px-4 md:px-6 flex items-center justify-between z-40 backdrop-blur-lg select-none">
      {/* Left Track Info */}
      <div className="flex items-center gap-3 w-1/4 min-w-[180px]">
        {currentTrack ? (
          <>
            <div
              onClick={onOpenFullPlayer}
              className="relative w-12 h-12 md:w-14 md:h-14 rounded-lg overflow-hidden shrink-0 cursor-pointer group shadow-md"
            >
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className="w-full h-full object-cover transition duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                <Maximize2 className="w-4 h-4 text-white" />
              </div>
            </div>

            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-1.5">
                <div
                  onClick={onOpenFullPlayer}
                  className="text-xs md:text-sm font-bold text-white truncate cursor-pointer hover:underline"
                >
                  {currentTrack.title}
                </div>
                {isRadioActive && (
                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                    <Radio className="w-2.5 h-2.5" /> Radyo
                  </span>
                )}
              </div>
              <div className="text-[11px] text-neutral-400 truncate hover:text-neutral-200 cursor-pointer">
                {currentTrack.artist}
              </div>
              {currentTheme && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.2 rounded border ${currentTheme.color}`}>
                    {currentTheme.displayName}
                  </span>
                  {currentTrack.isOfflineCached && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400">
                      <HardDrive className="w-2.5 h-2.5" /> İndirildi
                    </span>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-xs text-neutral-500">Çalınacak şarkı seçin</div>
        )}
      </div>

      {/* Center Controls & Progress */}
      <div className="flex flex-col items-center max-w-xl w-2/4 px-2">
        {/* Buttons */}
        <div className="flex items-center gap-3 md:gap-5 mb-1.5">
          <button
            onClick={onToggleShuffle}
            className={`p-1.5 rounded-full transition relative flex items-center justify-center ${
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
            <Shuffle className="w-4 h-4" />
            {shuffleMode === 'smart' && (
              <span className="absolute -top-1 -right-1 text-[8px] font-black text-emerald-400">✨</span>
            )}
          </button>

          <button
            onClick={onPrev}
            disabled={!currentTrack}
            className="p-1.5 text-neutral-300 hover:text-white disabled:opacity-40 transition"
            title="Önceki Şarkı"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={onTogglePlay}
            disabled={!currentTrack}
            className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black flex items-center justify-center transition transform hover:scale-105 shadow-md shadow-emerald-500/20"
            title={isPlaying ? 'Duraklat' : 'Çal'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 md:w-5 md:h-5 fill-current" />
            ) : (
              <Play className="w-4 h-4 md:w-5 md:h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={onNext}
            disabled={!currentTrack}
            className="p-1.5 text-neutral-300 hover:text-white disabled:opacity-40 transition"
            title="Sonraki Şarkı (Sınırsız Atlama)"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={onToggleRepeat}
            className={`p-1.5 rounded-full transition relative ${
              repeatMode !== 'off' ? 'text-emerald-400' : 'text-neutral-400 hover:text-white'
            }`}
            title={`Tekrar Modu: ${repeatMode === 'one' ? 'Tek Şarkı' : repeatMode === 'all' ? 'Tüm Liste' : 'Kapalı'}`}
          >
            {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
          </button>

          {currentTrack && onStartSongRadio && (
            <button
              onClick={() => onStartSongRadio(currentTrack)}
              className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white hover:border-emerald-500/50 transition"
              title="Bu şarkının tarzında sonsuz radyo başlat"
            >
              <Radio className="w-3.5 h-3.5 text-amber-400" /> Şarkı Radyosu
            </button>
          )}
        </div>

        {/* Scrub Bar */}
        <div className="w-full flex items-center gap-2">
          <span className="text-[10px] font-mono text-neutral-400 w-8 text-right">{formatTime(currentTime)}</span>
          <div className="relative flex-1 group py-1">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              className="w-full h-1 bg-neutral-800 group-hover:h-1.5 rounded-lg appearance-none cursor-pointer accent-emerald-500 transition-all"
            />
          </div>
          <span className="text-[10px] font-mono text-neutral-400 w-8">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center justify-end gap-2 md:gap-3 w-1/4 min-w-[180px]">
        {/* Fullscreen Lyrics / Player button */}
        <button
          onClick={onOpenFullPlayer}
          className="p-1.5 text-neutral-400 hover:text-white transition"
          title="Şarkı Sözleri & Büyük Ekran"
        >
          <Mic2 className="w-4 h-4" />
        </button>

        {/* Queue Drawer */}
        <button
          onClick={onOpenQueue}
          className="p-1.5 text-neutral-400 hover:text-white transition"
          title="Çalma Sırası"
        >
          <ListMusic className="w-4 h-4" />
        </button>

        {/* Equalizer */}
        <button
          onClick={onOpenEqualizer}
          className="p-1.5 text-neutral-400 hover:text-emerald-400 transition"
          title="Ekolayzer & Ses Ayarları"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Offline Manager badge */}
        <button
          onClick={onOpenOfflineManager}
          className={`p-1.5 rounded-lg transition ${
            isOfflineMode ? 'text-amber-400 bg-amber-500/10' : 'text-neutral-400 hover:text-white'
          }`}
          title="Çevrimdışı Modu & Depolama"
        >
          {isOfflineMode ? <WifiOff className="w-4 h-4" /> : <HardDrive className="w-4 h-4" />}
        </button>

        {/* Volume Slider */}
        <div className="hidden sm:flex items-center gap-1.5 ml-1">
          <button onClick={onToggleMute} className="text-neutral-400 hover:text-white p-1">
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
            className="w-16 md:w-20 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>
      </div>
    </div>
  );
});

PlayerBar.displayName = 'PlayerBar';
