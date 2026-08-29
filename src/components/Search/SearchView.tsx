import React, { useState, useEffect, useMemo, memo } from 'react';
import { 
  Search, Play, Plus, HardDrive, Check, Music, Disc, Sparkles, Loader2, 
  Radio, Flame, Trophy, ListPlus, Sparkle, Globe, ArrowRight,
  TrendingUp, Compass, Headphones, Award, History, X, Trash2, Clock, Zap, Heart
} from 'lucide-react';
import { Track, Playlist } from '../../types';
import { isTrackFollowed, toggleFollowTrack, subscribeToFollowChanges, getFollowedTracks, getFollowedArtists } from '../../services/followService';

interface SearchViewProps {
  playlists: Playlist[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track, contextTracks?: Track[], contextName?: string) => void;
  onAddTrackToPlaylist: (track: Track, playlistId: string) => void;
  onAddToQueue?: (track: Track) => void;
  onPlayNext?: (track: Track) => void;
  onDownloadTrackOffline: (track: Track) => Promise<void>;
  onOpenSpotifyImport: () => void;
  onStartSongRadio?: (track: Track) => void;
  onSaveChartToPlaylist?: (name: string, tracks: Track[]) => void;
}

type SearchCategory = 'followed' | 'originals' | 'all' | 'charts' | 'lyrics' | 'arabesk' | 'pop' | 'rock' | 'rap' | 'synthwave' | 'lofi';

const SEARCH_CATEGORIES: { id: SearchCategory; label: string; icon: string; query?: string }[] = [
  { id: 'followed', label: '❤️ Takip Ettiklerim', icon: '❤️' },
  { id: 'originals', label: '👑 Popüler & Orijinal Hit', icon: '👑' },
  { id: 'all', label: '✨ Tüm Parçalar & Akıllı', icon: '✨' },
  { id: 'charts', label: '🔥 Spotify Trendleri & Top 50', icon: '🔥' },
  { id: 'lyrics', label: '📝 Şarkı Sözleriyle Arama', icon: '📝' },
  { id: 'arabesk', label: '🥀 Arabesk & Damar', icon: '🥀', query: 'Müslüm Gürses Ferdi Tayfur Arabesk' },
  { id: 'pop', label: '🇹🇷 Türkçe Pop', icon: '🇹🇷', query: 'Türkçe Pop Mert Demir Mabel Matiz' },
  { id: 'rock', label: '🎸 Türkçe Rock & Anadolu', icon: '🎸', query: 'Barış Manço Duman Rock' },
  { id: 'rap', label: '🎤 Türkçe Rap & Hip-Hop', icon: '🎤', query: 'Türkçe Rap Ezhel Ceza Sagopa' },
  { id: 'synthwave', label: '🌃 Synthwave & Retro', icon: '🌃', query: 'The Weeknd Synthwave 80s' },
  { id: 'lofi', label: '☕ Lo-Fi & Chill', icon: '☕', query: 'Lofi Chill Study Beats' }
];

