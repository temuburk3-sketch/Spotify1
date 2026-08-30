import React, { useState, useMemo, memo, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, Shuffle, DownloadCloud, HardDrive, Share2, Users, Palette, Plus, Search, Trash2, ArrowUp, ArrowDown, Music, ThumbsUp, MoreHorizontal, Sparkles, CheckCircle2, Link as LinkIcon, Radio, Clock, LayoutList, ListFilter, Zap, Heart } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Playlist, Track } from '../../types';
import { isTrackFollowed, toggleFollowTrack, subscribeToFollowChanges } from '../../services/followService';

interface PlaylistDetailProps {
  playlist: Playlist;
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track, contextTracks?: Track[], contextName?: string) => void;
  onPlayPlaylist: (playlist: Playlist, shuffle?: boolean) => void;
  onTogglePlay: () => void;
  onReorderTracks: (playlistId: string, fromIndex: number, toIndex: number) => void;
  onRemoveTrack: (playlistId: string, trackId: string) => void;
  onOpenCoverStudio: () => void;
  onOpenCollaborativeModal: () => void;
  onOpenSpotifyImport: () => void;
  onOpenLocalImport: () => void;
  onOpenAutoExpand: () => void;
  onOpenPlaylistMixer?: () => void;
  onUpvoteTrack: (playlistId: string, trackId: string) => void;
  onAddToQueue: (track: Track) => void;
  onDownloadTrackOffline: (track: Track) => Promise<void>;
  onDownloadAllOffline: (playlist: Playlist) => Promise<void>;
  onStartSongRadio?: (track: Track) => void;
}

