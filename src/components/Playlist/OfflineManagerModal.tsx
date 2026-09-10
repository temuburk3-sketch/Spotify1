import React, { useState, useEffect, useMemo } from 'react';
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
  ArrowDownToLine,
  Sparkles,
  Shuffle,
  Plus,
  Search,
  ArrowUpDown,
  GitCompare,
  Layers,
  CheckCheck,
  AlertCircle,
  Filter
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
  onPlayTrack?: (track: Track, contextTracks?: Track[], contextName?: string) => void;
  onPlayTracksShuffled?: (tracks: Track[], contextName?: string) => void;
  onAddToQueue?: (tracks: Track[], mixTitle?: string) => void;
  onDownloadSingleTrack?: (track: Track) => Promise<void>;
  onCreatePlaylist?: (name: string, tracks: Track[]) => void;
}

type ModalTab = 'tracks' | 'compare' | 'twolists' | 'blend' | 'overview';
type SortOption = 'date-desc' | 'title-asc' | 'artist-asc' | 'duration-desc';

export const OfflineManagerModal: React.FC<OfflineManagerModalProps> = ({
  isOpen,
  onClose,
  isOfflineMode,
  onToggleOfflineMode,
  playlists,
  onDownloadAllPlaylists,
  onClearAllOffline,
  onPlayTrack,
  onPlayTracksShuffled,
  onAddToQueue,
  onDownloadSingleTrack,
  onCreatePlaylist
}) => {
  const [stats, setStats] = useState<{ count: number; totalSizeBytes: number; trackIds: string[] }>({
    count: 0,
    totalSizeBytes: 0,
    trackIds: []
  });
  const [activeTab, setActiveTab] = useState<ModalTab>('tracks');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlaylistFilter, setSelectedPlaylistFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [isClearing, setIsClearing] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadingTrackId, setDownloadingTrackId] = useState<string | null>(null);
  const [isSyncingMissing, setIsSyncingMissing] = useState(false);

  // Compare Tab State
  const [comparePlaylistId, setComparePlaylistId] = useState<string>(playlists[0]?.id || '');

  // Two-List Compare State
  const [twoListIdA, setTwoListIdA] = useState<string>(playlists[0]?.id || '');
  const [twoListIdB, setTwoListIdB] = useState<string>(playlists[1]?.id || playlists[0]?.id || '');

  // Blend Tab State
  const [blendPlaylistId, setBlendPlaylistId] = useState<string>(playlists[0]?.id || '');
  const [blendRatio, setBlendRatio] = useState<number>(50); // 50% downloaded, 50% playlist

  const fetchStats = async () => {
    const s = await getCachedAudioStats();
    setStats(s);
  };

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen, playlists]);

  // Keep selected IDs in sync with available playlists
  useEffect(() => {
    if (playlists.length > 0) {
      if (!comparePlaylistId || !playlists.find(p => p.id === comparePlaylistId)) {
        setComparePlaylistId(playlists[0].id);
      }
      if (!twoListIdA || !playlists.find(p => p.id === twoListIdA)) {
        setTwoListIdA(playlists[0].id);
      }
      if (!twoListIdB || !playlists.find(p => p.id === twoListIdB)) {
        setTwoListIdB(playlists[1]?.id || playlists[0].id);
      }
      if (!blendPlaylistId || !playlists.find(p => p.id === blendPlaylistId)) {
        setBlendPlaylistId(playlists[0].id);
      }
    }
  }, [playlists]);

  // 1. Compute list of all downloaded tracks
  const allDownloadedTracks = useMemo(() => {
    const list: { track: Track; playlistNames: string[] }[] = [];
    const seenMap = new Map<string, { track: Track; playlistNames: string[] }>();

    for (const p of playlists) {
      for (const t of p.tracks) {
        const isOffline = t.isOfflineCached || stats.trackIds.includes(t.id);
        if (isOffline) {
          if (seenMap.has(t.id)) {
            const entry = seenMap.get(t.id)!;
            if (!entry.playlistNames.includes(p.name)) {
              entry.playlistNames.push(p.name);
            }
          } else {
            seenMap.set(t.id, { track: t, playlistNames: [p.name] });
          }
        }
      }
    }

    return Array.from(seenMap.values());
  }, [playlists, stats.trackIds]);

  // Helper: check if a track is offline cached
  const isTrackDownloaded = (trackId: string) => {
    return stats.trackIds.includes(trackId) || allDownloadedTracks.some(item => item.track.id === trackId);
  };

  // 2. Filtered & Sorted Downloaded Tracks
  const filteredDownloadedTracks = useMemo(() => {
    let result = [...allDownloadedTracks];

    // Filter by Playlist
    if (selectedPlaylistFilter !== 'all') {
      result = result.filter(item => item.playlistNames.includes(selectedPlaylistFilter));
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        item =>
          item.track.title.toLowerCase().includes(q) ||
          item.track.artist.toLowerCase().includes(q) ||
          item.playlistNames.some(pn => pn.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortOption === 'title-asc') {
        return a.track.title.localeCompare(b.track.title);
      }
      if (sortOption === 'artist-asc') {
        return a.track.artist.localeCompare(b.track.artist);
      }
      if (sortOption === 'duration-desc') {
        return (b.track.duration || 0) - (a.track.duration || 0);
      }
      // date-desc default
      return 0;
    });

    return result;
  }, [allDownloadedTracks, selectedPlaylistFilter, searchQuery, sortOption]);

  const rawTracksList = useMemo(() => filteredDownloadedTracks.map(i => i.track), [filteredDownloadedTracks]);

  // Handler: Clear All Offline Cache
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

  // Handler: Download All
  const handleDownloadAll = async () => {
    setIsDownloadingAll(true);
    try {
      await onDownloadAllPlaylists();
      await fetchStats();
    } catch (e) {
      console.error(e);
    } finally {
      setIsDownloadingAll(false);
    }
  };

  // Handler: Delete Single Track from Cache
  const handleDeleteTrackOffline = async (trackId: string) => {
    try {
      await removeAudioBlobFromCache(trackId);
      await fetchStats();
    } catch (e) {
      console.error('Delete track cache error:', e);
    }
  };

  // Handler: Download Single Track
  const handleDownloadSingle = async (track: Track) => {
    if (!onDownloadSingleTrack) return;
    setDownloadingTrackId(track.id);
    try {
      await onDownloadSingleTrack(track);
      await fetchStats();
    } catch (e) {
      console.error(e);
    } finally {
      setDownloadingTrackId(null);
    }
  };

  // Compare Tab Calculations
  const comparePlaylist = useMemo(() => {
    return playlists.find(p => p.id === comparePlaylistId) || playlists[0];
  }, [playlists, comparePlaylistId]);

  const compareStats = useMemo(() => {
    if (!comparePlaylist) return { total: 0, downloaded: 0, missing: 0, missingTracks: [], percent: 0 };
    const total = comparePlaylist.tracks.length;
    const downloadedTracksList = comparePlaylist.tracks.filter(t => isTrackDownloaded(t.id));
    const missingTracks = comparePlaylist.tracks.filter(t => !isTrackDownloaded(t.id));
    const downloaded = downloadedTracksList.length;
    const missing = missingTracks.length;
    const percent = total > 0 ? Math.round((downloaded / total) * 100) : 0;
    return { total, downloaded, missing, missingTracks, percent };
  }, [comparePlaylist, stats.trackIds, allDownloadedTracks]);

  // Sync missing tracks for selected playlist
  const handleSyncMissingTracks = async () => {
    if (!onDownloadSingleTrack || compareStats.missingTracks.length === 0) return;
    setIsSyncingMissing(true);
    try {
      for (const t of compareStats.missingTracks) {
        await onDownloadSingleTrack(t);
      }
      await fetchStats();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncingMissing(false);
    }
  };

  // Two-List Comparison Calculations
  const listA = useMemo(() => playlists.find(p => p.id === twoListIdA) || playlists[0], [playlists, twoListIdA]);
  const listB = useMemo(() => playlists.find(p => p.id === twoListIdB) || playlists[1] || playlists[0], [playlists, twoListIdB]);

  const twoListComparison = useMemo(() => {
    if (!listA || !listB) return { common: [], onlyA: [], onlyB: [] };
    const setA = new Map<string, Track>(listA.tracks.map(t => [t.id, t]));
    const setB = new Map<string, Track>(listB.tracks.map(t => [t.id, t]));

    const common: Track[] = [];
    const onlyA: Track[] = [];
    const onlyB: Track[] = [];

    for (const [id, t] of setA.entries()) {
      if (setB.has(id)) {
        common.push(t);
      } else {
        onlyA.push(t);
      }
    }

    for (const [id, t] of setB.entries()) {
      if (!setA.has(id)) {
        onlyB.push(t);
      }
    }

    return { common, onlyA, onlyB };
  }, [listA, listB]);

  // Blend Calculations
  const blendTargetPlaylist = useMemo(() => {
    return playlists.find(p => p.id === blendPlaylistId) || playlists[0];
  }, [playlists, blendPlaylistId]);

  const generateBlendedTracks = (): Track[] => {
    if (!blendTargetPlaylist) return rawTracksList;
    const fromDownloaded = [...rawTracksList];
    const fromPlaylist = [...blendTargetPlaylist.tracks];

    // Fisher-Yates shuffle array
    const shuffleArray = (arr: Track[]) => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    const sDownloaded = shuffleArray(fromDownloaded);
    const sPlaylist = shuffleArray(fromPlaylist);

    // Pick according to ratio
    const totalCount = Math.min(60, sDownloaded.length + sPlaylist.length);
    const downloadedQuota = Math.round((totalCount * blendRatio) / 100);
    const playlistQuota = totalCount - downloadedQuota;

    const chosenDownloaded = sDownloaded.slice(0, downloadedQuota);
    const chosenPlaylist = sPlaylist.slice(0, playlistQuota);

    // Merge and remove duplicates
    const combinedMap = new Map<string, Track>();
    for (const t of chosenDownloaded) combinedMap.set(t.id, t);
    for (const t of chosenPlaylist) combinedMap.set(t.id, t);

    return shuffleArray(Array.from(combinedMap.values()));
  };

  const handlePlayBlend = () => {
    const blended = generateBlendedTracks();
    if (blended.length === 0) return;
    const mixName = `🔀 İndirilenler & ${blendTargetPlaylist?.name || 'Liste'} Karışımı`;
    if (onPlayTracksShuffled) {
      onPlayTracksShuffled(blended, mixName);
    } else if (onPlayTrack) {
      onPlayTrack(blended[0], blended, mixName);
    }
    onClose();
  };

  const handleSaveBlendAsPlaylist = () => {
    const blended = generateBlendedTracks();
    if (blended.length === 0 || !onCreatePlaylist) return;
    const name = `🔀 İndirilenler & ${blendTargetPlaylist?.name || 'Liste'} Karışımı`;
    onCreatePlaylist(name, blended);
    onClose();
  };

  if (!isOpen) return null;

  const totalSizeMB = (stats.totalSizeBytes / (1024 * 1024)).toFixed(1);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden text-neutral-100 flex flex-col max-h-[92dvh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/80">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                  <span>İndirilen Şarkılar & Liste Karşılaştırma</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 font-mono">
                    INDEXEDDB
                  </span>
                </h2>
                <p className="text-xs text-neutral-400">
                  {allDownloadedTracks.length} şarkı cihazınızda çevrimdışı hazır • {totalSizeMB} MB
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 border-b border-neutral-800 bg-neutral-950/40 text-xs font-semibold overflow-x-auto">
            <button
              onClick={() => setActiveTab('tracks')}
              className={`py-2 px-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'tracks'
                  ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
              }`}
            >
              <Music className="w-3.5 h-3.5" /> İndirilenler & Listeleme ({allDownloadedTracks.length})
            </button>

            <button
              onClick={() => setActiveTab('compare')}
              className={`py-2 px-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'compare'
                  ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" /> Liste ile Karşılaştır & Eşitle
            </button>

            <button
              onClick={() => setActiveTab('twolists')}
              className={`py-2 px-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'twolists'
                  ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> İki Listeyi Karşılaştır
            </button>

            <button
              onClick={() => setActiveTab('blend')}
              className={`py-2 px-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'blend'
                  ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
              }`}
            >
              <Shuffle className="w-3.5 h-3.5" /> Liste Karıştırma (Blend)
            </button>

            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'overview'
                  ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" /> Genel Bakış & Hafıza
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {/* 1. TRACKS TAB: LISTING, SEARCH, SORT, SHUFFLE */}
            {activeTab === 'tracks' && (
              <div className="space-y-4">
                {/* Action Bar: Quick Play, Shuffle, Add to Queue */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 bg-neutral-950/80 rounded-2xl border border-neutral-800">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (rawTracksList.length > 0 && onPlayTracksShuffled) {
                          onPlayTracksShuffled(rawTracksList, 'İndirilen Şarkılar');
                          onClose();
                        }
                      }}
                      disabled={rawTracksList.length === 0}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl transition shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-40"
                    >
                      <Shuffle className="w-3.5 h-3.5" /> İndirilenleri Karışık Çal
                    </button>

                    <button
                      onClick={() => {
                        if (rawTracksList.length > 0 && onPlayTrack) {
                          onPlayTrack(rawTracksList[0], rawTracksList, 'İndirilen Şarkılar');
                          onClose();
                        }
                      }}
                      disabled={rawTracksList.length === 0}
                      className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer disabled:opacity-40"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Sırayla Çal
                    </button>

                    {onAddToQueue && (
                      <button
                        onClick={() => {
                          if (rawTracksList.length > 0) {
                            onAddToQueue(rawTracksList, 'İndirilen Şarkılar');
                          }
                        }}
                        disabled={rawTracksList.length === 0}
                        className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold rounded-xl transition cursor-pointer disabled:opacity-40"
                        title="Tümünü Çalma Sırasına Ekle"
                      >
                        <Plus className="w-3.5 h-3.5" /> Sıraya Ekle
                      </button>
                    )}
                  </div>

                  <div className="text-xs text-neutral-400 font-mono">
                    {filteredDownloadedTracks.length} / {allDownloadedTracks.length} parça listelendi
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      type="text"
                      placeholder="İndirilen şarkı veya sanatçı ara..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <select
                        value={sortOption}
                        onChange={e => setSortOption(e.target.value as SortOption)}
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-300 focus:outline-none focus:border-emerald-500 transition appearance-none cursor-pointer"
                      >
                        <option value="date-desc">Sırala: Eklenme Tarihi</option>
                        <option value="title-asc">Sırala: Şarkı Adı (A - Z)</option>
                        <option value="artist-asc">Sırala: Sanatçı Adı (A - Z)</option>
                        <option value="duration-desc">Sırala: Süre (En Uzun)</option>
                      </select>
                      <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500 pointer-events-none" />
                    </div>

                    <div className="relative flex-1">
                      <select
                        value={selectedPlaylistFilter}
                        onChange={e => setSelectedPlaylistFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-300 focus:outline-none focus:border-emerald-500 transition appearance-none cursor-pointer"
                      >
                        <option value="all">Tüm Listeler</option>
                        {playlists.map(p => (
                          <option key={p.id} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Track List */}
                <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-1">
                  {filteredDownloadedTracks.length === 0 ? (
                    <div className="py-12 text-center text-neutral-500">
                      <Music className="w-10 h-10 mx-auto mb-2 opacity-30 text-emerald-400" />
                      <p className="text-sm font-bold text-neutral-300">İndirilen şarkı bulunamadı</p>
                      <p className="text-xs text-neutral-500 mt-1">
                        {searchQuery ? 'Arama kriterlerinize uygun şarkı yok.' : 'Çalma listelerinden şarkı indirerek çevrimdışı dinleyin.'}
                      </p>
                    </div>
                  ) : (
                    filteredDownloadedTracks.map(({ track, playlistNames }) => (
                      <div
                        key={track.id}
                        className="p-2.5 bg-neutral-950 hover:bg-neutral-800/60 rounded-xl border border-neutral-800/80 flex items-center justify-between transition group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <img
                            src={track.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500'}
                            alt={track.title}
                            className="w-10 h-10 rounded-lg object-cover shrink-0 border border-neutral-800"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition">
                              {track.title}
                            </div>
                            <div className="text-[11px] text-neutral-400 truncate">{track.artist}</div>
                            <div className="text-[9px] text-neutral-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Cihazda
                              </span>
                              <span>•</span>
                              <span className="text-neutral-400 truncate">
                                {playlistNames.join(', ') || 'Kitaplık'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {onPlayTrack && (
                            <button
                              onClick={() => {
                                onPlayTrack(track, rawTracksList, 'İndirilen Şarkılar');
                                onClose();
                              }}
                              className="p-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black rounded-lg transition cursor-pointer"
                              title="Şimdi Çal"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                          )}

                          {onAddToQueue && (
                            <button
                              onClick={() => onAddToQueue([track], 'İndirilen')}
                              className="p-2 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 rounded-lg transition cursor-pointer"
                              title="Sıraya Ekle"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteTrackOffline(track.id)}
                            className="p-2 hover:bg-rose-950/40 text-neutral-500 hover:text-rose-400 rounded-lg transition cursor-pointer"
                            title="Cihaz Hafızasından Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 2. COMPARE TAB: COMPARE DOWNLOADED VS PLAYLIST & ONE-CLICK SYNC */}
            {activeTab === 'compare' && (
              <div className="space-y-4">
                <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-bold text-neutral-300">
                      Karşılaştırılacak Çalma Listesi:
                    </label>
                    <select
                      value={comparePlaylistId}
                      onChange={e => setComparePlaylistId(e.target.value)}
                      className="px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {playlists.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.tracks.length} şarkı)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Visual Progress Ratio Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-400">Çevrimdışı Hazır Olma Durumu:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        %{compareStats.percent} ({compareStats.downloaded} / {compareStats.total} şarkı)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-neutral-800 rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                        style={{ width: `${compareStats.percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Summary Badges & Sync Action */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800/80">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {compareStats.downloaded} İndirildi
                      </span>
                      <span className="text-amber-400 flex items-center gap-1 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5" /> {compareStats.missing} Eksik
                      </span>
                    </div>

                    {compareStats.missing > 0 && onDownloadSingleTrack && (
                      <button
                        onClick={handleSyncMissingTracks}
                        disabled={isSyncingMissing}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl transition shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                      >
                        {isSyncingMissing ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> İndiriliyor...
                          </>
                        ) : (
                          <>
                            <DownloadCloud className="w-3.5 h-3.5" /> Eksik {compareStats.missing} Şarkıyı İndir
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Song by Song Comparison */}
                <div className="space-y-1.5 max-h-[46vh] overflow-y-auto pr-1">
                  {comparePlaylist?.tracks.map(track => {
                    const downloaded = isTrackDownloaded(track.id);
                    const isDownloadingThis = downloadingTrackId === track.id;
                    return (
                      <div
                        key={track.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                          downloaded
                            ? 'bg-neutral-950/60 border-neutral-800/60'
                            : 'bg-amber-950/10 border-amber-500/20'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <img
                            src={track.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500'}
                            alt={track.title}
                            className="w-9 h-9 rounded-lg object-cover shrink-0 border border-neutral-800"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-white truncate">{track.title}</div>
                            <div className="text-[11px] text-neutral-400 truncate">{track.artist}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {downloaded ? (
                            <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/20 flex items-center gap-1">
                              <Check className="w-3 h-3" /> İndirildi
                            </span>
                          ) : (
                            <button
                              onClick={() => handleDownloadSingle(track)}
                              disabled={isDownloadingThis}
                              className="text-[11px] px-2.5 py-1 rounded-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 font-bold border border-amber-500/30 flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                            >
                              {isDownloadingThis ? (
                                <>
                                  <RefreshCw className="w-3 h-3 animate-spin" /> İndiriliyor
                                </>
                              ) : (
                                <>
                                  <ArrowDownToLine className="w-3 h-3" /> İndir
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. TWO LISTS TAB: COMPARE LIST A VS LIST B */}
            {activeTab === 'twolists' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-neutral-950 rounded-2xl border border-neutral-800">
                  <div>
                    <label className="text-xs font-bold text-neutral-400 mb-1 block">1. Çalma Listesi:</label>
                    <select
                      value={twoListIdA}
                      onChange={e => setTwoListIdA(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {playlists.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.tracks.length} şarkı)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-neutral-400 mb-1 block">2. Çalma Listesi:</label>
                    <select
                      value={twoListIdB}
                      onChange={e => setTwoListIdB(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {playlists.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.tracks.length} şarkı)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Comparison Analysis Grid */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-center">
                    <div className="text-[10px] text-neutral-400 font-semibold truncate">Ortak Şarkılar</div>
                    <div className="text-xl font-bold text-emerald-400 mt-1">{twoListComparison.common.length}</div>
                  </div>
                  <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-center">
                    <div className="text-[10px] text-neutral-400 font-semibold truncate">Sadece {listA?.name || 'Liste 1'}</div>
                    <div className="text-xl font-bold text-cyan-400 mt-1">{twoListComparison.onlyA.length}</div>
                  </div>
                  <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-center">
                    <div className="text-[10px] text-neutral-400 font-semibold truncate">Sadece {listB?.name || 'Liste 2'}</div>
                    <div className="text-xl font-bold text-purple-400 mt-1">{twoListComparison.onlyB.length}</div>
                  </div>
                </div>

                {/* Actions for Two Lists */}
                <div className="flex flex-wrap gap-2">
                  {onCreatePlaylist && twoListComparison.common.length > 0 && (
                    <button
                      onClick={() => {
                        const name = `🤝 Ortak: ${listA?.name} & ${listB?.name}`;
                        onCreatePlaylist(name, twoListComparison.common);
                        onClose();
                      }}
                      className="flex-1 min-w-[200px] flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Ortak Şarkılardan Yeni Liste Yap ({twoListComparison.common.length})
                    </button>
                  )}

                  {onCreatePlaylist && (
                    <button
                      onClick={() => {
                        const combinedMap = new Map<string, Track>();
                        for (const t of listA?.tracks || []) combinedMap.set(t.id, t);
                        for (const t of listB?.tracks || []) combinedMap.set(t.id, t);
                        const name = `🔗 Birleşim: ${listA?.name} + ${listB?.name}`;
                        onCreatePlaylist(name, Array.from(combinedMap.values()));
                        onClose();
                      }}
                      className="flex-1 min-w-[200px] flex items-center justify-center gap-1.5 py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" /> İki Listeyi Birleştir
                    </button>
                  )}
                </div>

                {/* Common Tracks Preview */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-neutral-400">
                    Ortak Parçalar ({twoListComparison.common.length}):
                  </div>
                  <div className="max-h-[30vh] overflow-y-auto space-y-1.5 pr-1">
                    {twoListComparison.common.length === 0 ? (
                      <div className="p-4 text-center text-xs text-neutral-500 bg-neutral-950 rounded-xl border border-neutral-800">
                        Bu iki çalma listesinde ortak parça bulunmuyor.
                      </div>
                    ) : (
                      twoListComparison.common.map(track => (
                        <div
                          key={track.id}
                          className="p-2 bg-neutral-950 rounded-lg border border-neutral-800 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={track.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500'}
                              alt={track.title}
                              className="w-7 h-7 rounded object-cover"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-white truncate">{track.title}</div>
                              <div className="text-[10px] text-neutral-400 truncate">{track.artist}</div>
                            </div>
                          </div>
                          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            Ortak
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 4. BLEND TAB: MIX DOWNLOADED WITH ANY PLAYLIST */}
            {activeTab === 'blend' && (
              <div className="space-y-4">
                <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-3">
                  <div>
                    <label className="text-xs font-bold text-neutral-300 mb-1 block">
                      İndirilen Şarkılar ile Harmanlanacak Liste:
                    </label>
                    <select
                      value={blendPlaylistId}
                      onChange={e => setBlendPlaylistId(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {playlists.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.tracks.length} şarkı)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Ratio Slider */}
                  <div className="space-y-2 pt-2 border-t border-neutral-800">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-emerald-400">%{blendRatio} İndirilenler</span>
                      <span className="text-cyan-400">%{100 - blendRatio} {blendTargetPlaylist?.name || 'Seçilen Liste'}</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      step="5"
                      value={blendRatio}
                      onChange={e => setBlendRatio(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Blend Actions */}
                <div className="space-y-2.5">
                  <button
                    onClick={handlePlayBlend}
                    disabled={allDownloadedTracks.length === 0 && (!blendTargetPlaylist || blendTargetPlaylist.tracks.length === 0)}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-40"
                  >
                    <Shuffle className="w-4 h-4" /> Harmanlanmış Karışımı Hemen Çal
                  </button>

                  {onCreatePlaylist && (
                    <button
                      onClick={handleSaveBlendAsPlaylist}
                      disabled={allDownloadedTracks.length === 0 && (!blendTargetPlaylist || blendTargetPlaylist.tracks.length === 0)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer disabled:opacity-40"
                    >
                      <Plus className="w-4 h-4" /> Yeni Karışık Çalma Listesi Olarak Kaydet
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 5. OVERVIEW TAB: SYSTEM METRICS & SWITCHES */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
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
                      <span>{allDownloadedTracks.length || stats.count} Şarkı</span>
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
                    disabled={isDownloadingAll}
                    className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl text-xs font-bold transition shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                  >
                    {isDownloadingAll ? (
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
                    disabled={(stats.count === 0 && allDownloadedTracks.length === 0) || isClearing}
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
