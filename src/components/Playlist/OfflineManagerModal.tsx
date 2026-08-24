import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, HardDrive, DownloadCloud, WifiOff, Trash2, CheckCircle2, Music, RefreshCw } from 'lucide-react';
import { getCachedAudioStats, clearAllCachedAudio } from '../../services/storage';
import { Playlist, Track } from '../../types';

interface OfflineManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOfflineMode: boolean;
  onToggleOfflineMode: () => void;
  playlists: Playlist[];
  onDownloadAllPlaylists: () => void;
}

export const OfflineManagerModal: React.FC<OfflineManagerModalProps> = ({
  isOpen,
  onClose,
  isOfflineMode,
  onToggleOfflineMode,
  playlists,
  onDownloadAllPlaylists
}) => {
  const [stats, setStats] = useState<{ count: number; totalSizeBytes: number; trackIds: string[] }>({
    count: 0,
    totalSizeBytes: 0,
    trackIds: []
  });
  const [isClearing, setIsClearing] = useState(false);

  const fetchStats = async () => {
    const s = await getCachedAudioStats();
    setStats(s);
  };

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalSizeMB = (stats.totalSizeBytes / (1024 * 1024)).toFixed(1);

  const handleClearCache = async () => {
    if (confirm('İndirilen tüm çevrimdışı müzik dosyaları cihazınızdan silinsin mi?')) {
      setIsClearing(true);
      await clearAllCachedAudio();
      await fetchStats();
      setIsClearing(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden text-neutral-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/60">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Çevrimdışı İndirme & Depolama</h2>
                <p className="text-xs text-neutral-400">İnternet bağlantınız olmasa bile kesintisiz müzik dinleyin</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Offline Mode Toggle */}
            <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${isOfflineMode ? 'bg-amber-500 text-black' : 'bg-neutral-800 text-neutral-400'}`}>
                  <WifiOff className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    Sadece Çevrimdışı Modu
                    {isOfflineMode && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        AKTİF
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    {isOfflineMode
                      ? 'Yalnızca cihazınıza kaydedilen şarkılar çalınır, sıfır internet harcanır.'
                      : 'Hem internetli yayınlar hem de cihazdaki şarkılar dinlenebilir.'}
                  </p>
                </div>
              </div>
              <button
                onClick={onToggleOfflineMode}
                className={`w-12 h-6 rounded-full transition flex items-center px-0.5 ${
                  isOfflineMode ? 'bg-amber-500 justify-end' : 'bg-neutral-800 justify-start'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-white shadow-md" />
              </button>
            </div>

            {/* Storage Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800">
                <div className="text-xs text-neutral-400 mb-1">İndirilen Şarkılar</div>
                <div className="text-2xl font-black text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-5 h-5" /> {stats.count}
                </div>
                <div className="text-[10px] text-neutral-500 mt-1">İnternetsiz çalmaya hazır</div>
              </div>

              <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800">
                <div className="text-xs text-neutral-400 mb-1">Kullanılan Alan</div>
                <div className="text-2xl font-black text-white font-mono">
                  {totalSizeMB} <span className="text-xs text-neutral-400 font-sans">MB</span>
                </div>
                <div className="text-[10px] text-neutral-500 mt-1">IndexedDB Cihaz Hafızası</div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  onDownloadAllPlaylists();
                  setTimeout(fetchStats, 1500);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-500/20"
              >
                <DownloadCloud className="w-4 h-4" /> Tüm Listeleri Çevrimdışı İndir
              </button>

              <button
                onClick={handleClearCache}
                disabled={stats.count === 0 || isClearing}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-neutral-950 hover:bg-rose-950/40 text-neutral-400 hover:text-rose-400 disabled:opacity-40 rounded-xl text-xs font-semibold border border-neutral-800 transition"
              >
                <Trash2 className="w-3.5 h-3.5" /> İndirilen Şarkı Hafızasını Temizle
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end px-6 py-4 bg-neutral-950 border-t border-neutral-800">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-full transition"
            >
              Kapat
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