const DEFAULT_POPULAR_ORIGINALS: Track[] = [
  {
    id: 'pop_orig_1',
    title: 'Ateşe Düştüm',
    artist: 'Mert Demir',
    album: 'Ateşe Düştüm',
    duration: 231,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/43/39/bb/4339bbf7-d2c3-22ed-90e7-9a14416780c8/196922638558_Cover.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview126/v4/3c/a3/d1/3ca3d19c-d799-12af-0019-fd694b91812a/mzaf_11591350407176047081.plus.aac.p.m4a',
    genre: 'Akustik / Pop',
    source: 'stream',
    isOriginal: true,
    popularity: 99,
    addedAt: new Date().toISOString()
  },
  {
    id: 'pop_orig_2',
    title: 'Antidepresan',
    artist: 'Mabel Matiz & Mert Demir',
    album: 'Fatih',
    duration: 254,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/36/53/4e/36534e56-2dbb-5e6f-5777-61c0e3933c07/cover.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview112/v4/46/d6/3b/46d63bc7-0cfc-5b23-2287-e23114a840e6/mzaf_7822964972583803875.plus.aac.p.m4a',
    genre: 'Türkçe Pop',
    source: 'stream',
    isOriginal: true,
    popularity: 98,
    addedAt: new Date().toISOString()
  },
  {
    id: 'pop_orig_3',
    title: 'Affet',
    artist: 'Müslüm Gürses',
    album: 'Aşk Tesadüfleri Sever',
    duration: 268,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music118/v4/bc/f5/a3/bcf5a3c2-dcfb-5542-a4f6-8c4d52f6bfa7/8691531003426.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/2d/a6/5e/2da65e23-ee4e-1282-5950-c4083a216c56/mzaf_6733221971707204998.plus.aac.p.m4a',
    genre: 'Arabesk / Damar',
    source: 'stream',
    isOriginal: true,
    popularity: 99,
    addedAt: new Date().toISOString()
  },
  {
    id: 'pop_orig_4',
    title: 'Bir Derdim Var',
    artist: 'Mor ve Ötesi',
    album: 'Dünya Yalan Söylüyor',
    duration: 218,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/10/d8/ec/10d8ecf6-02e0-2df5-f674-c361952e42ef/8697407050304.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/44/2a/39/442a3928-a554-ce15-e2f4-6e8ca8f515e0/mzaf_9748684784918239097.plus.aac.p.m4a',
    genre: 'Türkçe Rock',
    source: 'stream',
    isOriginal: true,
    popularity: 98,
    addedAt: new Date().toISOString()
  },
  {
    id: 'pop_orig_5',
    title: 'Aman Aman',
    artist: 'Duman',
    album: 'Seni Kendime Sakladım',
    duration: 245,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/ec/3b/b7/ec3bb7c2-d352-7b27-2e1d-85472851eaee/8697407051189.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/cf/ae/76/cfae7655-e41c-3b00-349f-ecb60b73c4ee/mzaf_3990666014446419736.plus.aac.p.m4a',
    genre: 'Türkçe Rock',
    source: 'stream',
    isOriginal: true,
    popularity: 97,
    addedAt: new Date().toISOString()
  },
  {
    id: 'pop_orig_6',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    duration: 200,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/d5/3d/bf/d53dbfdf-188b-2ee0-77a8-a3f231e64906/20UMGIM10188.rgb.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/10/37/ba/1037ba36-056a-1e64-53c8-2e06a735165a/mzaf_10332219491689241088.plus.aac.p.m4a',
    genre: 'Synthwave / Pop',
    source: 'stream',
    isOriginal: true,
    popularity: 99,
    addedAt: new Date().toISOString()
  },
  {
    id: 'pop_orig_7',
    title: 'Neyim Var Ki',
    artist: 'Ceza ft. Sagopa Kajmer',
    album: 'Rapstar',
    duration: 215,
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/17/b4/8f/17b48f9a-0b93-6bb8-fe1d-3a16623c2cfb/mzaf_9560252727299052414.plus.aac.p.m4a',
    genre: 'Türkçe Rap',
    source: 'stream',
    isOriginal: true,
    popularity: 99,
    addedAt: new Date().toISOString()
  },
  {
    id: 'pop_orig_8',
    title: 'Sen Affetsen Ben Affetmem',
    artist: 'Bergen',
    album: 'Acıların Kadını',
    duration: 278,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/91/9a/c0/919ac0c3-f222-beec-c840-7e4070a75d50/8691531001422.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/0f/50/4e/0f504e90-c2ae-0d48-6d87-975971db4be7/mzaf_10523275069947990176.plus.aac.p.m4a',
    genre: 'Arabesk / Damar',
    source: 'stream',
    isOriginal: true,
    popularity: 98,
    addedAt: new Date().toISOString()
  }
];

