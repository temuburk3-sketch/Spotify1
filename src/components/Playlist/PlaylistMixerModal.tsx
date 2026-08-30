import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Shuffle, 
  X, 
  Plus, 
  ListMusic, 
  Play, 
  Check, 
  SlidersHorizontal, 
  Layers, 
  Sparkles, 
  Save, 
  Disc,
  ArrowRightLeft
} from 'lucide-react';
import { Playlist, Track } from '../../types';
import confetti from 'canvas-confetti';

interface PlaylistMixerModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: Playlist[];
  onPlayMixedTracks: (tracks: Track[], mixTitle: string) => void;
  onAddMixedToQueue: (tracks: Track[], mixTitle: string) => void;
  onCreateMixedPlaylist: (name: string, tracks: Track[]) => void;
}

export const PlaylistMixerModal: React.FC<PlaylistMixerModalProps> = ({
  isOpen,
  onClose,
  playlists,
  onPlayMixedTracks,
  onAddMixedToQueue,
  onCreateMixedPlaylist
}) => {
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<string[]>(() => {
    return playlists.slice(0, 2).map(p => p.id);
  });
  const [mixStrategy, setMixStrategy] = useState<'shuffle' | 'interleave' | 'sequential'>('shuffle');
  const [customMixName, setCustomMixName] = useState('');
  const [removeDuplicates, setRemoveDuplicates] = useState(true);

  const selectedPlaylists = useMemo(() => {
    return playlists.filter(p => selectedPlaylistIds.includes(p.id));
  }, [playlists, selectedPlaylistIds]);

  const togglePlaylist = (id: string) => {
    if (selectedPlaylistIds.includes(id)) {
      if (selectedPlaylistIds.length <= 1) return; // keep at least 1
      setSelectedPlaylistIds(prev => prev.filter(pId => pId !== id));
    } else {
      setSelectedPlaylistIds(prev => [...prev, id]);
    }
  };

  // Generate blended/mixed track list based on selected strategy
  const blendedTracks = useMemo(() => {
    if (selectedPlaylists.length === 0) return [];

    let combined: Track[] = [];

    if (mixStrategy === 'sequential') {
      for (const pl of selectedPlaylists) {
        combined.push(...pl.tracks);
      }
    } else if (mixStrategy === 'interleave') {
      // 1 track from list A, 1 track from list B, etc.
      const maxLen = Math.max(...selectedPlaylists.map(p => p.tracks.length), 0);
      for (let i = 0; i < maxLen; i++) {
        for (const pl of selectedPlaylists) {
          if (pl.tracks[i]) {
            combined.push(pl.tracks[i]);
          }
        }
      }
    } else {
      // Pure Smart Shuffle
      for (const pl of selectedPlaylists) {
        combined.push(...pl.tracks);
      }
      // Fisher-Yates
      for (let i = combined.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [combined[i], combined[j]] = [combined[j], combined[i]];
      }
    }

    if (removeDuplicates) {
      const seen = new Set<string>();
      combined = combined.filter(t => {
        const key = `${t.title.toLowerCase().trim()}_${(t.artist || '').toLowerCase().trim()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    return combined;
  }, [selectedPlaylists, mixStrategy, removeDuplicates]);

  const defaultMixName = useMemo(() => {
    if (selectedPlaylists.length === 0) return 'Özel Mix';
    const names = selectedPlaylists.map(p => p.name.split(' ')[0]).join(' × ');
    return `Mix: ${names}`;
  }, [selectedPlaylists]);

  const totalDurationSecs = useMemo(() => {
    return blendedTracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  }, [blendedTracks]);

  const formattedTime = useMemo(() => {
    const hours = Math.floor(totalDurationSecs / 3600);
    const mins = Math.floor((totalDurationSecs % 3600) / 60);
    if (hours > 0) return `${hours} sa ${mins} dk`;
    return `${mins} dk`;
  }, [totalDurationSecs]);

  if (!isOpen) return null;

  const handlePlayNow = () => {
    if (blendedTracks.length === 0) return;
    const title = customMixName.trim() || defaultMixName;
    onPlayMixedTracks(blendedTracks, title);
    confetti({ particleCount: 50, spread: 60 });
    onClose();
  };

  const handleAddToQueue = () => {
    if (blendedTracks.length === 0) return;
    const title = customMixName.trim() || defaultMixName;
    onAddMixedToQueue(blendedTracks, title);
    confetti({ particleCount: 40, spread: 50 });
    onClose();
  };

  const handleSavePlaylist = () => {
    if (blendedTracks.length === 0) return;
    const title = customMixName.trim() || defaultMixName;
    onCreateMixedPlaylist(title, blendedTracks);
    confetti({ particleCount: 80, spread: 80 });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-950/70 via-neutral-900 to-indigo-950/70 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Shuffle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Çalma Listesi Mixleyici (Blend & Merge)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Spotify Blend
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Birden fazla listenizi birleştirin, akıllıca karıştırın ve sıraya ekleyin.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* Step 1: Select Playlists */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>1. Karıştırılacak Listeleri Seç ({selectedPlaylistIds.length} seçili)</span>
              </label>
              <span className="text-[11px] text-neutral-400">
                {selectedPlaylistIds.length >= 2 ? 'Harmanlamaya hazır' : 'En az 2 liste seçin'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {playlists.map(playlist => {
                const isSelected = selectedPlaylistIds.includes(playlist.id);
                return (
                  <div
                    key={playlist.id}
                    onClick={() => togglePlaylist(playlist.id)}
                    className={`p-3 rounded-xl border transition flex items-center gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500/50 shadow-sm'
                        : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition shrink-0 ${
                      isSelected ? 'bg-emerald-500 border-emerald-400 text-black' : 'border-neutral-700 bg-neutral-900'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <img
                      src={playlist.tracks[0]?.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600'}
                      alt={playlist.name}
                      className="w-10 h-10 rounded-lg object-cover border border-neutral-800 shrink-0"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-white truncate">{playlist.name}</div>
                      <div className="text-[11px] text-neutral-400">{playlist.tracks.length} Şarkı</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2: Mixing Strategy */}
          <div>
            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
              <span>2. Harmanlama & Karıştırma Yöntemi</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMixStrategy('shuffle')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  mixStrategy === 'shuffle'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                    : 'bg-neutral-950/50 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-emerald-400 mb-1">
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Tam Karışık (Shuffle)</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-snug">
                  Tüm listelerdeki şarkıları rastgele eşit oranda harmanlar.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMixStrategy('interleave')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  mixStrategy === 'interleave'
                    ? 'bg-indigo-500/15 border-indigo-500/50 text-white'
                    : 'bg-neutral-950/50 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-indigo-400 mb-1">
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Dönüşümlü (Blend)</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-snug">
                  1 şarkı A listesinden, 1 şarkı B listesinden sırayla çalar.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMixStrategy('sequential')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  mixStrategy === 'sequential'
                    ? 'bg-amber-500/15 border-amber-500/50 text-white'
                    : 'bg-neutral-950/50 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-amber-400 mb-1">
                  <ListMusic className="w-3.5 h-3.5" />
                  <span>Uca Uca Ekle</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-snug">
                  Önce ilk liste biter, ardından ikinci liste başlar.
                </p>
              </button>
            </div>
          </div>

          {/* Options & Preview Stats */}
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={removeDuplicates}
                  onChange={(e) => setRemoveDuplicates(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 bg-neutral-900 border-neutral-700"
                />
                <span>Mükerrer (Tekrar Eden) Şarkıları Filtrele</span>
              </label>
            </div>

            <div className="flex items-center gap-3 text-neutral-400">
              <span className="font-bold text-white">{blendedTracks.length} Şarkı</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">{formattedTime} Süre</span>
            </div>
          </div>

          {/* Custom Name */}
          <div>
            <label className="text-xs font-semibold text-neutral-400 mb-1.5 block">
              Mix Adı (İsteğe Bağlı):
            </label>
            <input
              type="text"
              value={customMixName}
              onChange={(e) => setCustomMixName(e.target.value)}
              placeholder={defaultMixName}
              className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-neutral-400 hover:text-white transition cursor-pointer"
          >
            Vazgeç
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSavePlaylist}
              disabled={blendedTracks.length === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition border border-neutral-700 disabled:opacity-40 cursor-pointer"
              title="Yeni bir Çalma Listesi olarak arşivine kaydet"
            >
              <Save className="w-3.5 h-3.5 text-indigo-400" />
              <span>Yeni Liste Olarak Kaydet</span>
            </button>

            <button
              onClick={handleAddToQueue}
              disabled={blendedTracks.length === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/20 disabled:opacity-40 cursor-pointer"
              title="Mixi mevcut çalma sırasına (Queue) ekle"
            >
              <ListMusic className="w-3.5 h-3.5" />
              <span>Sıraya Ekle ({blendedTracks.length})</span>
            </button>

            <button
              onClick={handlePlayNow}
              disabled={blendedTracks.length === 0}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-500/20 disabled:opacity-40 cursor-pointer"
              title="Mixi hemen başlat"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Hemen Mixi Çal</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
