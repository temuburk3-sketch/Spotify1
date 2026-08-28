import React, { useState, memo } from 'react';
import { Home, Search, Library, PlusCircle, Link as LinkIcon, UploadCloud, Users, WifiOff, HardDrive, Music, Sparkles, Disc, Trash2, Edit3, Check, ShieldCheck, KeyRound, Download, Smartphone } from 'lucide-react';
import { Playlist } from '../types';
import { getCurrentUser, updateCurrentUser } from '../services/collaboration';
import { getStoredPIN } from '../services/recommendationService';

interface SidebarProps {
  playlists: Playlist[];
  activePlaylistId: string | null;
  activeView: 'playlist' | 'search' | 'offline_library' | 'recommendations';
  isOfflineMode: boolean;
  onSelectView: (view: 'playlist' | 'search' | 'offline_library' | 'recommendations') => void;
  onSelectPlaylist: (id: string) => void;
  onCreatePlaylist: () => void;
  onDeletePlaylist: (id: string) => void;
  onOpenSpotifyImport: () => void;
  onOpenLocalImport: () => void;
  onOpenJoinRoom: () => void;
  onOpenOfflineManager: () => void;
  onOpenPrivateMode: () => void;
  onOpenInstallApp: () => void;
}

export const Sidebar: React.FC<SidebarProps> = memo(({
  playlists,
  activePlaylistId,
  activeView,
  isOfflineMode,
  onSelectView,
  onSelectPlaylist,
  onCreatePlaylist,
  onDeletePlaylist,
  onOpenSpotifyImport,
  onOpenLocalImport,
  onOpenJoinRoom,
  onOpenOfflineManager,
  onOpenPrivateMode,
  onOpenInstallApp
}) => {
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [nameInput, setNameInput] = useState(currentUser.name);

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = updateCurrentUser(nameInput);
    setCurrentUser(updated);
    setIsEditingUser(false);
  };

  return (
    <aside className="w-64 md:w-72 bg-neutral-950 border-r border-neutral-800/80 flex flex-col h-full select-none shrink-0 z-30">
      {/* Brand Header */}
      <div className="p-5 pb-4 flex items-center justify-between border-b border-neutral-800/60 bg-neutral-950/60">
        <div
          onClick={() => {
            if (playlists.length > 0) {
              onSelectPlaylist(playlists[0].id);
              onSelectView('playlist');
            }
          }}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition">
            <Disc className="w-5 h-5 text-black animate-spin-slow" />
          </div>
          <div>
            <div className="font-black text-lg text-white tracking-tight flex items-center gap-1.5">
              <span>SoundPulse</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 font-extrabold rounded-md border border-emerald-500/30">
                PRO
              </span>
            </div>
            <div className="text-[11px] text-neutral-400 font-medium">Sınırsız Stüdyo Müzik</div>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="p-4 space-y-1">
        <button
          onClick={() => {
            if (playlists.length > 0) onSelectPlaylist(playlists[0].id);
            onSelectView('playlist');
          }}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
            activeView === 'playlist'
              ? 'bg-neutral-800/80 text-white'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
          }`}
        >
          <Home className="w-4 h-4 text-emerald-400" />
          <span>Çalma Listelerim</span>
        </button>

        <button
          onClick={() => onSelectView('recommendations')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
            activeView === 'recommendations'
              ? 'bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
          }`}
        >
          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Akıllı Öneriler</span>
          </div>
          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            AI
          </span>
        </button>

        <button
          onClick={() => onSelectView('search')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
            activeView === 'search'
              ? 'bg-neutral-800/80 text-white'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
          }`}
        >
          <Search className="w-4 h-4 text-emerald-400" />
          <span>Keşfet & Spotify Ara</span>
        </button>

        <button
          onClick={onOpenOfflineManager}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
            isOfflineMode
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
          }`}
        >
          {isOfflineMode ? (
            <WifiOff className="w-4 h-4 text-amber-400" />
          ) : (
            <HardDrive className="w-4 h-4 text-emerald-400" />
          )}
          <span>İnternetsiz Dinleme ({isOfflineMode ? 'Aktif' : 'Mod'})</span>
        </button>

        <button
          onClick={onOpenInstallApp}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition shadow-xs cursor-pointer group"
          title="SoundPulse Uygulamasını Telefona/PC'ye İndir"
        >
          <div className="flex items-center gap-3">
            <Download className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
            <span>Uygulamayı İndir / Kur</span>
          </div>
          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-400 text-black font-extrabold">
            PWA
          </span>
        </button>

        <button
          onClick={onOpenPrivateMode}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-neutral-400 hover:text-white hover:bg-neutral-900/60 transition"
        >
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>Kişisel Mod & Kilit</span>
          </div>
          {getStoredPIN() && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
              PIN
            </span>
          )}
        </button>
      </div>

      {/* Quick Action Buttons */}
      <div className="px-4 py-2 border-t border-neutral-900 space-y-1.5">
        <button
          onClick={onCreatePlaylist}
          className="w-full flex items-center gap-2 px-3 py-2 bg-neutral-900 hover:bg-neutral-850 text-white rounded-xl text-xs font-bold transition border border-neutral-800"
        >
          <PlusCircle className="w-4 h-4 text-emerald-400" />
          <span>Yeni Liste Oluştur</span>
        </button>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={onOpenSpotifyImport}
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-[#1DB954]/10 hover:bg-[#1DB954]/20 text-[#1DB954] rounded-xl text-[11px] font-bold border border-[#1DB954]/20 transition truncate"
            title="Spotify Listesi İçe Aktar"
          >
            <LinkIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Spotify'dan Al</span>
          </button>

          <button
            onClick={onOpenLocalImport}
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-xl text-[11px] font-bold border border-neutral-800 transition truncate"
            title="Cihazdan MP3 Yükle"
          >
            <UploadCloud className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">MP3 Yükle</span>
          </button>
        </div>

        <button
          onClick={onOpenJoinRoom}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 rounded-xl text-[11px] font-bold border border-indigo-500/30 transition"
        >
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span>Ortak Odaya Katıl (PIN)</span>
        </button>
      </div>

      {/* Playlists List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 border-t border-neutral-900 space-y-1">
        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
          <span>Kayıtlı Listelerim ({playlists.length})</span>
        </div>

        {playlists.map((playlist) => {
          const isSelected = activePlaylistId === playlist.id && activeView === 'playlist';
          return (
            <div
              key={playlist.id}
              onClick={() => {
                onSelectPlaylist(playlist.id);
                onSelectView('playlist');
              }}
              className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
                isSelected
                  ? 'bg-emerald-500/15 text-white border border-emerald-500/30 shadow-md shadow-emerald-500/5'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900/80 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={playlist.coverUrl}
                  alt={playlist.name}
                  className="w-9 h-9 rounded-lg object-cover shrink-0 border border-neutral-800 shadow-xs"
                />
                <div className="min-w-0">
                  <div className={`truncate ${isSelected ? 'text-emerald-300 font-bold' : 'text-neutral-200 group-hover:text-white'}`}>
                    {playlist.name}
                  </div>
                  <div className="text-[10px] text-neutral-400 flex items-center gap-1.5 truncate">
                    {playlist.isCollaborative && <Users className="w-2.5 h-2.5 text-indigo-400 shrink-0" />}
                    <span>{playlist.tracks.length} şarkı</span>
                  </div>
                </div>
              </div>

              {playlists.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`"${playlist.name}" çalma listesi silinsin mi?`)) {
                      onDeletePlaylist(playlist.id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-500 hover:text-rose-400 rounded-lg hover:bg-neutral-800 transition"
                  title="Listeyi Sil"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* User Profile Bar */}
      <div className="p-3 border-t border-neutral-900 bg-neutral-950/80">
        {isEditingUser ? (
          <form onSubmit={handleSaveUser} className="flex items-center gap-2">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="flex-1 px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              autoFocus
            />
            <button type="submit" className="p-1.5 bg-emerald-500 text-black rounded-lg text-xs font-bold">
              <Check className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <div
            onClick={() => setIsEditingUser(true)}
            className="flex items-center justify-between p-1.5 rounded-xl hover:bg-neutral-900 cursor-pointer transition"
            title="Kullanıcı Adını Değiştir"
          >
            <div className="flex items-center gap-2.5">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover border border-neutral-700"
              />
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1">
                  {currentUser.name}
                  <Edit3 className="w-2.5 h-2.5 text-neutral-500" />
                </div>
                <div className="text-[10px] text-emerald-400 font-medium">Premium Üye (Sınırsız)</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';
