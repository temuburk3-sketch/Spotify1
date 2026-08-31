import React, { memo } from 'react';
import { Menu, Search, Link as LinkIcon, WifiOff, HardDrive, Sparkles, Users, Plus, ShieldCheck, Zap, Download, Tv } from 'lucide-react';
import { Playlist } from '../types';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  onOpenSpotifyImport: () => void;
  onOpenLocalImport: () => void;
  onOpenJoinRoom: () => void;
  onOpenOfflineManager: () => void;
  onOpenPrivateMode: () => void;
  onOpenRecommendations: () => void;
  onOpenInstallApp: () => void;
  onOpenPlaylistMixer?: () => void;
  onOpenTVStage?: () => void;
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
  onOpenInstallApp,
  onOpenPlaylistMixer,
  onOpenTVStage,
  isOfflineMode,
  onSearchFocus
}) => {
  return (
    <header className="h-16 bg-neutral-950/80 border-b border-neutral-800/80 px-4 md:px-6 flex items-center justify-between z-20 backdrop-blur-md">
      {/* Left: Mobile Menu toggle & search trigger */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 mr-2">
        <button
          onClick={onToggleMobileSidebar}
          className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 transition shrink-0"
          title="Klasörler & Menü"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div
          onClick={onSearchFocus}
          className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900/90 hover:bg-neutral-850 border border-neutral-800 rounded-full text-xs text-neutral-400 cursor-pointer flex-1 max-w-xs transition min-w-0"
        >
          <Search className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">Ara...</span>
        </div>

        {/* AI Recommendations Quick Header Badge */}
        <button
          onClick={onOpenRecommendations}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500/15 to-indigo-500/15 hover:from-emerald-500/25 hover:to-indigo-500/25 text-emerald-300 border border-emerald-500/30 transition shadow-xs shrink-0"
          title="Dinleme geçmişinize göre yapay zeka önerileri"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Akıllı Öneriler</span>
        </button>
      </div>

      {/* Right: Quick actions & Premium Badges */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* TV & Sahne Karaoke Modu */}
        {onOpenTVStage && (
          <button
            onClick={onOpenTVStage}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-black bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-300 border border-emerald-500/40 transition shadow-xs cursor-pointer shrink-0"
            title="Televizyon ve Büyük Ekran Karaoke Görünümü"
          >
            <Tv className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">TV & Sahne</span>
          </button>
        )}

        {/* Install / Download App Button */}
        <button
          onClick={onOpenInstallApp}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-black bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-300 border border-emerald-500/50 transition shadow-md shadow-emerald-500/10 cursor-pointer shrink-0"
          title="SoundPulse'ı Telefona veya Masaüstüne İndir / Yükle"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden xs:inline sm:inline">Uygulama</span>
        </button>

        {/* Playlist Mixer Button */}
        {onOpenPlaylistMixer && (
          <button
            onClick={onOpenPlaylistMixer}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-indigo-500/20 to-emerald-500/20 hover:from-indigo-500/30 hover:to-emerald-500/30 text-indigo-300 border border-indigo-500/30 transition shrink-0 cursor-pointer shadow-xs"
            title="Listeleri Birleştir & Mixle"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Listeleri Mixle</span>
          </button>
        )}

        {/* Private Mode & PIN Button */}
        <button
          onClick={onOpenPrivateMode}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-teal-300 border border-teal-500/30 transition"
          title="Kişisel Özel Mod & PIN Kilidi"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
          <span>Kişisel Mod</span>
        </button>

        {/* Offline Mode Indicator */}
        <button
          onClick={onOpenOfflineManager}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold transition border shrink-0 ${
            isOfflineMode
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:text-white'
          }`}
          title="İnternetsiz Dinleme Durumu"
        >
          {isOfflineMode ? (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Çevrimdışı</span>
            </>
          ) : (
            <>
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">İndir</span>
            </>
          )}
        </button>

        {/* Fast Spotify Import */}
        <button
          onClick={onOpenSpotifyImport}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-[#1DB954] hover:bg-[#1ed760] text-black rounded-full text-xs font-black transition shadow-md shadow-[#1DB954]/20 shrink-0"
          title="Spotify'dan Liste veya Şarkı Çek"
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Spotify</span>
        </button>
      </div>
    </header>
  );
});

Header.displayName = 'Header';
