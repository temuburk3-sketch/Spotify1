import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UploadCloud, Music, Check, FolderPlus, Disc } from 'lucide-react';
import { Playlist, Track } from '../../types';
import { saveAudioBlobToCache } from '../../services/storage';

interface LocalFileImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: Playlist[];
  currentPlaylistId?: string;
  onAddTracks: (tracks: Track[], targetPlaylistId: string) => void;
}

export const LocalFileImportModal: React.FC<LocalFileImportModalProps> = ({
  isOpen,
  onClose,
  playlists,
  currentPlaylistId,
  onAddTracks
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(currentPlaylistId || playlists[0]?.id || '');
  const [importedFiles, setImportedFiles] = useState<{ file: File; duration: number }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const newItems: { file: File; duration: number }[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|ogg|flac|m4a|aac)$/i)) {
        // Read duration via audio element
        const duration = await new Promise<number>((resolve) => {
          const tempAudio = new Audio();
          tempAudio.src = URL.createObjectURL(file);
          tempAudio.onloadedmetadata = () => {
            resolve(Math.round(tempAudio.duration) || 180);
          };
          tempAudio.onerror = () => resolve(180);
        });
        newItems.push({ file, duration });
      }
    }

    setImportedFiles(prev => [...prev, ...newItems]);
  };

  const handleConfirmImport = async () => {
    if (importedFiles.length === 0) return;
    setIsProcessing(true);

    const generatedTracks: Track[] = [];

    for (const item of importedFiles) {
      const file = item.file;
      const cleanName = file.name.replace(/\.[^/.]+$/, "");
      const parts = cleanName.split('-');
      const artist = parts.length > 1 ? parts[0].trim() : 'Bilinmeyen Sanatçı';
      const title = parts.length > 1 ? parts.slice(1).join('-').trim() : cleanName;

      const trackId = `local_file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      // Save directly to IndexedDB
      await saveAudioBlobToCache(trackId, file, file.type || 'audio/mp3');

      generatedTracks.push({
        id: trackId,
        title,
        artist,
        album: 'Yerel Dosyalar',
        duration: item.duration,
        coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
        audioUrl: URL.createObjectURL(file),
        source: 'local',
        isOfflineCached: true,
        addedAt: new Date().toISOString(),
        genre: 'Yerel Müzik'
      });
    }

    onAddTracks(generatedTracks, selectedPlaylistId);
    setIsProcessing(false);
    onClose();
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
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Cihazından Şarkı Yükle</h2>
                <p className="text-xs text-neutral-400">MP3 / WAV dosyalarınızı listelerinize ekleyin ve internetsiz dinleyin</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Target playlist */}
            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1.5">Hedef Çalma Listesi</label>
              <select
                value={selectedPlaylistId}
                onChange={(e) => setSelectedPlaylistId(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {playlists.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.tracks.length} şarkı)
                  </option>
                ))}
              </select>
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFiles(e.dataTransfer.files);
              }}
              className={`p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center transition cursor-pointer ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-neutral-700 bg-neutral-950/60 hover:border-neutral-500'
              }`}
            >
              <Disc className="w-10 h-10 text-emerald-400 mb-2 animate-spin-slow" />
              <p className="text-sm font-bold text-white">Şarkı dosyalarını buraya sürükleyin</p>
              <p className="text-xs text-neutral-400 mt-1">MP3, WAV, FLAC, M4A desteklenir</p>

              <label className="mt-4 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white rounded-full cursor-pointer transition border border-neutral-700 shadow-sm">
                Dosyaları Seç
                <input
                  type="file"
                  multiple
                  accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a"
                  onChange={(e) => handleFiles(e.target.files)}
                  className="hidden"
                />
              </label>
            </div>

            {/* Selected files list */}
            {importedFiles.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                <div className="text-xs font-semibold text-neutral-300">
                  Eklenecek Şarkılar ({importedFiles.length}):
                </div>
                {importedFiles.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-neutral-950 rounded-lg border border-neutral-800 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Music className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-neutral-200 truncate">{item.file.name}</span>
                    </div>
                    <span className="text-neutral-400 font-mono text-[11px] shrink-0 ml-2">
                      {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-neutral-950 border-t border-neutral-800">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white transition"
            >
              İptal
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={importedFiles.length === 0 || isProcessing}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-xs font-bold rounded-full transition shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
            >
              {isProcessing ? 'Kaydediliyor...' : `${importedFiles.length} Şarkıyı Listeye Ekle`}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
