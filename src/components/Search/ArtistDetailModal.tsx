import React, { useState, useEffect } from 'react';
import { 
  X, Play, Radio, Heart, Plus, ListPlus, Check, HardDrive, 
  Loader2, Music, Award, Flame, Disc, Sparkles 
} from 'lucide-react';
import { Track, ArtistResult, Playlist } from '../../types';
import { isArtistFollowed, toggleFollowArtist, isTrackFollowed, toggleFollowTrack } from '../../services/followService';

interface ArtistDetailModalProps {
  artist: ArtistResult | null;
  onClose: () => void;
  playlists: Playlist[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track, contextTracks?: Track[], contextName?: string) => void;
  onAddTrackToPlaylist: (track: Track, playlistId: string) => void;
  onAddToQueue?: (track: Track) => void;
  onPlayNext?: (track: Track) => void;
  onDownloadTrackOffline: (track: Track) => Promise<void>;
  onStartSongRadio?: (track: Track) => void;
}

export const ArtistDetailModal: React.FC<ArtistDetailModalProps> = ({
  artist,
  onClose,
  playlists,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onAddTrackToPlaylist,
  onAddToQueue,
  onPlayNext,
  onDownloadTrackOffline,
  onStartSongRadio
}) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowed, setIsFollowed] = useState(false);
  const [selectedTrackForAdd, setSelectedTrackForAdd] = useState<Track | null>(null);

  useEffect(() => {
    if (!artist) return;
    setIsFollowed(isArtistFollowed(artist.name));
    setIsLoading(true);

    const fetchTracks = async () => {
      try {
        const res = await fetch(`/api/artist/top-tracks?artistId=${encodeURIComponent(artist.id)}&artistName=${encodeURIComponent(artist.name)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.tracks && Array.isArray(data.tracks)) {
            setTracks(data.tracks);
          }
        }
      } catch (err) {
        console.warn('Artist top tracks fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTracks();
  }, [artist]);

  if (!artist) return null;

  const handleToggleFollow = () => {
    const newState = toggleFollowArtist(artist.name);
    setIsFollowed(newState);
  };

  const handlePlayAll = () => {
    if (tracks.length === 0) return;
    onPlayTrack(tracks[0], tracks, `${artist.name} Hitleri`);
  };

  const handleStartArtistRadio = () => {
    if (tracks.length > 0 && onStartSongRadio) {
      onStartSongRadio(tracks[0]);
    } else if (onStartSongRadio) {
      onStartSongRadio({
        id: `seed_${Date.now()}`,
        title: `${artist.name} Şarkıları`,
        artist: artist.name,
        album: artist.name,
        duration: 210,
        coverUrl: artist.picture,
        audioUrl: '',
        source: 'stream',
        addedAt: new Date().toISOString()
      });
    }
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-fade-in select-none">
      <div className="w-full max-w-3xl max-h-[90vh] bg-[#0c0f17] border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative text-neutral-100">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2.5 bg-black/60 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-full transition cursor-pointer backdrop-blur-md border border-neutral-700"
          title="Kapat"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Banner with Artist Picture */}
        <div className="relative p-6 sm:p-8 bg-gradient-to-b from-emerald-950/40 via-neutral-900/60 to-[#0c0f17] border-b border-neutral-800/80 shrink-0">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
            <div className="relative group">
              <img
                src={artist.picture}
                alt={artist.name}
                className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover shadow-2xl border-2 border-emerald-500/40 ring-4 ring-black/40"
              />
              <div className="absolute inset-0 rounded-full bg-black/20" />
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" /> Doğrulanmış Sanatçı
                </span>
                {artist.genres && artist.genres.length > 0 && (
                  <span className="text-xs text-neutral-400 font-medium hidden sm:inline">
                    • {artist.genres.join(', ')}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                {artist.name}
              </h1>

              <div className="flex items-center justify-center sm:justify-start gap-3 text-xs text-neutral-400">
                <span className="font-semibold text-neutral-300">{artist.fans || 'Milyonlarca Dinleyici'}</span>
                <span>•</span>
                <span>{tracks.length > 0 ? `${tracks.length} Popüler Parça` : 'Popüler Eserler'}</span>
              </div>

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-2">
                <button
                  onClick={handlePlayAll}
                  disabled={tracks.length === 0}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-black text-xs rounded-full transition flex items-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-black" /> Tümünü Çal
                </button>

                <button
                  onClick={handleStartArtistRadio}
                  className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white font-bold text-xs rounded-full border border-neutral-700 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Radio className="w-4 h-4 text-amber-400" /> Sanatçı Radyosu
                </button>

                <button
                  onClick={handleToggleFollow}
                  className={`px-4 py-2.5 rounded-full font-bold text-xs border transition flex items-center gap-1.5 cursor-pointer ${
                    isFollowed
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-700'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isFollowed ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span>{isFollowed ? 'Takip Ediliyor' : 'Takip Et'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Tracks List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2 custom-scrollbar">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800/80">
            <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
              <Flame className="w-4 h-4 text-emerald-400" />
              <span>En Popüler Şarkılar ({tracks.length})</span>
            </h2>
            <span className="text-[11px] text-neutral-500">Orijinal Stüdyo Kayıtları</span>
          </div>

          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
              <p className="text-xs text-neutral-400 font-medium">{artist.name} şarkıları yükleniyor...</p>
            </div>
          ) : tracks.length === 0 ? (
            <div className="py-16 text-center text-neutral-500 space-y-2">
              <Disc className="w-10 h-10 mx-auto opacity-40" />
              <p className="text-sm font-semibold">Bu sanatçıya ait parça bulunamadı</p>
            </div>
          ) : (
            tracks.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id || currentTrack?.title === track.title;
              const isCurrentPlaying = isCurrent && isPlaying;
              const isTrackFav = isTrackFollowed(track.id) || isTrackFollowed(track.title);

              return (
                <div
                  key={`${track.id}_${idx}`}
                  className={`group flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition gap-3 ${
                    isCurrent
                      ? 'bg-emerald-500/15 border-emerald-500/50 shadow-md'
                      : 'bg-neutral-900/40 hover:bg-neutral-900 border-neutral-800/60 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="w-6 text-center text-xs font-mono text-neutral-500 font-bold shrink-0">
                      {idx + 1}
                    </span>

                    <button
                      onClick={() => onPlayTrack(track, tracks, `${artist.name} Hitleri`)}
                      className="w-11 h-11 rounded-xl overflow-hidden relative shrink-0 group/play shadow-md cursor-pointer"
                    >
                      <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/play:opacity-100 transition">
                        <Play className="w-5 h-5 text-white fill-white" />
                      </div>
                      {isCurrentPlaying && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                        </div>
                      )}
                    </button>

                    <div
                      onClick={() => onPlayTrack(track, tracks, `${artist.name} Hitleri`)}
                      className="min-w-0 flex-1 cursor-pointer"
                    >
                      <div className={`text-xs sm:text-sm font-bold truncate ${isCurrent ? 'text-emerald-400' : 'text-white'}`}>
                        {track.title}
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate flex items-center gap-1.5 mt-0.5">
                        <span className="truncate">{track.album || track.genre || artist.name}</span>
                        {track.popularity && track.popularity >= 90 && (
                          <span className="px-1 py-0.2 bg-rose-500/20 text-rose-300 text-[9px] font-bold rounded">
                            Hit
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-mono text-neutral-500 mr-1 hidden sm:inline">
                      {formatDuration(track.duration)}
                    </span>

                    <button
                      onClick={() => toggleFollowTrack(track)}
                      className={`p-2 rounded-xl border transition cursor-pointer ${
                        isTrackFav
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                          : 'bg-neutral-950 hover:bg-neutral-800 border-neutral-800 text-neutral-400 hover:text-rose-400'
                      }`}
                      title={isTrackFav ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isTrackFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                    </button>

                    {onAddToQueue && (
                      <button
                        onClick={() => onAddToQueue(track)}
                        className="p-2 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-xl border border-neutral-800 transition cursor-pointer"
                        title="Sıraya Ekle"
                      >
                        <ListPlus className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => onDownloadTrackOffline(track)}
                      className={`p-2 rounded-xl border transition cursor-pointer ${
                        track.isOfflineCached
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                          : 'bg-neutral-950 hover:bg-neutral-800 border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                      title="Çevrimdışı İndir"
                    >
                      {track.isOfflineCached ? <Check className="w-3.5 h-3.5" /> : <HardDrive className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={() => setSelectedTrackForAdd(track)}
                      className="px-2.5 py-1.5 bg-neutral-950 hover:bg-emerald-500/20 text-neutral-300 hover:text-emerald-300 rounded-xl text-xs font-bold border border-neutral-800 transition cursor-pointer"
                      title="Listeye Ekle"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add Track to Playlist Sub-Modal */}
        {selectedTrackForAdd && (
          <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-5 text-neutral-100 shadow-2xl space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" /> Şarkıyı Listeye Ekle
              </h3>
              <div className="text-xs text-neutral-300 font-medium truncate">
                "{selectedTrackForAdd.title}" - {selectedTrackForAdd.artist}
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                {playlists.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onAddTrackToPlaylist(selectedTrackForAdd, p.id);
                      setSelectedTrackForAdd(null);
                    }}
                    className="w-full flex items-center justify-between p-2.5 hover:bg-neutral-800 rounded-xl text-xs font-semibold text-left transition cursor-pointer"
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="text-[10px] text-neutral-500">{p.tracks.length} şarkı</span>
                  </button>
                ))}
              </div>
              <div className="flex justify-end pt-2 border-t border-neutral-800">
                <button
                  onClick={() => setSelectedTrackForAdd(null)}
                  className="px-4 py-1.5 text-xs text-neutral-400 hover:text-white cursor-pointer"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