export const PlaylistDetail: React.FC<PlaylistDetailProps> = memo(({
  playlist,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onPlayPlaylist,
  onTogglePlay,
  onReorderTracks,
  onRemoveTrack,
  onOpenCoverStudio,
  onOpenCollaborativeModal,
  onOpenSpotifyImport,
  onOpenLocalImport,
  onOpenAutoExpand,
  onOpenPlaylistMixer,
  onUpvoteTrack,
  onAddToQueue,
  onDownloadTrackOffline,
  onDownloadAllOffline,
  onStartSongRadio
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'custom' | 'title' | 'artist' | 'duration' | 'upvotes'>('custom');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [isCompactView, setIsCompactView] = useState(false);
  const [visibleCount, setVisibleCount] = useState(80);
  const [followUpdateTick, setFollowUpdateTick] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // Subscribe to follow changes to re-render hearts
  useEffect(() => {
    const unsubscribe = subscribeToFollowChanges(() => {
      setFollowUpdateTick(prev => prev + 1);
    });
    return unsubscribe;
  }, []);

  // Reset visible limit on playlist change or search
  useEffect(() => {
    setVisibleCount(80);
  }, [playlist.id, searchQuery, sortBy]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const totalDuration = useMemo(() => {
    return (playlist.tracks || []).reduce((acc, t) => acc + (t.duration || 0), 0);
  }, [playlist.tracks]);

  const formattedTotalTime = useMemo(() => {
    const hours = Math.floor(totalDuration / 3600);
    const mins = Math.floor((totalDuration % 3600) / 60);
    if (hours > 0) return `${hours} saat ${mins} dakika`;
    return `${mins} dakika`;
  }, [totalDuration]);

  // Filter & sort with memoization
  const displayedTracks = useMemo(() => {
    let tracks = [...(playlist.tracks || [])];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      tracks = tracks.filter(
        t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || (t.genre && t.genre.toLowerCase().includes(q))
      );
    }

    if (sortBy === 'title') {
      tracks.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'artist') {
      tracks.sort((a, b) => a.artist.localeCompare(b.artist));
    } else if (sortBy === 'duration') {
      tracks.sort((a, b) => b.duration - a.duration);
    } else if (sortBy === 'upvotes') {
      tracks.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    }
    return tracks;
  }, [playlist.tracks, searchQuery, sortBy]);

  // Handle infinite scroll trigger for 1000 items
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 400 && visibleCount < displayedTracks.length) {
      setVisibleCount(prev => Math.min(prev + 60, displayedTracks.length));
    }
  };

  const handleDownloadAll = async () => {
    setIsDownloadingAll(true);
    await onDownloadAllOffline(playlist);
    setIsDownloadingAll(false);
    confetti({ particleCount: 50, spread: 60 });
  };

  const isPlaylistActive = playlist.tracks.some(t => t.id === currentTrack?.id);
  const visibleTracks = displayedTracks.slice(0, visibleCount);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto pb-56 sm:pb-44 text-neutral-100 select-none custom-scrollbar"
    >
      {/* Hero Banner with Theme Glow */}
      <div className="relative p-6 md:p-8 bg-gradient-to-b from-emerald-950/60 via-neutral-900/80 to-neutral-900 border-b border-neutral-800">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 max-w-6xl mx-auto">
          {/* Cover Art with Quick Studio Trigger */}
          <div className="relative group shrink-0">
            <div className="w-48 h-48 md:w-56 md:h-56 rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative bg-neutral-950">
              <img
                src={playlist.coverUrl}
                alt={playlist.name}
                className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
              />
              <button
                onClick={onOpenCoverStudio}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1.5 text-xs font-bold text-white transition backdrop-blur-xs cursor-pointer"
              >
                <Palette className="w-6 h-6 text-emerald-400" />
                <span>Kapağı Özelleştir</span>
              </button>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 text-center md:text-left min-w-0">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
              <span className="text-[11px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Çalma Listesi
              </span>

              {playlist.tracks.length >= 100 && (
                <span className="flex items-center gap-1 text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  <Zap className="w-3 h-3 text-indigo-400" /> 1000 Şarkı Kapasitesi
                </span>
              )}

              {playlist.isCollaborative && (
                <button
                  onClick={onOpenCollaborativeModal}
                  className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-indigo-400" /> Ortak Liste (Oda: {playlist.roomCode || 'Açık'})
                </button>
              )}

              {playlist.isDownloadedOffline && (
                <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Çevrimdışı İndirildi
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-white tracking-tight line-clamp-2">
              {playlist.name}
            </h1>

            <p className="text-xs md:text-sm text-neutral-300 mt-2 line-clamp-2 max-w-2xl font-medium">
              {playlist.description || 'Spotify tarzı sınırsız müzik ve ultra hızlı çalma deneyimi.'}
            </p>

            {/* Collaborators & Stats */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4 text-xs text-neutral-400">
              {playlist.collaborators && playlist.collaborators.length > 0 && (
                <div className="flex items-center -space-x-2">
                  {playlist.collaborators.slice(0, 4).map((c) => (
                    <img
                      key={c.id}
                      src={c.avatar}
                      alt={c.name}
                      title={c.name}
                      className="w-6 h-6 rounded-full border-2 border-neutral-900 object-cover"
                    />
                  ))}
                  {playlist.collaborators.length > 4 && (
                    <div className="w-6 h-6 rounded-full bg-neutral-800 border-2 border-neutral-900 flex items-center justify-center text-[9px] font-bold text-neutral-300">
                      +{playlist.collaborators.length - 4}
                    </div>
                  )}
                </div>
              )}

              <span className="font-semibold text-neutral-200">{playlist.tracks.length} şarkı</span>
              <span>•</span>
              <span className="text-neutral-300 font-medium">{formattedTotalTime}</span>
              {playlist.tracks.length > 0 && (
                <>
                  <span>•</span>
                  <span className="text-emerald-400/90 font-mono text-[11px]">0 Gecikmeli Oynatma</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Action Bar */}
      <div className="max-w-6xl mx-auto px-6 py-5 flex flex-wrap items-center justify-between gap-4">
        {/* Play & Shuffle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (isPlaylistActive && isPlaying) {
                onTogglePlay();
              } else {
                onPlayPlaylist(playlist, false);
              }
            }}
            disabled={playlist.tracks.length === 0}
            className="w-13 h-13 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black flex items-center justify-center transition transform hover:scale-105 shadow-xl shadow-emerald-500/25 cursor-pointer"
            title="Tümünü Çal"
          >
            {isPlaylistActive && isPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={() => onPlayPlaylist(playlist, true)}
            disabled={playlist.tracks.length === 0}
            className="p-3 text-neutral-300 hover:text-white rounded-full hover:bg-neutral-800 transition cursor-pointer"
            title="Karışık Çal (Hafızalı Shuffle)"
          >
            <Shuffle className="w-5 h-5" />
          </button>

          {/* Download offline */}
          <button
            onClick={handleDownloadAll}
            disabled={isDownloadingAll || playlist.tracks.length === 0}
            className="p-3 text-neutral-300 hover:text-emerald-400 rounded-full hover:bg-neutral-800 transition cursor-pointer"
            title="Tüm Listeyi Çevrimdışı İndir (İnternetsiz Dinleme)"
          >
            <DownloadCloud className={`w-5 h-5 ${isDownloadingAll ? 'animate-bounce text-emerald-400' : ''}`} />
          </button>

          {/* Playlist Mixer / Blend Button */}
          {onOpenPlaylistMixer && (
            <button
              onClick={onOpenPlaylistMixer}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600/30 to-indigo-600/30 hover:from-emerald-600/40 hover:to-indigo-600/40 text-emerald-300 rounded-full text-xs font-bold transition border border-emerald-500/40 cursor-pointer shadow-sm"
              title="1'den fazla listeyi seçip birleştirin, akıllıca karıştırın veya sıraya ekleyin"
            >
              <Shuffle className="w-4 h-4 text-emerald-400" /> Listeleri Karıştır (Mix)
            </button>
          )}

          {/* Collaborative Modal */}
          <button
            onClick={onOpenCollaborativeModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full text-xs font-bold transition border border-neutral-700 cursor-pointer"
          >
            <Users className="w-4 h-4 text-emerald-400" /> Ortak Çalışma & QR
          </button>

          {/* Cover studio */}
          <button
            onClick={onOpenCoverStudio}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full text-xs font-bold transition border border-neutral-700 cursor-pointer"
          >
            <Palette className="w-4 h-4 text-indigo-400" /> Kapak Tasarla
          </button>
        </div>

        {/* Import & AI shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenAutoExpand}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-500/20 via-indigo-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-indigo-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            title="Bu listedeki şarkılara benzer yeni parçalar bularak listeyi otomatik genişlet"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>AI ile Listeyi Genişlet</span>
          </button>

          <button
            onClick={onOpenSpotifyImport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1DB954]/15 hover:bg-[#1DB954]/25 text-[#1DB954] border border-[#1DB954]/30 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <LinkIcon className="w-3.5 h-3.5" /> Spotify'dan Ekle (1000 Max)
          </button>
          <button
            onClick={onOpenLocalImport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> MP3 Yükle
          </button>
        </div>
      </div>

      {/* Filter, Sort & Search */}
      <div className="max-w-6xl mx-auto px-6 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={`${playlist.tracks.length} şarkı içinde anında ara...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* View toggle */}
          <button
            onClick={() => setIsCompactView(!isCompactView)}
            className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
              isCompactView
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
            title={isCompactView ? 'Standart Görünüme Geç' : 'Kompakt Satır Görünümüne Geç'}
          >
            <LayoutList className="w-4 h-4" />
          </button>

          <span className="text-xs text-neutral-400">Sırala:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="custom">Özel Sıralama (Sürükle / Sırala)</option>
            <option value="upvotes">En Çok Oy Alanlar (Parti Modu)</option>
            <option value="title">Şarkı Başlığı (A-Z)</option>
            <option value="artist">Sanatçı Adı</option>
            <option value="duration">Şarkı Süresi</option>
          </select>
        </div>
      </div>

      {/* Tracks Table / List */}
      <div className="max-w-6xl mx-auto px-6">
        {displayedTracks.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-neutral-800 rounded-2xl bg-neutral-950/40 space-y-3">
            <Music className="w-10 h-10 text-neutral-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">Bu listede henüz şarkı yok</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Spotify linkini yapıştırarak (1000 şarkıya kadar), cihazınızdan MP3 yükleyerek veya keşfet bölümünden şarkı ekleyebilirsiniz.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={onOpenSpotifyImport}
                className="px-4 py-2 bg-[#1DB954] text-black text-xs font-bold rounded-full hover:bg-[#1ed760] transition cursor-pointer"
              >
                Spotify'dan 1000 Şarkıya Kadar Çek
              </button>
              <button
                onClick={onOpenLocalImport}
                className="px-4 py-2 bg-neutral-800 text-white text-xs font-bold rounded-full hover:bg-neutral-700 transition cursor-pointer"
              >
                MP3 Dosyası Seç
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Table Header */}
            <div className="grid grid-cols-12 px-4 py-2 text-[11px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800/80">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-5 md:col-span-4">Başlık</div>
              <div className="col-span-3 hidden md:block">Albüm / Tür</div>
              <div className="col-span-3 md:col-span-2 text-center">Ortak Oy</div>
              <div className="col-span-3 md:col-span-2 text-right">Süre & İşlem</div>
            </div>

            {/* Track rows with incremental render */}
            {visibleTracks.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              const isCurrentPlaying = isCurrent && isPlaying;

              return (
                <div
                  key={track.id}
                  draggable={sortBy === 'custom'}
                  onDragStart={() => setDraggedIndex(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggedIndex !== null && draggedIndex !== idx) {
                      onReorderTracks(playlist.id, draggedIndex, idx);
                      setDraggedIndex(null);
                    }
                  }}
                  className={`group grid grid-cols-12 items-center px-4 rounded-xl border transition cursor-pointer ${
                    isCompactView ? 'py-1.5' : 'py-2.5'
                  } ${
                    isCurrent
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-neutral-950/40 hover:bg-neutral-800/60 border-transparent hover:border-neutral-800'
                  }`}
                >
                  {/* # Index / Play button */}
                  <div className="col-span-1 text-center flex items-center justify-center">
                    {isCurrentPlaying ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePlay();
                        }}
                        className="text-emerald-400"
                      >
                        <Pause className="w-4 h-4 fill-current" />
                      </button>
                    ) : (
                      <>
                        <span className={`text-xs font-mono group-hover:hidden ${isCurrent ? 'text-emerald-400 font-bold' : 'text-neutral-500'}`}>
                          {idx + 1}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlayTrack(track, displayedTracks, playlist.name);
                          }}
                          className="hidden group-hover:block text-white hover:text-emerald-400"
                        >
                          <Play className="w-4 h-4 fill-current" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Title & Artist */}
                  <div
                    onClick={() => onPlayTrack(track, displayedTracks, playlist.name)}
                    className="col-span-5 md:col-span-4 flex items-center gap-3 min-w-0"
                  >
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      loading="lazy"
                      className={`rounded-lg object-cover shrink-0 shadow-sm ${
                        isCompactView ? 'w-7 h-7' : 'w-10 h-10'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className={`text-xs md:text-sm font-semibold truncate ${isCurrent ? 'text-emerald-400 font-bold' : 'text-white'}`}>
                        {track.title}
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate">{track.artist}</div>
                    </div>
                  </div>

                  {/* Album / Genre */}
                  <div className="col-span-3 hidden md:block text-xs text-neutral-400 truncate">
                    <span>{track.genre || track.album || 'SoundPulse Hit'}</span>
                  </div>

                  {/* Collaborative Party Upvote */}
                  <div className="col-span-3 md:col-span-2 flex items-center justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpvoteTrack(playlist.id, track.id);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 hover:bg-emerald-500/20 text-neutral-300 hover:text-emerald-400 rounded-lg text-xs font-bold border border-neutral-800 transition cursor-pointer"
                      title="Şarkıya Oy Ver (Ortak Liste)"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{track.upvotes || 0}</span>
                    </button>
                  </div>

                  {/* Actions & Duration */}
                  <div className="col-span-3 md:col-span-2 flex items-center justify-end gap-1.5 text-xs text-neutral-400">
                    {/* Follow Song Button (Heart) */}
                    {(() => {
                      const isFollowed = isTrackFollowed(track.id) || isTrackFollowed(track.title);
                      return (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFollowTrack(track);
                          }}
                          className={`p-1.5 rounded-lg hover:bg-neutral-800 transition cursor-pointer ${
                            isFollowed ? 'text-rose-500 opacity-100' : 'text-neutral-500 hover:text-rose-400 opacity-0 group-hover:opacity-100'
                          }`}
                          title={isFollowed ? 'Şarkıyı Takipten Çıkar' : 'Şarkıyı Takip Et (Favorilere Ekle)'}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isFollowed ? 'fill-rose-500 text-rose-500' : ''}`} />
                        </button>
                      );
                    })()}

                    {/* Reorder buttons */}
                    {sortBy === 'custom' && (
                      <div className="hidden sm:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                        <button
                          disabled={idx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            onReorderTracks(playlist.id, idx, idx - 1);
                          }}
                          className="p-1 hover:text-white disabled:opacity-20 cursor-pointer"
                          title="Yukarı Taşı"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={idx === displayedTracks.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            onReorderTracks(playlist.id, idx, idx + 1);
                          }}
                          className="p-1 hover:text-white disabled:opacity-20 cursor-pointer"
                          title="Aşağı Taşı"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Start Song Radio */}
                    {onStartSongRadio && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartSongRadio(track);
                        }}
                        className="p-1.5 text-neutral-400 hover:text-amber-400 rounded-lg hover:bg-neutral-800 transition opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Bu şarkının tarzında radyo başlat"
                      >
                        <Radio className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Download offline */}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await onDownloadTrackOffline(track);
                      }}
                      className={`p-1.5 rounded-lg hover:bg-neutral-800 transition cursor-pointer ${
                        track.isOfflineCached ? 'text-emerald-400' : 'text-neutral-400 hover:text-white'
                      }`}
                      title={track.isOfflineCached ? 'İnternetsiz dinlemeye hazır' : 'Çevrimdışı İndir'}
                    >
                      {track.isOfflineCached ? <CheckCircle2 className="w-4 h-4" /> : <HardDrive className="w-4 h-4" />}
                    </button>

                    {/* Remove track */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveTrack(playlist.id, track.id);
                      }}
                      className="p-1.5 text-neutral-500 hover:text-rose-400 rounded-lg hover:bg-neutral-800 transition opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Listeden Çıkar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Duration */}
                    <span className="font-mono text-[11px] text-neutral-400 w-10 text-right ml-1">
                      {formatDuration(track.duration)}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Load More Button if not all rendered yet */}
            {visibleCount < displayedTracks.length && (
              <div className="text-center py-4">
                <button
                  onClick={() => setVisibleCount(prev => Math.min(prev + 100, displayedTracks.length))}
                  className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-bold text-neutral-200 rounded-full transition cursor-pointer"
                >
                  Daha Fazla Şarkı Yükle ({visibleCount} / {displayedTracks.length} Gösteriliyor)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

PlaylistDetail.displayName = 'PlaylistDetail';
