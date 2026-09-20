import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, X, Plus, Check, Play, Loader2, RefreshCw, Radio, Heart } from 'lucide-react';
import { Playlist, Track } from '../../types';
import { fetchPlaylistRadioRecommendations } from '../../services/recommendationService';
import confetti from 'canvas-confetti';

interface AutoExpandPlaylistModalProps {
  isOpen: boolean;
  playlist: Playlist;
  onClose: () => void;
  onAddTracks: (playlistId: string, tracks: Track[]) => void;
  onPlayTrack: (track: Track) => void;
}

export const AutoExpandPlaylistModal: React.FC<AutoExpandPlaylistModalProps> = ({
  isOpen,
  playlist,
  onClose,
  onAddTracks,
  onPlayTrack
}) => {
  const [suggestions, setSuggestions] = useState<Track[]>([]);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [radioTheme, setRadioTheme] = useState<string>('');

  useEffect(() => {
    if (isOpen && playlist?.id) {
      loadPlaylistMatches();
    }
  }, [isOpen, playlist?.id]);

  const loadPlaylistMatches = async () => {
    if (!playlist) return;
    setIsLoading(true);
    try {
      const res = await fetchPlaylistRadioRecommendations(playlist, {
        count: 12,
        refresh: true,
        seed: Math.floor(Math.random() * 1000000)
      });
      setSuggestions(res.tracks);
      setRadioTheme(res.themeName);
      // Pre-select all by default for easy 1-click addition
      setSelectedTrackIds(new Set(res.tracks.map(r => r.id)));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedTrackIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedTrackIds(next);
  };

  const handleApply = () => {
    if (!playlist) return;
    const tracksToAdd = suggestions.filter(s => selectedTrackIds.has(s.id));
    if (tracksToAdd.length > 0) {
      onAddTracks(playlist.id, tracksToAdd);
      confetti({ particleCount: 70, spread: 80 });
    }
    onClose();
  };

  if (!isOpen || !playlist) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-950/60 via-neutral-900 to-indigo-950/60 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{playlist.name} Şarkı Radyosu & Önerileri</span>
                {radioTheme && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                    {radioTheme}
                  </span>
                )}
              </h2>
              <p className="text-xs text-neutral-400">
                Beğendiğin sanatçılar & şarkılar öncelikli, arada değişiklik için özel keşif önerileri
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={loadPlaylistMatches}
              disabled={isLoading}
              className="p-2 rounded-xl text-neutral-400 hover:text-emerald-400 hover:bg-neutral-800 transition cursor-pointer"
              title="Yeni Öneriler Getir"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-neutral-400">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-sm font-semibold text-neutral-300">
                Beğendiğin sanatçılar taranıyor ve radyo önerileri hazırlanıyor...
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                <span>Eklemek istediğin parçaları işaretle ({selectedTrackIds.size} / {suggestions.length} seçildi)</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (selectedTrackIds.size === suggestions.length) setSelectedTrackIds(new Set());
                      else setSelectedTrackIds(new Set(suggestions.map(s => s.id)));
                    }}
                    className="text-emerald-400 font-bold hover:underline cursor-pointer"
                  >
                    {selectedTrackIds.size === suggestions.length ? 'Seçimi Temizle' : 'Tümünü Seç'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {suggestions.map((track) => {
                  const isSelected = selectedTrackIds.has(track.id);
                  const isFav = track.recommendationReason?.includes('Beğendiğin');
                  const isDiscovery = track.recommendationReason?.includes('Değişiklik') || track.recommendationReason?.includes('Keşif');

                  return (
                    <div
                      key={track.id}
                      onClick={() => toggleSelect(track.id)}
                      className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-950/30 border-emerald-500/40'
                          : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition shrink-0 ${
                          isSelected ? 'bg-emerald-500 border-emerald-400 text-black' : 'border-neutral-700 bg-neutral-900'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        <img
                          src={track.coverUrl}
                          alt={track.title}
                          className="w-11 h-11 rounded-lg object-cover border border-neutral-800 shrink-0"
                        />

                        <div className="min-w-0">
                          <div className="font-bold text-sm text-white truncate flex items-center gap-1.5">
                            <span className="truncate">{track.title}</span>
                            {isFav && (
                              <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-0.5">
                                <Heart className="w-2.5 h-2.5 fill-rose-400 text-rose-400" />
                                <span>Öncelikli</span>
                              </span>
                            )}
                            {isDiscovery && (
                              <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                ✨ Değişiklik
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-neutral-400 truncate">{track.artist}</div>
                          {track.recommendationReason && (
                            <div className="text-[10px] text-emerald-300/90 truncate mt-0.5">
                              {track.recommendationReason}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlayTrack(track);
                          }}
                          className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition cursor-pointer"
                          title="Önizlemeyi Dinle"
                        >
                          <Play className="w-4 h-4 fill-current" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-neutral-400 hover:text-white transition cursor-pointer"
          >
            İptal
          </button>

          <button
            onClick={handleApply}
            disabled={selectedTrackIds.size === 0 || isLoading}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Seçilen {selectedTrackIds.size} Şarkıyı Listeye Ekle</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
