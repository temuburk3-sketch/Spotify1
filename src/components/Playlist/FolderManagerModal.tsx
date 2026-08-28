import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  FolderPlus,
  FolderOpen,
  Check,
  Trash2,
  Edit2,
  Tag,
  Layers,
  Sparkles,
  Plus
} from 'lucide-react';
import { Playlist, PlaylistFolder } from '../../types';

interface FolderManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: PlaylistFolder[];
  playlists: Playlist[];
  onCreateFolder: (name: string, icon?: string, color?: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onAssignPlaylistFolder: (playlistId: string, folderId?: string) => void;
}

export const FolderManagerModal: React.FC<FolderManagerModalProps> = ({
  isOpen,
  onClose,
  folders,
  playlists,
  onCreateFolder,
  onDeleteFolder,
  onAssignPlaylistFolder
}) => {
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState('emerald');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>(playlists[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'create' | 'assign'>('assign');

  if (!isOpen) return null;

  const colorOptions = [
    { id: 'emerald', class: 'bg-emerald-500 text-black', label: 'Zümrüt' },
    { id: 'indigo', class: 'bg-indigo-500 text-white', label: 'İndigo' },
    { id: 'rose', class: 'bg-rose-500 text-white', label: 'Gül' },
    { id: 'amber', class: 'bg-amber-500 text-black', label: 'Kehribar' },
    { id: 'sky', class: 'bg-sky-500 text-black', label: 'Gök' },
    { id: 'purple', class: 'bg-purple-500 text-white', label: 'Mor' }
  ];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    onCreateFolder(newFolderName.trim(), 'Folder', selectedColor);
    setNewFolderName('');
    setActiveTab('assign');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden text-neutral-100 flex flex-col max-h-[90dvh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/70">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-bold text-white">Çalma Listesi Grupları & Klasörler</h2>
                <p className="text-xs text-neutral-400">Listelerinizi temalara ve aktivitelere göre gruplandırın</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sub Navigation */}
          <div className="flex items-center gap-2 px-6 pt-3 pb-1 border-b border-neutral-800 bg-neutral-950/40 text-xs font-bold">
            <button
              onClick={() => setActiveTab('assign')}
              className={`pb-2 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'assign'
                  ? 'border-indigo-500 text-indigo-400 font-extrabold'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Listeleri Gruplandır
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`pb-2 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'create'
                  ? 'border-indigo-500 text-indigo-400 font-extrabold'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" /> Yeni Grup / Klasör Ekle
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {activeTab === 'create' && (
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">Klasör / Grup Adı</label>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Örn: 🚗 Yolculuk Şarkıları veya 🏋️ Antrenman"
                    className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-hidden focus:border-indigo-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-2">Tema Rengi</label>
                  <div className="flex items-center gap-2">
                    {colorOptions.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedColor(c.id)}
                        className={`w-8 h-8 rounded-full ${c.class} flex items-center justify-center font-bold text-xs transition cursor-pointer ${
                          selectedColor === c.id ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        {selectedColor === c.id && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-2"
                >
                  <FolderPlus className="w-4 h-4" /> Yeni Grubu Kaydet
                </button>
              </form>
            )}

            {activeTab === 'assign' && (
              <div className="space-y-4">
                <div className="text-xs text-neutral-400 font-medium">
                  Çalma listelerinizin hangi grupta yer alacağını aşağıdan kolayca belirleyin:
                </div>

                <div className="space-y-2.5">
                  {playlists.map((playlist) => {
                    const currentFolder = folders.find((f) => f.id === (playlist.folderId || 'all'));
                    return (
                      <div
                        key={playlist.id}
                        className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800/80 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={playlist.coverUrl}
                            alt={playlist.name}
                            className="w-10 h-10 rounded-xl object-cover shrink-0 border border-neutral-800"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{playlist.name}</div>
                            <div className="text-[10px] text-neutral-400 truncate flex items-center gap-1.5 mt-0.5">
                              <span>{playlist.tracks.length} şarkı</span>
                              <span>•</span>
                              <span className="text-indigo-400 font-semibold">
                                {currentFolder ? currentFolder.name : 'Grup Atanmamış'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Folder Picker Dropdown */}
                        <select
                          value={playlist.folderId || 'all'}
                          onChange={(e) => onAssignPlaylistFolder(playlist.id, e.target.value)}
                          className="bg-neutral-900 text-neutral-200 border border-neutral-700 rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                        >
                          <option value="all">Tüm Listeler (Varsayılan)</option>
                          {folders
                            .filter((f) => f.id !== 'all')
                            .map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    );
                  })}
                </div>

                {/* Existing Folders List with Delete */}
                <div className="pt-4 border-t border-neutral-800/80">
                  <div className="text-xs font-bold text-neutral-300 mb-2">Mevcut Gruplar & Klasörler</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {folders.map((f) => (
                      <div
                        key={f.id}
                        className="p-2.5 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between text-xs"
                      >
                        <div className="font-semibold text-neutral-200 truncate flex items-center gap-1.5">
                          <FolderOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="truncate">{f.name}</span>
                        </div>
                        {f.id !== 'all' && f.id !== 'favorites' && (
                          <button
                            onClick={() => onDeleteFolder(f.id)}
                            className="p-1 text-neutral-500 hover:text-rose-400 transition cursor-pointer"
                            title="Grubu Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end px-6 py-4 bg-neutral-950 border-t border-neutral-800">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-full transition cursor-pointer"
            >
              Tamam
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
