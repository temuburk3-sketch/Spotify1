import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  HardDrive,
  DownloadCloud,
  WifiOff,
  Trash2,
  CheckCircle2,
  Music,
  RefreshCw,
  Play,
  Check,
  Disc,
  FolderOpen,
  ArrowDownToLine,
  Sparkles
} from 'lucide-react';
import { getCachedAudioStats, clearAllCachedAudio, removeAudioBlobFromCache } from '../../services/storage';
import { Playlist, Track } from '../../types';

interface OfflineManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOfflineMode: boolean;
  onToggleOfflineMode: () => void;
  playlists: Playlist[];
  onDownloadAllPlaylists: () => Promise<void>;
  onClearAllOffline: () => Promise<void>;
  onPlayTrack?: (track: Track) => void;
}

export const OfflineManagerModal: React.FC<OfflineManagerModalProps> = ({
  isOpen,
  onClose,
  isOfflineMode,
  onToggleOfflineMode,
  playlists,
  onDownloadAllPlaylists,
  onClearAllOffline,
  onPlayTrack
}) => {
  const [stats, setStats] = useState<{ count: number; totalSizeBytes: number; trackIds: string[] }>({
    count: 0,
    totalSizeBytes: 0,
    trackIds: []
  });
  const [isClearing, setIsClearing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'tracks'>('overview');

  const fetchStats = async () => {
    const s = await getCachedAudioStats();
    setStats(s);
  };

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen, playlists]);

  if (!isOpen) return null;

  const totalSizeMB = (stats.totalSizeBytes / (1024 * 1024)).toFixed(1);

  // Collect all unique tracks that are offline cached
  const downloadedTracks: { track: Track; playlistName: string }[] = [];
  const seenIds = new Set<string>();

  for (const p of playlists) {
    for (const t of p.tracks) {
      if ((t.isOfflineCached || stats.trackIds.includes(t.id)) && !seenIds.has(t.id)) {
        seenIds.add(t.id);
        downloadedTracks.push({ track: t, playlistName: p.name });
      }
    }
  }

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      await onClearAllOffline();
      await fetchStats();
    } catch (e) {
      console.error(e);
    } finally {
      setIsClearing(false);
    }
  };

  const handleDownloadAll = async () => {
    setIsDownloading(true);
    try {
      await onDownloadAllPlaylists();
      await fetchStats();
    } catch (e) {
      console.error(e);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden text-neutral-100 flex flex-col max-h-[90dvh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/70">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                  <span>Çevrimdışı İndirme & Depolama</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 font-mono">
                    INDEXEDDB
                  </span>
                </h2>
                <p className="text-xs text-neutral-400">İnternet bağlantınız olmasa bile sınırsız müzik dinleyin</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 px-6 pt-3 pb-1 border-b border-neutral-800 bg-neutral-950/40 text-xs font-bold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-2 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'border-emerald-500 text-emerald-400 font-extrabold'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" /> Genel Bakış & Ayarlar
            </button>
            <button
              onClick={() => setActiveTab('tracks')}
              className={`pb-2 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'tracks'
                  ? 'border-emerald-500 text-emerald-400 font-extrabold'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Music className="w-3.5 h-3.5" /> İndirilen Parçalar ({downloadedTracks.length || stats.count})
            </button>
          </div>

          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {activeTab === 'overview' && (
              <>
                {/* Offline Mode Switch */}
                <div
                  onClick={onToggleOfflineMode}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                    isOfflineMode
                      ? 'bg-amber-500/15 border-amber-500/40 text-white shadow-lg shadow-amber-500/10'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`p-3 rounded-xl ${
                        isOfflineMode ? 'bg-amber-500 text-black font-black' : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      <WifiOff className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Yalnızca Çevrimdışı Modu</span>
                        {isOfflineMode && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 animate-pulse">
                            AKTİF
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {isOfflineMode
                          ? 'Aktif: Yalnızca cihazdaki şarkılar dinlenir, sıfır internet tüketilir.'
                          : 'Kapalı: Hem internet akışı hem de cihazdaki çevrimdışı şarkılar çalınır.'}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-12 h-6 rounded-full transition flex items-center px-0.5 ${
                      isOfflineMode ? 'bg-amber-500 justify-end' : 'bg-neutral-800 justify-start'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-white shadow-md" />
                  </div>
                </div>

                {/* Storage Metric Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800">
                    <div className="text-xs text-neutral-400 mb-1 font-semibold">Cihaza İndirilen</div>
                    <div className="text-2xl font-black text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      <span>{downloadedTracks.length || stats.count} Şarkı</span>
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-1">İnternetsiz çalmaya hazır</div>
                  </div>

                  <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800">
                    <div className="text-xs text-neutral-400 mb-1 font-semibold">Kullanılan Hafıza</div>
                    <div className="text-2xl font-black text-white font-mono flex items-baseline gap-1">
                      <span>{totalSizeMB}</span>
                      <span className="text-xs text-neutral-400 font-sans font-normal">MB</span>
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-1">IndexedDB Depolama Alanı</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 pt-2">
                  <button
                    onClick={handleDownloadAll}
                    disabled={isDownloading}
                    className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl text-xs font-bold transition shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                  >
                    {isDownloading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> İndiriliyor, lütfen bekleyin...
                      </>
                    ) : (
                      <>
                        <DownloadCloud className="w-4 h-4" /> Tüm Çalma Listelerini Çevrimdışı İndir
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleClearCache}
                    disabled={stats.count === 0 && downloadedTracks.length === 0 || isClearing}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-neutral-950 hover:bg-rose-950/40 text-neutral-400 hover:text-rose-400 disabled:opacity-30 rounded-2xl text-xs font-semibold border border-neutral-800 transition cursor-pointer"
                  >
                    {isClearing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-400" /> Temizleniyor...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" /> İndirilen Şarkı Hafızasını Tamamen Temizle (Sıfırla)
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {activeTab === 'tracks' && (
              <div className="space-y-2">
                {downloadedTracks.length === 0 ? (
                  <div className="py-12 text-center text-neutral-500">
                    <Music className="w-10 h-10 mx-auto mb-2 opacity-30 text-emerald-400" />
                    <p className="text-sm font-bold text-neutral-300">Henüz çevrimdışı şarkı indirilmedi</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      Şarkı veya liste yanındaki indirme butonuna basarak internetsiz dinlemeye başlayabilirsiniz.
                    </p>
                  </div>
                ) : (
                  downloadedTracks.map(({ track, playlistName }) => (
                    <div
                      key={track.id}
                      className="p-3 bg-neutral-950 hover:bg-neutral-800/60 rounded-xl border border-neutral-800/80 flex items-center justify-between transition group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={track.coverUrl}
                          alt={track.title}
                          className="w-10 h-10 rounded-lg object-cover shrink-0 border border-neutral-800"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition">
                            {track.title}
                          </div>
                          <div className="text-[11px] text-neutral-400 truncate">{track.artist}</div>
                          <div className="text-[9px] text-neutral-500 flex items-center gap-1 mt-0.5 font-mono">
                            <span className="text-emerald-400 font-bold">✓ İndirildi</span>
                            <span>•</span>
                            <span className="truncate">{playlistName}</span>
                          </div>
                        </div>
                      </div>

                      {onPlayTrack && (
                        <button
                          onClick={() => onPlayTrack(track)}
                          className="p-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black rounded-lg transition cursor-pointer"
                          title="Çal"
                        >
                          <Play className="w-4 h-4 fill-current" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 bg-neutral-950 border-t border-neutral-800">
            <div className="text-[11px] text-neutral-500">
              {stats.count > 0 ? `${stats.count} parça cihaz belleğinde saklanıyor` : 'Depolama alanı boş'}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-full transition cursor-pointer"
            >
              Kapat
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