const SPOTIFY_CHARTS = [
  { id: 'top50_tr', title: 'Spotify Türkiye Top 50', desc: 'Türkiye\'de şu an listelerin zirvesinde olan en çok dinlenen hitler.', badge: '🇹🇷 Top 50 TR', icon: Trophy, color: 'from-emerald-600 to-teal-950' },
  { id: 'top50_global', title: 'Spotify Global Top 50', desc: 'Tüm dünyada en çok dinlenen ve listeleri kasıp kavuran hitler.', badge: '🌍 Global Top 50', icon: Globe, color: 'from-blue-600 to-indigo-950' },
  { id: 'viral50_tr', title: 'Spotify Viral 50 Türkiye', desc: 'Sosyal medyada ve platformlarda en hızlı yükselen ve paylaşılan parçalar.', badge: '⚡ Viral 50 TR', icon: TrendingUp, color: 'from-amber-600 to-rose-950' },
  { id: 'discover_weekly', title: 'Spotify Haftalık Keşif', desc: 'Müzik zevkine ve ruh haline göre özel olarak derlenen haftalık öneriler.', badge: '✨ Haftalık Keşif', icon: Sparkle, color: 'from-purple-600 to-slate-950' },
  { id: 'release_radar', title: 'Spotify Release Radar', desc: 'En sevilen sanatçıların yeni çıkan taze single ve albüm parçaları.', badge: '🎯 Yeni Çıkanlar', icon: Compass, color: 'from-rose-600 to-neutral-950' }
];

const POPULAR_SEARCH_SUGGESTIONS = [
  { query: 'Mert Demir - Ateşe Düştüm', tag: 'Trend Hit' },
  { query: 'Mabel Matiz - Antidepresan', tag: 'Popüler' },
  { query: 'The Weeknd - Blinding Lights', tag: 'Global' },
  { query: 'Müslüm Gürses - Affet', tag: 'Damar Hit' },
  { query: 'Duman - Haberin Yok Ölüyorum', tag: 'Rock Klasik' },
  { query: 'Bergen - Sen Affetsen Ben Affetmem', tag: 'Kült Arabesk' },
  { query: 'Semicenk - Canın Sağ Olsun', tag: 'Türkçe Pop' },
  { query: 'Ezhel - Geceler', tag: 'Rap Hit' }
];

const RECENT_SEARCHES_STORAGE_KEY = 'soundpulse_recent_search_queries';
const RECENT_TRACKS_STORAGE_KEY = 'soundpulse_recent_search_tracks';

const clientSearchCache = new Map<string, Track[]>();
const clientChartCache = new Map<string, any>();

