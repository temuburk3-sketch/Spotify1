import React, { useState, memo, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, VolumeX, Maximize2, Mic2, ListMusic, Sliders, WifiOff, HardDrive, Repeat1, Radio, Sparkles, Heart, Tv } from 'lucide-react';
import { Track, RepeatMode, ShuffleMode, AudioSettings } from '../../types';
import { detectTrackTheme } from '../../services/recommendationService';
import { isTrackFollowed, toggleFollowTrack, subscribeToFollowChanges } from '../../services/followService';

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
  onOpenTVStage?: () => void;
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
  onStartSongRadio,
  onOpenTVStage
}) => {
  const [isFollowed, setIsFollowed] = useState<boolean>(false);

  useEffect(() => {
    if (!currentTrack) return;
    setIsFollowed(isTrackFollowed(currentTrack.id) || isTrackFollowed(currentTrack.title));

    const unsubscribe = subscribeToFollowChanges(() => {
      setIsFollowed(isTrackFollowed(currentTrack.id) || isTrackFollowed(currentTrack.title));
    });
    return unsubscribe;
  }, [currentTrack?.id, currentTrack?.title]);

  const handleToggleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentTrack) return;
    const nowFollowed = toggleFollowTrack(currentTrack);
    setIsFollowed(nowFollowed);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentTheme = currentTrack ? detectTrackTheme(currentTrack) : null;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="relative bg-neutral-950/95 border-t border-neutral-800/80 z-40 backdrop-blur-2xl select-none shrink-0">
      {/* Mobile Top Thin Progress Bar */}
      <div
        className="block md:hidden w-full h-1 bg-neutral-800/80 cursor-pointer relative overflow-hidden"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const pct = Math.max(0, Math.min(1, clickX / rect.width));
          onSeek(pct * (duration || 100));
        }}
      >
        <div
          className="h-full bg-emerald-400 transition-all duration-100"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Bar Content */}
      <div className="h-16 sm:h-20 px-3 sm:px-6 flex items-center justify-between gap-2">
        {/* Left Track Info */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-1 sm:flex-initial sm:w-1/4 min-w-0">
          {currentTrack ? (
            <>
              <div
                onClick={onOpenFullPlayer}
                className="relative w-11 h-11 sm:w-14 sm:h-14 rounded-xl overflow-hidden shrink-0 cursor-pointer group shadow-lg border border-white/10 active:scale-95 transition"
              >
                <img
                  src={currentTrack.coverUrl}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
                {isPlaying && (
                  <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/70 rounded backdrop-blur-xs flex items-center gap-0.5">
                    <span className="w-0.5 h-2.5 bg-emerald-400 animate-pulse" />
                    <span className="w-0.5 h-3.5 bg-emerald-400 animate-pulse delay-75" />
                    <span className="w-0.5 h-1.5 bg-emerald-400 animate-pulse delay-150" />
                  </div>
                )}
              </div>

              <div
                onClick={onOpenFullPlayer}
                className="min-w-0 flex-1 cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <div className="text-xs sm:text-sm font-extrabold text-white truncate hover:text-emerald-400 transition">
                    {currentTrack.title}
                  </div>
                  {isRadioActive && (
                    <span className="shrink-0 px-1 py-0.2 rounded text-[8px] sm:text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Radyo
                    </span>
                  )}
                </div>
                <div className="text-[10px] sm:text-[11px] text-neutral-400 truncate font-medium mt-0.5">
                  {currentTrack.artist}
                </div>
                {currentTheme && (
                  <div className="hidden sm:flex items-center gap-1.5 mt-0.5">
                    <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.2 rounded border ${currentTheme.color}`}>
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

              {/* Follow Song Button (Heart) */}
              <button
                onClick={handleToggleFollow}
                className={`p-1.5 sm:p-2 rounded-full transition active:scale-90 cursor-pointer ${
                  isFollowed
                    ? 'text-rose-500 bg-rose-500/10'
                    : 'text-neutral-500 hover:text-rose-400 hover:bg-neutral-800'
                }`}
                title={isFollowed ? 'Şarkı Takip Ediliyor (Favori)' : 'Şarkıyı Takip Et'}
              >
                <Heart className={`w-4 h-4 ${isFollowed ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>
            </>
          ) : (
            <div className="text-xs text-neutral-500 font-medium">Çalınacak şarkı seçin</div>
          )}
        </div>

        {/* Mobile Quick Action Buttons (< 640px) */}
        <div className="flex sm:hidden items-center gap-1 shrink-0">
          <button
            onClick={onOpenFullPlayer}
            className="p-2 text-neutral-400 hover:text-white active:scale-95 transition"
            title="Sözler & Oynatıcı"
          >
            <Mic2 className="w-4 h-4" />
          </button>

          <button
            onClick={onPrev}
            disabled={!currentTrack}
            className="p-2 text-neutral-300 hover:text-white disabled:opacity-30 active:scale-95 transition"
            title="Önceki"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={onTogglePlay}
            disabled={!currentTrack}
            className="w-10 h-10 rounded-full bg-emerald-500 active:bg-emerald-400 text-black flex items-center justify-center shadow-lg shadow-emerald-500/25 active:scale-90 transition"
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
            disabled={!currentTrack}
            className="p-2 text-neutral-300 hover:text-white disabled:opacity-30 active:scale-95 transition"
            title="Sonraki"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>
        </div>

        {/* Desktop Center Controls & Progress (>= 640px) */}
        <div className="hidden sm:flex flex-col items-center max-w-xl w-2/4 px-2">
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
                  ? '✨ Akıllı Tematik Karışık Çalma (Aynı tarz şarkılar)'
                  : shuffleMode === 'random'
                  ? '🔀 Standart Karışık Çalma'
                  : 'Sıralı Çalma'
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
              className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black flex items-center justify-center transition transform hover:scale-105 shadow-md shadow-emerald-500/20"
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
              disabled={!currentTrack}
              className="p-1.5 text-neutral-300 hover:text-white disabled:opacity-40 transition"
              title="Sonraki Şarkı"
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

          {/* Desktop Scrub Bar */}
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

        {/* Desktop Right Controls (>= 640px) */}
        <div className="hidden sm:flex items-center justify-end gap-2 md:gap-3 sm:w-1/4 min-w-[160px]">
          {onOpenTVStage && (
            <button
              onClick={onOpenTVStage}
              className="p-1.5 text-neutral-400 hover:text-emerald-400 transition"
              title="Televizyon & Sahne Karaoke Modu"
            >
              <Tv className="w-4 h-4 text-emerald-400 animate-pulse" />
            </button>
          )}

          <button
            onClick={onOpenFullPlayer}
            className="p-1.5 text-neutral-400 hover:text-white transition"
            title="Şarkı Sözleri & Büyük Ekran"
          >
            <Mic2 className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenQueue}
            className="p-1.5 text-neutral-400 hover:text-white transition"
            title="Çalma Sırası"
          >
            <ListMusic className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenEqualizer}
            className="p-1.5 text-neutral-400 hover:text-emerald-400 transition"
            title="Ekolayzer & Ses Ayarları"
          >
            <Sliders className="w-4 h-4" />
          </button>

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
          <div className="flex items-center gap-1.5 ml-1">
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
    </div>
  );
});

PlayerBar.displayName = 'PlayerBar';
