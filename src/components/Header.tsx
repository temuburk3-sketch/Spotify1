import React, { memo } from 'react';
import { Menu, Search, Link as LinkIcon, WifiOff, HardDrive, Sparkles, Users, Plus, ShieldCheck, Zap } from 'lucide-react';
import { Playlist } from '../types';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  onOpenSpotifyImport: () => void;
  onOpenLocalImport: () => void;
  onOpenJoinRoom: () => void;
  onOpenOfflineManager: () => void;
  onOpenPrivateMode: () => void;
  onOpenRecommendations: () => void;
  isOfflineMode: boolean;
  onSearchFocus: () => void;
}

export const Header: React.FC<HeaderProps> = memo(({
  onToggleMobileSidebar,
  onOpenSpotifyImport,
  onOpenLocalImport,
  onOpenJoinRoom,
  onOpenOfflineManager,
  onOpenPrivateMode,
  onOpenRecommendations,
  isOfflineMode,
  onSearchFocus
}) => {
  return (
    <header className="h-16 bg-neutral-950/80 border-b border-neutral-800/80 px-4 md:px-6 flex items-center justify-between z-20 backdrop-blur-md">
      {/* Left: Mobile Menu toggle & search trigger */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 transition"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div
          onClick={onSearchFocus}
          className="flex items-center gap-2.5 px-3.5 py-1.5 bg-neutral-900/90 hover:bg-neutral-850 border border-neutral-800 rounded-full text-xs text-neutral-400 cursor-pointer w-48 sm:w-64 transition"
        >
          <Search className="w-3.5 h-3.5 text-emerald-400" />
          <span className="truncate">Şarkı, sanatçı veya tür ara...</span>
        </div>

        {/* AI Recommendations Quick Header Badge */}
        <button
          onClick={onOpenRecommendations}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500/15 to-indigo-500/15 hover:from-emerald-500/25 hover:to-indigo-500/25 text-emerald-300 border border-emerald-500/30 transition shadow-xs"
          title="Dinleme geçmişinize göre yapay zeka önerileri"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Akıllı Öneriler</span>
        </button>
      </div>

      {/* Right: Quick actions & Premium Badges */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Private Mode & PIN Button */}
        <button
          onClick={onOpenPrivateMode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-teal-300 border border-teal-500/30 transition"
          title="Kişisel Özel Mod & PIN Kilidi"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
          <span className="hidden md:inline">Kişisel Mod</span>
        </button>

        {/* Offline Mode Indicator */}
        <button
          onClick={onOpenOfflineManager}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition border ${
            isOfflineMode
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:text-white'
          }`}
          title="İnternetsiz Dinleme Durumu"
        >
          {isOfflineMode ? (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">İnternetsiz Mod</span>
            </>
          ) : (
            <>
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Çevrimdışı İndir</span>
            </>
          )}
        </button>

        {/* Fast Spotify Import */}
        <button
          onClick={onOpenSpotifyImport}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1DB954] hover:bg-[#1ed760] text-black rounded-full text-xs font-black transition shadow-md shadow-[#1DB954]/20"
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Spotify Bağla</span>
        </button>
      </div>
    </header>
  );
});

Header.displayName = 'Header';