export const SearchView: React.FC<SearchViewProps> = memo(({
  playlists,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onAddTrackToPlaylist,
  onAddToQueue,
  onPlayNext,
  onDownloadTrackOffline,
  onOpenSpotifyImport,
  onStartSongRadio,
  onSaveChartToPlaylist
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('originals');
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineSearchResults, setOnlineSearchResults] = useState<Track[]>([]);
  const [selectedTrackForAdd, setSelectedTrackForAdd] = useState<Track | null>(null);
  const [followTick, setFollowTick] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToFollowChanges(() => {
      setFollowTick(prev => prev + 1);
    });
    return unsubscribe;
  }, []);

  // Search History State
  const [recentQueries, setRecentQueries] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : ['Mabel Matiz', 'Mert Demir', 'Müslüm Gürses', 'The Weeknd', 'Duman'];
    } catch {
      return ['Mabel Matiz', 'Mert Demir', 'Müslüm Gürses'];
    }
  });

  const [recentTracks, setRecentTracks] = useState<Track[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_TRACKS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Spotify Charts State
  const [activeChartId, setActiveChartId] = useState<string>('top50_tr');
  const [chartData, setChartData] = useState<{
    title: string;
    description: string;
    coverUrl: string;
    tracks: Track[];
  } | null>(null);
  const [isLoadingChart, setIsLoadingChart] = useState(false);

  // Save history helpers
  const saveRecentQuery = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || trimmed.length < 2) return;
    setRecentQueries(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 10);
      try {
        localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Storage save note:', e);
      }
      return updated;
    });
  };

  const removeRecentQuery = (q: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentQueries(prev => {
      const updated = prev.filter(item => item !== q);
      try {
        localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Storage note:', e);
      }
      return updated;
    });
  };

  const clearAllRecentQueries = () => {
    setRecentQueries([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
    } catch (e) {
      console.warn('Storage note:', e);
    }
  };

  const saveRecentTrack = (track: Track) => {
    setRecentTracks(prev => {
      const filtered = prev.filter(t => t.id !== track.id && t.title !== track.title);
      const updated = [track, ...filtered].slice(0, 12);
      try {
        localStorage.setItem(RECENT_TRACKS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Storage note:', e);
      }
      return updated;
    });
  };

  const removeRecentTrack = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentTracks(prev => {
      const updated = prev.filter(t => t.id !== trackId);
      try {
        localStorage.setItem(RECENT_TRACKS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Storage note:', e);
      }
      return updated;
    });
  };

  const clearAllRecentTracks = () => {
    setRecentTracks([]);
    try {
      localStorage.removeItem(RECENT_TRACKS_STORAGE_KEY);
    } catch (e) {
      console.warn('Storage note:', e);
    }
  };

  // Load Spotify Chart when charts tab is opened or active chart changes
  useEffect(() => {
    if (activeCategory === 'charts') {
      if (clientChartCache.has(activeChartId)) {
        setChartData(clientChartCache.get(activeChartId));
        return;
      }

      setIsLoadingChart(true);
      fetch(`/api/spotify/charts?chart=${activeChartId}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.tracks) {
            clientChartCache.set(activeChartId, data);
            setChartData(data);
          }
        })
        .catch(err => {
          console.warn('Spotify charts fetch note:', err);
        })
        .finally(() => {
          setIsLoadingChart(false);
        });
    }
  }, [activeCategory, activeChartId]);

  // Live online search with debouncing & smart caching
  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setOnlineSearchResults([]);
      setIsSearchingOnline(false);
      return;
    }

    const searchMode = activeCategory === 'lyrics' ? 'lyrics' : activeCategory === 'originals' ? 'originals' : 'all';
    const cacheKey = `${trimmed.toLowerCase()}___${searchMode}`;

    if (clientSearchCache.has(cacheKey)) {
      setOnlineSearchResults(clientSearchCache.get(cacheKey)!);
      setIsSearchingOnline(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingOnline(true);
      try {
        saveRecentQuery(trimmed);

        // Backend API search (LRCLIB + Gemini + iTunes + Audius)
        const apiRes = await fetch(`/api/audio/search?q=${encodeURIComponent(trimmed)}&type=${searchMode}`);
        if (apiRes.ok) {
          const data = await apiRes.json();
          if (data.results && Array.isArray(data.results)) {
            clientSearchCache.set(cacheKey, data.results);
            setOnlineSearchResults(data.results);
            setIsSearchingOnline(false);
            return;
          }
        }

        // Direct iTunes API search fallback
        const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(trimmed)}&entity=song&limit=20`;
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
            isOriginal: true,
            popularity: 85,
            addedAt: new Date().toISOString()
          }));
          clientSearchCache.set(cacheKey, mapped);
          setOnlineSearchResults(mapped);
        }
      } catch (err) {
        console.warn('Online search error:', err);
      } finally {
        setIsSearchingOnline(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchTerm, activeCategory]);

  // Curated Fallback Songs if search is blank
  const curatedHits = useMemo(() => {
    const allTracksMap = new Map<string, Track>();
    playlists.forEach(p => {
      (p.tracks || []).forEach(t => allTracksMap.set(`${t.title.toLowerCase()}_${t.artist.toLowerCase()}`, t));
    });
    return Array.from(allTracksMap.values());
  }, [playlists]);

  const displayTracks = useMemo(() => {
    if (activeCategory === 'followed') {
      const followed = getFollowedTracks();
      return followed.length > 0 ? followed : [];
    }
    if (activeCategory === 'charts' && chartData) {
      return chartData.tracks;
    }
    if (searchTerm.trim().length > 0) {
      return onlineSearchResults;
    }
    if (activeCategory === 'originals') {
      return DEFAULT_POPULAR_ORIGINALS;
    }
    return curatedHits.length > 0 ? curatedHits : DEFAULT_POPULAR_ORIGINALS;
  }, [activeCategory, chartData, searchTerm, onlineSearchResults, curatedHits, followTick]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleCategoryClick = (cat: typeof SEARCH_CATEGORIES[0]) => {
    setActiveCategory(cat.id);
    if (cat.query) {
      setSearchTerm(cat.query);
      saveRecentQuery(cat.query);
    } else if (cat.id === 'charts') {
      setSearchTerm('');
    }
  };

  const handleTrackSelection = (track: Track, contextTracks?: Track[], contextName?: string) => {
    saveRecentTrack(track);
    if (searchTerm.trim()) {
      saveRecentQuery(searchTerm.trim());
    }
    onPlayTrack(track, contextTracks, contextName);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 pb-56 sm:pb-44 text-neutral-100 select-none custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-7">
        {/* Search Header & Bar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2.5">
              <Search className="w-6 h-6 text-emerald-400" />
              <span>Müzik & Şarkı Sözü Arama</span>
            </h1>
            <button
              onClick={onOpenSpotifyImport}
              className="px-3.5 py-1.5 bg-[#1DB954]/15 hover:bg-[#1DB954]/25 text-[#1DB954] border border-[#1DB954]/30 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" /> Spotify'dan Çek (1000 Max)
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-5 h-5 text-emerald-400 absolute left-4.5 top-4" />
            <input
              type="text"
              placeholder='Şarkı sözü (örn: "gözlerinin içine baktım"), orijinal şarkıcı veya parça adı yazın...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-28 py-3.5 bg-neutral-900/90 border border-neutral-800 rounded-2xl text-sm md:text-base text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xl transition"
              autoFocus
            />
            <div className="absolute right-3.5 top-3 flex items-center gap-2">
              {isSearchingOnline && (
                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
              )}
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-2.5 py-1 text-xs text-neutral-400 hover:text-white bg-neutral-800 rounded-lg transition"
                >
                  Temizle
                </button>
              )}
            </div>
          </div>

          {/* Search Mode & Category Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {SEARCH_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/25 scale-102'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* SPOTIFY-STYLE RECENT SEARCHES & SUGGESTIONS (When search is empty and not charts) */}
        {!searchTerm.trim() && activeCategory !== 'charts' && (
          <div className="space-y-6">
            {/* Recent Searches (Son Aramalar - Spotify Style) */}
            {recentQueries.length > 0 && (
              <div className="space-y-3 p-4 bg-neutral-950/60 rounded-2xl border border-neutral-800/80">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-400" />
                    <span>Son Arama Geçmişiniz</span>
                  </h3>
                  <button
                    onClick={clearAllRecentQueries}
                    className="text-[11px] text-neutral-500 hover:text-rose-400 font-semibold transition cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Geçmişi Temizle
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {recentQueries.map((query, i) => (
                    <div
                      key={i}
                      onClick={() => setSearchTerm(query)}
                      className="group flex items-center gap-2 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white rounded-full text-xs font-semibold border border-neutral-800 hover:border-neutral-700 transition cursor-pointer"
                    >
                      <Clock className="w-3 h-3 text-neutral-500 group-hover:text-emerald-400 transition" />
                      <span>{query}</span>
                      <button
                        onClick={(e) => removeRecentQuery(query, e)}
                        className="p-0.5 text-neutral-500 hover:text-white rounded-full hover:bg-neutral-700 transition"
                        title="Aramayı Kaldır"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recently Clicked / Played Tracks in Search (Son Dinlenen / Tıklanan Parçalar) */}
            {recentTracks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>Son Dinlediğiniz Parçalar</span>
                  </h3>
                  <button
                    onClick={clearAllRecentTracks}
                    className="text-[11px] text-neutral-500 hover:text-neutral-300 font-semibold transition cursor-pointer"
                  >
                    Tümünü Temizle
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {recentTracks.slice(0, 6).map((trk) => (
                    <div
                      key={trk.id}
                      onClick={() => handleTrackSelection(trk, recentTracks, 'Son Aramalar')}
                      className="group relative p-2.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800/90 border border-neutral-800/60 hover:border-neutral-700 transition cursor-pointer"
                    >
                      <div className="relative aspect-square rounded-lg overflow-hidden mb-2 bg-neutral-950">
                        <img src={trk.coverUrl} alt={trk.title} className="w-full h-full object-cover" />
                        <button
                          onClick={(e) => removeRecentTrack(trk.id, e)}
                          className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition z-10"
                          title="Listeden Kaldır"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <Play className="w-6 h-6 text-white fill-white" />
                        </div>
                      </div>
                      <div className="text-xs font-bold text-white truncate">{trk.title}</div>
                      <div className="text-[10px] text-neutral-400 truncate">{trk.artist}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Search Suggestions (Popüler Arama Önerileri) */}
            <div className="space-y-3 p-4 bg-gradient-to-r from-emerald-950/20 via-neutral-900/60 to-neutral-950 rounded-2xl border border-emerald-500/20">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Popüler Arama Önerileri</span>
                </h3>
                <span className="text-[10px] text-emerald-400/80 font-bold">Trend Müzikler</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                {POPULAR_SEARCH_SUGGESTIONS.map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSearchTerm(sug.query);
                      saveRecentQuery(sug.query);
                    }}
                    className="flex items-center justify-between p-2.5 bg-neutral-900/80 hover:bg-neutral-800 rounded-xl border border-neutral-800 hover:border-emerald-500/40 text-left transition cursor-pointer group"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-neutral-200 group-hover:text-white truncate">
                        {sug.query}
                      </div>
                      <span className="text-[10px] text-emerald-400 font-semibold">{sug.tag}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-emerald-400 shrink-0 transition transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SPOTIFY CHARTS SECTION */}
        {activeCategory === 'charts' ? (
          <div className="space-y-6">
            {/* Chart Subtabs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {SPOTIFY_CHARTS.map((chart) => {
                const isSelected = activeChartId === chart.id;
                const IconComponent = chart.icon;
                return (
                  <button
                    key={chart.id}
                    onClick={() => setActiveChartId(chart.id)}
                    className={`p-3.5 rounded-2xl bg-gradient-to-br ${chart.color} border transition text-left relative overflow-hidden cursor-pointer ${
                      isSelected ? 'border-white ring-2 ring-emerald-500 shadow-xl scale-102' : 'border-neutral-800/80 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <IconComponent className="w-5 h-5 text-white mb-2" />
                    <span className="text-xs font-extrabold text-white block leading-tight">{chart.badge}</span>
                  </button>
                );
              })}
            </div>

            {/* Chart Header Banner */}
            {chartData && (
              <div className="p-6 rounded-2xl bg-gradient-to-r from-neutral-900 to-neutral-950 border border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#1DB954]/20 text-[#1DB954] text-[11px] font-extrabold">
                      SPOTIFY RESMİ LİSTESİ
                    </span>
                    <span className="text-xs text-neutral-400">Canlı & Güncel</span>
                  </div>
                  <h2 className="text-lg md:text-xl font-black text-white">{chartData.title}</h2>
                  <p className="text-xs text-neutral-400 max-w-xl">{chartData.description}</p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => {
                      if (chartData.tracks.length > 0) {
                        handleTrackSelection(chartData.tracks[0], chartData.tracks, chartData.title);
                      }
                    }}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-black" /> Tümünü Çal
                  </button>
                  {onSaveChartToPlaylist && (
                    <button
                      onClick={() => onSaveChartToPlaylist(chartData.title, chartData.tracks)}
                      className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 border border-neutral-700 cursor-pointer"
                    >
                      <ListPlus className="w-4 h-4 text-emerald-400" /> Listelerime Kaydet
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* RESULTS SECTION */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
              <Music className="w-4 h-4 text-emerald-400" />
              {activeCategory === 'charts' ? (
                <span>{chartData?.title || 'Spotify Trend Listesi'} ({displayTracks.length} Şarkı)</span>
              ) : activeCategory === 'lyrics' ? (
                <span>Şarkı Sözü Eşleşmeleri ({displayTracks.length} Sonuç)</span>
              ) : searchTerm.trim() ? (
                <span>Orijinal ve Popüler Şarkı Sonuçları ({displayTracks.length})</span>
              ) : (
                <span>Öne Çıkan & Listelerinizdeki Şarkılar ({displayTracks.length})</span>
              )}
            </h2>

            {searchTerm && (
              <span className="text-xs text-neutral-500 font-medium">
                Öncelik: Orijinal Sanatçı & Popülerlik
              </span>
            )}
          </div>

          {/* Empty / Loading States */}
          {isLoadingChart || (isSearchingOnline && displayTracks.length === 0) ? (
            <div className="p-16 text-center border border-neutral-800 rounded-2xl bg-neutral-950/40 space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
              <p className="text-xs text-neutral-400">Şarkılar, sözler ve orijinal sanatçılar aranıyor...</p>
            </div>
          ) : displayTracks.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-neutral-800 rounded-2xl bg-neutral-950/40 space-y-3">
              {activeCategory === 'followed' ? (
                <>
                  <Heart className="w-10 h-10 text-rose-500/60 mx-auto" />
                  <p className="text-sm text-neutral-300 font-semibold">Henüz takip ettiğiniz bir şarkı bulunmuyor</p>
                  <p className="text-xs text-neutral-500 max-w-md mx-auto">
                    Şarkı kartlarındaki ❤️ kalp butonuna veya oynatıcıdaki "Takip Et" butonuna tıklayarak sevdiğiniz şarkıları buraya ekleyebilirsiniz.
                  </p>
                  <button
                    onClick={() => setActiveCategory('originals')}
                    className="mt-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-full transition cursor-pointer"
                  >
                    Popüler Şarkıları Keşfet
                  </button>
                </>
              ) : (
                <>
                  <Disc className="w-10 h-10 text-neutral-600 mx-auto" />
                  <p className="text-sm text-neutral-300 font-semibold">Aradığınız kriterlere uygun şarkı bulunamadı</p>
                  <p className="text-xs text-neutral-500 max-w-md mx-auto">
                    Şarkı sözünden birkaç kelime veya sanatçı adını yazmayı deneyebilirsiniz.
                  </p>
                  <button
                    onClick={onOpenSpotifyImport}
                    className="mt-2 px-5 py-2.5 bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-bold rounded-full transition cursor-pointer"
                  >
                    Spotify Linkinden Direkt İçe Aktar (1000 Max)
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {displayTracks.map((track, idx) => {
                const isCurrent = currentTrack?.id === track.id || currentTrack?.title === track.title;
                const isCurrentPlaying = isCurrent && isPlaying;
                const contextName = activeCategory === 'charts' 
                  ? (chartData?.title || 'Spotify Trendleri') 
                  : searchTerm.trim() 
                  ? `"${searchTerm}" Arama Sonuçları` 
                  : 'Keşfet & Öne Çıkanlar';

                return (
                  <div
                    key={`${track.id}_${idx}`}
                    className={`group flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl border transition gap-3 ${
                      isCurrent
                        ? 'bg-emerald-500/15 border-emerald-500/50 shadow-md'
                        : 'bg-neutral-950/70 hover:bg-neutral-900 border-neutral-900 hover:border-neutral-800'
                    }`}
                  >
                    {/* Left: Rank / Play Button + Artwork + Title + Lyric Snippet */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Chart Rank if in charts */}
                      {track.chartRank ? (
                        <span className="w-6 text-center text-sm font-black text-emerald-400 shrink-0 font-mono">
                          #{track.chartRank}
                        </span>
                      ) : (
                        <span className="w-5 text-center text-xs font-mono text-neutral-600 group-hover:text-neutral-400 shrink-0">
                          {idx + 1}
                        </span>
                      )}

                      {/* Cover Thumbnail with Play overlay */}
                      <button
                        onClick={() => handleTrackSelection(track, displayTracks, contextName)}
                        className="w-12 h-12 rounded-xl overflow-hidden relative shrink-0 group/play shadow-md cursor-pointer"
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

                      {/* Song Details & Badges */}
                      <div
                        onClick={() => handleTrackSelection(track, displayTracks, contextName)}
                        className="min-w-0 flex-1 cursor-pointer space-y-1"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-bold truncate ${isCurrent ? 'text-emerald-400' : 'text-white'}`}>
                            {track.title}
                          </span>

                          {/* Verified Original Artist Badge */}
                          {track.isOriginal && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-extrabold flex items-center gap-1">
                              <Award className="w-3 h-3" /> Orijinal
                            </span>
                          )}

                          {/* High Popularity Flame Badge */}
                          {track.popularity && track.popularity >= 88 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[10px] font-bold flex items-center gap-0.5">
                              <Flame className="w-3 h-3 text-rose-400" /> Popüler
                            </span>
                          )}
                        </div>

                        {/* Artist & Genre */}
                        <div className="text-xs text-neutral-400 truncate flex items-center gap-1.5">
                          <span className="font-semibold text-neutral-300">{track.artist}</span>
                          <span className="text-neutral-600">•</span>
                          <span className="text-neutral-500">{track.album || track.genre || 'Müzik'}</span>
                        </div>

                        {/* Matched Lyric Snippet Badge (Spotify-style) */}
                        {track.matchedLyric && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 text-[11px] font-medium mt-1">
                            <span className="font-bold text-amber-400">📝 Söz Eşleşmesi:</span>
                            <span className="italic">{track.matchedLyric}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Quick Action Controls */}
                    <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-900">
                      <span className="text-xs font-mono text-neutral-500 mr-2 hidden md:inline">
                        {formatDuration(track.duration)}
                      </span>

                      {/* Follow Song Button (Heart) */}
                      {(() => {
                        const isFollowed = isTrackFollowed(track.id) || isTrackFollowed(track.title);
                        return (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFollowTrack(track);
                            }}
                            className={`p-2 rounded-xl border transition cursor-pointer ${
                              isFollowed
                                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                                : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-400 hover:text-rose-400'
                            }`}
                            title={isFollowed ? 'Şarkıyı Takipten Çıkar' : 'Şarkıyı Takip Et (Favorilere Ekle)'}
                          >
                            <Heart className={`w-4 h-4 ${isFollowed ? 'fill-rose-500 text-rose-500' : ''}`} />
                          </button>
                        );
                      })()}

                      {/* Song Radio */}
                      {onStartSongRadio && (
                        <button
                          onClick={() => onStartSongRadio(track)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-neutral-900 hover:bg-amber-500/20 text-neutral-300 hover:text-amber-400 rounded-xl text-xs font-bold border border-neutral-800 transition cursor-pointer"
                          title="Bu şarkının tarzında otomatik radyo başlat"
                        >
                          <Radio className="w-3.5 h-3.5" /> <span className="hidden lg:inline">Radyo</span>
                        </button>
                      )}

                      {/* Play Next (Sıradaki Yap) */}
                      {onPlayNext && (
                        <button
                          onClick={() => onPlayNext(track)}
                          className="px-2.5 py-1.5 bg-neutral-900 hover:bg-emerald-500/20 text-neutral-300 hover:text-emerald-300 rounded-xl text-xs font-semibold border border-neutral-800 transition cursor-pointer"
                          title="Hemen bir sonraki şarkı olarak çal"
                        >
                          Sıradaki
                        </button>
                      )}

                      {/* Add to Queue (Sıraya Ekle) */}
                      {onAddToQueue && (
                        <button
                          onClick={() => onAddToQueue(track)}
                          className="p-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-xl border border-neutral-800 transition cursor-pointer"
                          title="Çalma sırasının sonuna ekle"
                        >
                          <ListPlus className="w-4 h-4" />
                        </button>
                      )}

                      {/* Download offline */}
                      <button
                        onClick={() => onDownloadTrackOffline(track)}
                        className={`p-2 rounded-xl border transition cursor-pointer ${
                          track.isOfflineCached
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                            : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                        title={track.isOfflineCached ? 'Cihaza İndirildi (Çevrimdışı)' : 'Çevrimdışı İndir'}
                      >
                        {track.isOfflineCached ? <Check className="w-4 h-4" /> : <HardDrive className="w-4 h-4" />}
                      </button>

                      {/* Add to Playlist */}
                      <button
                        onClick={() => setSelectedTrackForAdd(track)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-neutral-900 hover:bg-emerald-500/25 text-neutral-200 hover:text-emerald-300 rounded-xl text-xs font-bold border border-neutral-800 transition cursor-pointer"
                        title="Listelerime Ekle"
                      >
                        <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Listeme Ekle</span>
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
