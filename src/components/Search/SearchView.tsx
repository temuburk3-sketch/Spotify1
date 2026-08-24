import React, { useState, useEffect, useMemo, memo } from 'react';
import { Search, Play, Plus, HardDrive, Check, Music, Disc, Sparkles, Loader2, Volume2, Globe } from 'lucide-react';
import { Track, Playlist } from '../../types';

interface SearchViewProps {
  playlists: Playlist[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onAddTrackToPlaylist: (track: Track, playlistId: string) => void;
  onDownloadTrackOffline: (track: Track) => Promise<void>;
  onOpenSpotifyImport: () => void;
}

const clientSearchCache = new Map<string, Track[]>();

const EXPLORE_GENRES = [
  { name: 'Türkçe Pop', query: 'Türkçe Pop', color: 'from-emerald-600 to-teal-900', icon: '🇹🇷' },
  { name: 'Lo-Fi & Chill', query: 'Lofi Chill', color: 'from-indigo-600 to-slate-900', icon: '☕' },
  { name: 'Akustik & Huzur', query: 'Akustik Türkçe', color: 'from-amber-600 to-stone-900', icon: '🎸' },
  { name: 'Gece Sürüşü', query: 'Synthwave Drive', color: 'from-purple-600 to-neutral-900', icon: '🌃' },
  { name: 'Spor & Motivasyon', query: 'Workout Gym EDM', color: 'from-red-600 to-zinc-900', icon: '⚡' },
  { name: 'Anadolu Rock', query: 'Anadolu Rock', color: 'from-blue-600 to-slate-900', icon: '🔥' },
];

const CURATED_TOP_HITS: Track[] = [
  {
    id: 'curated_1',
    title: 'Antidepresan',
    artist: 'Mert Demir, Mabel Matiz',
    album: 'Antidepresan - Single',
    duration: 202,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/cd/6a/fb/cd6afb23-3442-e7ab-3b39-46f458bcad40/196922249655_Cover.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/fb/3c/74/fb3c7480-781d-1830-3edd-fd15bdb23406/mzaf_17024654962565086082.plus.aac.p.m4a',
    youtubeId: 'i6CSvLvSNZ4',
    source: 'stream',
    genre: 'Türkçe Pop',
    addedAt: new Date().toISOString()
  },
  {
    id: 'curated_2',
    title: 'Bi’ Tek Ben Anlarım',
    artist: 'KÖFN',
    album: 'Bi’ Tek Ben Anlarım - Single',
    duration: 195,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/49/0b/97/490b976f-3322-3aec-eacc-e3876727a112/cover.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview116/v4/ae/9d/83/ae9d833e-c551-a08e-f9f3-1cb68138d233/mzaf_2262890875392296175.plus.aac.p.m4a',
    youtubeId: '9TSf2k03HPA',
    source: 'stream',
    genre: 'Synth Pop',
    addedAt: new Date().toISOString()
  },
  {
    id: 'curated_3',
    title: 'Gülpembe',
    artist: 'Barış Manço',
    album: 'Hal Hal',
    duration: 304,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/96/b5/6f/96b56f34-4bb9-3aa5-add2-5a2504e74562/cover.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/15/84/08/15840844-8e98-e477-10dd-c2a82e30b2a3/mzaf_17204737277130849361.plus.aac.p.m4a',
    youtubeId: 'oEDAhzMI_3g',
    source: 'stream',
    genre: 'Anadolu Rock',
    addedAt: new Date().toISOString()
  },
  {
    id: 'curated_4',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    duration: 200,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/a6/6e/bf/a66ebf79-5008-8948-b352-a790fc87446b/19UM1IM04638.rgb.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/17/b4/8f/17b48f9a-0b93-6bb8-fe1d-3a16623c2cfb/mzaf_9560252727299052414.plus.aac.p.m4a',
    youtubeId: 'fHI8X4OXluQ',
    source: 'stream',
    genre: 'Synthwave',
    addedAt: new Date().toISOString()
  },
  {
    id: 'curated_5',
    title: 'Ateşe Düştüm',
    artist: 'Mert Demir',
    album: 'Ateşe Düştüm',
    duration: 218,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/43/39/bb/4339bbf7-d2c3-22ed-90e7-9a14416780c8/196922638558_Cover.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview126/v4/3c/a3/d1/3ca3d19c-d799-12af-0019-fd694b91812a/mzaf_11591350407176047081.plus.aac.p.m4a',
    youtubeId: 'RQmXet6kZ-Y',
    source: 'stream',
    genre: 'Akustik',
    addedAt: new Date().toISOString()
  }
];

export const SearchView: React.FC<SearchViewProps> = memo(({
  playlists,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onAddTrackToPlaylist,
  onDownloadTrackOffline,
  onOpenSpotifyImport
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineSearchResults, setOnlineSearchResults] = useState<Track[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedTrackForAdd, setSelectedTrackForAdd] = useState<Track | null>(null);

  // Live online search with debouncing & instant cache
  useEffect(() => {
    const trimmed = searchTerm.trim().toLowerCase();
    if (!trimmed) {
      setOnlineSearchResults([]);
      setIsSearchingOnline(false);
      return;
    }

    if (clientSearchCache.has(trimmed)) {
      setOnlineSearchResults(clientSearchCache.get(trimmed)!);
      setIsSearchingOnline(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingOnline(true);
      try {
        // Try server API search first
        const apiRes = await fetch(`/api/audio/search?q=${encodeURIComponent(trimmed)}`);
        if (apiRes.ok) {
          const data = await apiRes.json();
          if (data.results && data.results.length > 0) {
            clientSearchCache.set(trimmed, data.results);
            setOnlineSearchResults(data.results);
            setIsSearchingOnline(false);
            return;
          }
        }

        // Direct iTunes API search fallback
        const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(trimmed)}&entity=song&limit=15`;
        const res = await fetch(itunesUrl);
        if (res.ok) {
          const d = await res.json();
          const mapped: Track[] = (d.results || []).map((item: any, idx: number) => ({
            id: `itunes_search_${item.trackId || idx}`,
            title: item.trackName,
            artist: item.artistName,
            album: item.collectionName || item.trackName,
            duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 180,
            coverUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600',
            audioUrl: item.previewUrl,
            genre: item.primaryGenreName || 'Pop',
            source: 'stream',
            addedAt: new Date().toISOString()
          }));
          clientSearchCache.set(trimmed, mapped);
          setOnlineSearchResults(mapped);
        }
      } catch (err) {
        console.warn('Online search error:', err);
      } finally {
        setIsSearchingOnline(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Combine local playlist tracks + curated top hits with memoization
  const localAvailableTracks = useMemo(() => {
    const allTracksMap = new Map<string, Track>();
    CURATED_TOP_HITS.forEach(t => allTracksMap.set(`${t.title.toLowerCase()}_${t.artist.toLowerCase()}`, t));
    playlists.forEach(p => {
      (p.tracks || []).forEach(t => allTracksMap.set(`${t.title.toLowerCase()}_${t.artist.toLowerCase()}`, t));
    });

    return Array.from(allTracksMap.values()).filter((t) => {
      if (!selectedGenre) return true;
      return t.genre && t.genre.toLowerCase().includes(selectedGenre.toLowerCase());
    });
  }, [playlists, selectedGenre]);

  const displayTracks = searchTerm.trim().length > 0 ? onlineSearchResults : localAvailableTracks;

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 pb-28 text-neutral-100 select-none custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Search Bar */}
        <div className="relative max-w-xl">
          <Search className="w-5 h-5 text-emerald-400 absolute left-4 top-3.5" />
          <input
            type="text"
            placeholder="Şarkı, sanatçı veya grup adı yazın (örn: Duman, Ezhel, Taylor Swift, Barış Manço)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-10 py-3.5 bg-neutral-900 border border-neutral-800 rounded-2xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 shadow-xl transition"
            autoFocus
          />
          {isSearchingOnline ? (
            <Loader2 className="w-4 h-4 text-emerald-400 animate-spin absolute right-4 top-4" />
          ) : searchTerm ? (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-3.5 text-xs text-neutral-400 hover:text-white"
            >
              Temizle
            </button>
          ) : null}
        </div>

        {/* Genre Cards */}
        <div>
          <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Türler & Popüler Akımlar</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {EXPLORE_GENRES.map((g, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (selectedGenre === g.name) {
                    setSelectedGenre(null);
                    setSearchTerm('');
                  } else {
                    setSelectedGenre(g.name);
                    setSearchTerm(g.query);
                  }
                }}
                className={`p-4 rounded-xl bg-gradient-to-br ${g.color} border transition text-left relative overflow-hidden group cursor-pointer ${
                  selectedGenre === g.name ? 'border-white scale-102 ring-2 ring-emerald-500/50' : 'border-neutral-800 opacity-85 hover:opacity-100'
                }`}
              >
                <span className="text-2xl mb-1 block">{g.icon}</span>
                <span className="text-xs font-bold text-white block leading-tight">{g.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search Results */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Music className="w-4 h-4 text-emerald-400" />
              {searchTerm.trim() ? (
                <span>Çevrimiçi Orijinal Şarkı Sonuçları ({displayTracks.length})</span>
              ) : (
                <span>Öne Çıkan & Listelerinizdeki Şarkılar ({displayTracks.length})</span>
              )}
            </h2>
            <button
              onClick={onOpenSpotifyImport}
              className="text-xs text-[#1DB954] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" /> Spotify Linkinden Çalma Listesi Çek
            </button>
          </div>

          {displayTracks.length === 0 && !isSearchingOnline ? (
            <div className="p-12 text-center border border-dashed border-neutral-800 rounded-2xl bg-neutral-950/40 space-y-3">
              <Disc className="w-10 h-10 text-neutral-600 mx-auto" />
              <p className="text-sm text-neutral-400">Aradığınız şarkı bulunamadı. Farklı bir isim veya sanatçı deneyin.</p>
              <button
                onClick={onOpenSpotifyImport}
                className="mt-2 px-5 py-2.5 bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-bold rounded-full transition"
              >
                Spotify'dan Direkt İçe Aktar
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {displayTracks.map((track, idx) => {
                const isCurrent = currentTrack?.id === track.id || currentTrack?.title === track.title;
                const isCurrentPlaying = isCurrent && isPlaying;

                return (
                  <div
                    key={`${track.id}_${idx}`}
                    className={`group flex items-center justify-between p-2.5 rounded-xl border transition ${
                      isCurrent
                        ? 'bg-emerald-500/15 border-emerald-500/40'
                        : 'bg-neutral-950/60 hover:bg-neutral-900 border-neutral-900 hover:border-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        onClick={() => onPlayTrack(track)}
                        className="w-11 h-11 rounded-lg overflow-hidden relative shrink-0 group/play shadow cursor-pointer"
                      >
                        <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/play:opacity-100 transition">
                          <Play className="w-4 h-4 text-white fill-white" />
                        </div>
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className={`text-xs md:text-sm font-semibold truncate ${isCurrent ? 'text-emerald-400 font-bold' : 'text-white'}`}>
                          {track.title}
                        </div>
                        <div className="text-[11px] text-neutral-400 truncate flex items-center gap-1.5">
                          <span>{track.artist}</span>
                          <span className="text-neutral-600">•</span>
                          <span className="text-neutral-500">{track.album || track.genre || 'Müzik'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-mono text-neutral-400 hidden sm:inline mr-1">
                        {formatDuration(track.duration)}
                      </span>

                      {/* Download offline */}
                      <button
                        onClick={() => onDownloadTrackOffline(track)}
                        className={`p-2 rounded-lg hover:bg-neutral-800 transition cursor-pointer ${
                          track.isOfflineCached ? 'text-emerald-400' : 'text-neutral-400 hover:text-white'
                        }`}
                        title={track.isOfflineCached ? 'İndirildi' : 'Çevrimdışı İndir'}
                      >
                        {track.isOfflineCached ? <Check className="w-4 h-4" /> : <HardDrive className="w-4 h-4" />}
                      </button>

                      {/* Add to playlist dropdown / button */}
                      <button
                        onClick={() => setSelectedTrackForAdd(track)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-neutral-900 hover:bg-emerald-500/20 text-neutral-300 hover:text-emerald-400 rounded-xl text-xs font-bold border border-neutral-800 transition cursor-pointer"
                        title="Listeye Ekle"
                      >
                        <Plus className="w-3.5 h-3.5" /> Listeme Ekle
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add To Playlist Modal */}
      {selectedTrackForAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-5 text-neutral-100 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" /> Şarkıyı Listeye Ekle
            </h3>
            <div className="flex items-center gap-3 p-2.5 bg-neutral-950 rounded-xl border border-neutral-800">
              <img src={selectedTrackForAdd.coverUrl} className="w-11 h-11 rounded-lg object-cover" alt="cover" />
              <div className="min-w-0">
                <div className="text-xs font-bold truncate text-white">{selectedTrackForAdd.title}</div>
                <div className="text-[11px] text-neutral-400 truncate">{selectedTrackForAdd.artist}</div>
              </div>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
              <span className="text-[11px] text-neutral-400 block mb-1">Hedef Çalma Listesini Seçin:</span>
              {playlists.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onAddTrackToPlaylist(selectedTrackForAdd, p.id);
                    setSelectedTrackForAdd(null);
                  }}
                  className="w-full flex items-center justify-between p-2.5 hover:bg-neutral-800 rounded-xl text-xs font-semibold text-left transition border border-transparent hover:border-neutral-700 cursor-pointer"
                >
                  <div className="truncate text-neutral-200">{p.name}</div>
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
  );
});

SearchView.displayName = 'SearchView';
