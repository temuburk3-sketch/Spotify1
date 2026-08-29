import React from 'react';
import {
  Home,
  Search,
  Sparkles,
  Layers,
  HardDrive,
  ListMusic,
  Radio,
  Sliders,
  Plus,
  FolderOpen,
  Mic2
} from 'lucide-react';
import { Playlist, PlaylistFolder } from '../../types';

interface BottomNavBarProps {
  activeView: 'home' | 'search' | 'recommendations' | 'playlist' | 'queue' | 'lyrics';
  onSelectView: (view: 'home' | 'search' | 'recommendations' | 'playlist' | 'queue' | 'lyrics') => void;
  isOfflineMode: boolean;
  onOpenOfflineManager: () => void;
  onOpenFolderManager: () => void;
  onCreatePlaylist: () => void;
  onOpenEqualizer?: () => void;
  downloadedCount?: number;
  totalPlaylistsCount?: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeView,
  onSelectView,
  isOfflineMode,
  onOpenOfflineManager,
  onOpenFolderManager,
  onCreatePlaylist,
  onOpenEqualizer,
  downloadedCount = 0,
  totalPlaylistsCount = 0
}) => {
  const navItems = [
    {
      id: 'playlist' as const,
      label: 'Kitaplık',
      icon: Layers,
      isActive: activeView === 'playlist',
      badge: totalPlaylistsCount > 0 ? `${totalPlaylistsCount}` : undefined
    },
    {
      id: 'search' as const,
      label: 'Ara',
      icon: Search,
      isActive: activeView === 'search'
    },
    {
      id: 'recommendations' as const,
      label: 'Keşfet & AI',
      icon: Sparkles,
      isActive: activeView === 'recommendations',
      highlight: true
    },
    {
      id: 'lyrics' as const,
      label: 'Sözler',
      icon: Mic2,
      isActive: activeView === 'lyrics'
    },
    {
      id: 'queue' as const,
      label: 'Kuyruk',
      icon: ListMusic,
      isActive: activeView === 'queue'
    }
  ];

  return (
    <nav
      id="spotify-bottom-nav-bar"
      className="w-full bg-neutral-950/95 backdrop-blur-2xl border-t border-neutral-800/80 px-3 pt-2 pb-6 sm:pb-3 select-none z-40 shrink-0"
      style={{
        paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom, 16px) + 0.5rem))'
      }}
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-1">
        {/* Main Navigation Tabs */}
        <div className="flex items-center justify-around flex-1 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                className={`relative flex flex-col items-center justify-center py-1.5 px-3 sm:px-5 rounded-2xl min-h-[44px] transition-all duration-200 cursor-pointer group active:scale-95 ${
                  item.isActive
                    ? 'text-emerald-400 font-extrabold scale-105'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <Icon
                    className={`w-5 h-5 transition-transform duration-200 ${
                      item.isActive ? 'text-emerald-400 stroke-[2.5]' : 'group-hover:scale-110'
                    }`}
                  />
                  {item.badge && (
                    <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 bg-neutral-800 border border-neutral-700 text-white text-[9px] font-bold rounded-full">
                      {item.badge}
                    </span>
                  )}
                  {item.highlight && !item.isActive && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </div>
                <span className="text-[11px] sm:text-xs mt-1 tracking-tight truncate font-semibold">
                  {item.label}
                </span>

                {item.isActive && (
                  <span className="absolute -bottom-1 w-4 h-1 bg-emerald-400 rounded-full shadow-sm shadow-emerald-400/50" />
                )}
              </button>
            );
          })}
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-1 sm:gap-1.5 pl-2 border-l border-neutral-800/80">
          {/* Quick Offline Button */}
          <button
            onClick={onOpenOfflineManager}
            className={`flex flex-col items-center justify-center py-1.5 px-2 sm:px-2.5 rounded-xl min-h-[44px] text-[10px] font-bold transition cursor-pointer active:scale-95 ${
              isOfflineMode
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
            title="Çevrimdışı İndirme & Depolama"
          >
            <div className="relative">
              <HardDrive className={`w-4 h-4 ${isOfflineMode ? 'text-amber-400 animate-pulse' : ''}`} />
              {downloadedCount > 0 && !isOfflineMode && (
                <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </div>
            <span className="text-[9px] sm:text-[10px] mt-0.5 font-medium">İndirilen</span>
          </button>

          {/* Playlist Groups / Folders Button */}
          <button
            onClick={onOpenFolderManager}
            className="flex flex-col items-center justify-center py-1.5 px-2 sm:px-2.5 rounded-xl min-h-[44px] text-[10px] text-neutral-400 hover:text-white hover:bg-neutral-900 transition cursor-pointer font-bold active:scale-95"
            title="Çalma Listesi Grupları & Klasörler"
          >
            <FolderOpen className="w-4 h-4 text-indigo-400" />
            <span className="text-[9px] sm:text-[10px] mt-0.5 font-medium">Gruplar</span>
          </button>

          {/* Create New Playlist Button */}
          <button
            onClick={onCreatePlaylist}
            className="w-10 h-10 sm:w-10 sm:h-10 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl transition shadow-md shadow-emerald-500/20 cursor-pointer flex items-center justify-center active:scale-95"
            title="Yeni Çalma Listesi Oluştur"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
          </button>
        </div>
      </div>
    </nav>
  );
};
