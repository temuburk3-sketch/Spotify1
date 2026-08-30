import React, { useState, useEffect, useMemo, memo } from 'react';
import { 
  Search, Play, Plus, HardDrive, Check, Music, Disc, Sparkles, Loader2, 
  Radio, Flame, Trophy, ListPlus, Sparkle, Globe, ArrowRight,
  TrendingUp, Compass, Headphones, Award, History, X, Trash2, Clock, Zap, Heart,
  Users, FolderHeart, ListMusic, Mic2, Library
} from 'lucide-react';
import { Track, Playlist, ArtistResult, PlaylistSearchResult } from '../../types';
import { isTrackFollowed, toggleFollowTrack, subscribeToFollowChanges, getFollowedTracks, getFollowedArtists, isArtistFollowed, toggleFollowArtist } from '../../services/followService';
import { ArtistDetailModal } from './ArtistDetailModal';
import { PlaylistDetailModal } from './PlaylistDetailModal';
import { 
  searchUniversalTracks, 
  searchUniversalArtists, 
  searchUniversalPlaylists,
  MASTER_ARTISTS_CATALOG 
} from '../../services/universalSearchService';

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

export type SearchCategory = 
  | 'all' 
  | 'artists' 
  | 'playlists' 
  | 'tracks' 
  | 'lyrics' 
  | 'charts' 
  | 'followed' 
  | 'originals' 
  | 'arabesk' 
  | 'pop' 
  | 'rock' 
  | 'rap' 
  | 'synthwave' 
  | 'lofi';

const SEARCH_CATEGORIES: { id: SearchCategory; label: string; icon: string; query?: string }[] = [
  { id: 'all', label: '✨ Tümü (Şarkılar Öncelikli)', icon: '✨' },
  { id: 'tracks', label: '🎵 Şarkılar', icon: '🎵' },
  { id: 'artists', label: '🎤 Şarkıcılar & Sanatçılar', icon: '🎤' },
  { id: 'playlists', label: '📋 Çalma Listeleri', icon: '📋' },
  { id: 'lyrics', label: '📝 Şarkı Sözü Arama', icon: '📝' },
  { id: 'charts', label: '🔥 Spotify Trendleri & Top 50', icon: '🔥' },
  { id: 'followed', label: '❤️ Takip Ettiklerim', icon: '❤️' },
  { id: 'pop', label: '🇹🇷 Türkçe Pop', icon: '🇹🇷', query: 'Türkçe Pop Mert Demir Mabel Matiz' },
  { id: 'arabesk', label: '🥀 Arabesk & Damar', icon: '🥀', query: 'Müslüm Gürses Ferdi Tayfur Arabesk' },
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

const POPULAR_ARTISTS_SUGGESTIONS = [
  { name: 'Mert Demir', role: 'Pop & Akustik', picture: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/43/39/bb/4339bbf7-d2c3-22ed-90e7-9a14416780c8/196922638558_Cover.jpg/600x600bb.jpg' },
  { name: 'Mabel Matiz', role: 'Popüler & Synth', picture: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/36/53/4e/36534e56-2dbb-5e6f-5777-61c0e3933c07/cover.jpg/600x600bb.jpg' },
  { name: 'Müslüm Gürses', role: 'Arabesk Efsanesi', picture: 'https://is1-ssl.mzstatic.com/image/thumb/Music118/v4/bc/f5/a3/bcf5a3c2-dcfb-5542-a4f6-8c4d52f6bfa7/8691531003426.jpg/600x600bb.jpg' },
  { name: 'Duman', role: 'Türkçe Rock', picture: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/ec/3b/b7/ec3bb7c2-d352-7b27-2e1d-85472851eaee/8697407051189.jpg/600x600bb.jpg' },
  { name: 'Mor ve Ötesi', role: 'Rock & Alternatif', picture: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/10/d8/ec/10d8ecf6-02e0-2df5-f674-c361952e42ef/869740705304.jpg/600x600bb.jpg' },
  { name: 'The Weeknd', role: 'R&B & Synthwave', picture: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/d5/3d/bf/d53dbfdf-188b-2ee0-77a8-a3f231e64906/20UMGIM10188.rgb.jpg/600x600bb.jpg' },
  { name: 'Bergen', role: 'Damar & Arabesk', picture: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/91/9a/c0/919ac0c3-f222-beec-c840-7e4070a75d50/8691531001422.jpg/600x600bb.jpg' },
  { name: 'Ceza', role: 'Türkçe Rapstar', picture: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600' }
];

const POPULAR_PLAYLIST_SUGGESTIONS = [
  { name: 'Türkçe Pop 2024 & Hit Parçalar', tag: 'Popüler Pop', cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/43/39/bb/4339bbf7-d2c3-22ed-90e7-9a14416780c8/196922638558_Cover.jpg/600x600bb.jpg' },
  { name: 'Arabesk Efsaneleri & Damar Şarkılar', tag: 'Damar FM', cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music118/v4/bc/f5/a3/bcf5a3c2-dcfb-5542-a4f6-8c4d52f6bfa7/8691531003426.jpg/600x600bb.jpg' },
  { name: 'Türkçe Rock & Anadolu Klasikleri', tag: 'Rock Kulübü', cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/ec/3b/b7/ec3bb7c2-d352-7b27-2e1d-85472851eaee/8697407051189.jpg/600x600bb.jpg' },
  { name: 'Türkçe Rap & Hip-Hop Zirvesi', tag: 'Rapstar', cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600' }
];

const RECENT_SEARCHES_STORAGE_KEY = 'soundpulse_recent_search_queries';
const clientSearchCache = new Map<string, Track[]>();
const clientArtistCache = new Map<string, ArtistResult[]>();
const clientPlaylistCache = new Map<string, PlaylistSearchResult[]>();
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
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineSearchResults, setOnlineSearchResults] = useState<Track[]>([]);
  const [artistSearchResults, setArtistSearchResults] = useState<ArtistResult[]>([]);
  const [playlistSearchResults, setPlaylistSearchResults] = useState<PlaylistSearchResult[]>([]);
  
  // Modals for deep exploration
  const [activeArtistDetail, setActiveArtistDetail] = useState<ArtistResult | null>(null);
  const [activePlaylistDetail, setActivePlaylistDetail] = useState<PlaylistSearchResult | null>(null);
  const [selectedTrackForAdd, setSelectedTrackForAdd] = useState<Track | null>(null);
  const [followTick, setFollowTick] = useState(0);

  // Pagination & Load More States (Infinite Scrolling Downwards)
  const [visibleArtistCount, setVisibleArtistCount] = useState(24);
  const [visiblePlaylistCount, setVisiblePlaylistCount] = useState(20);
  const [visibleTrackCount, setVisibleTrackCount] = useState(25);
  const [artistGenreFilter, setArtistGenreFilter] = useState<string>('all');
  const [playlistSourceFilter, setPlaylistSourceFilter] = useState<string>('all');

  // Spotify Charts State
  const [activeChartId, setActiveChartId] = useState<string>('top50_tr');
  const [chartData, setChartData] = useState<{ title: string; description: string; tracks: Track[] } | null>(null);
  const [isLoadingChart, setIsLoadingChart] = useState(false);

  // Search History
  const [recentQueries, setRecentQueries] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [
        'Mert Demir',
        'Müslüm Gürses',
        'Duman',
        'Türkçe Pop 2024',
        'The Weeknd'
      ];
    } catch {
      return ['Mert Demir', 'Müslüm Gürses', 'Duman'];
    }
  });

  useEffect(() => {
    const unsub = subscribeToFollowChanges(() => {
      setFollowTick(t => t + 1);
    });
    return () => unsub();
  }, []);

  const saveRecentQuery = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;
    setRecentQueries(prev => {
      const filtered = prev.filter(q => q.toLowerCase() !== trimmed.toLowerCase());
      const next = [trimmed, ...filtered].slice(0, 10);
      try {
        localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const removeRecentQuery = (query: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentQueries(prev => {
      const next = prev.filter(q => q !== query);
      try {
        localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const clearAllRecentQueries = () => {
    setRecentQueries([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
    } catch {}
  };

  // Spotify Charts Fetcher
  useEffect(() => {
    if (activeCategory !== 'charts') return;

    const cacheKey = `chart_${activeChartId}`;
    if (clientChartCache.has(cacheKey)) {
      setChartData(clientChartCache.get(cacheKey));
      return;
    }

    setIsLoadingChart(true);
    fetch(`/api/spotify/charts?chart=${activeChartId}`)
      .then(res => res.ok ? res.json() : null)
      .then(async data => {
        if (data && data.tracks && data.tracks.length > 0) {
          setChartData(data);
          clientChartCache.set(cacheKey, data);
        } else {
          // Direct fallback for Vercel/Static hosting
          const query = activeChartId === 'top50_global' ? 'Top Hits 2024' : 'Türkçe Pop 2024';
          const fallbackTracks = await searchUniversalTracks(query);
          const chartPayload = {
            title: activeChartId === 'top50_global' ? 'Spotify Global Top 50' : 'Spotify Türkiye Top 50',
            description: 'En çok dinlenen listelerin zirvesindeki hit parçalar.',
            tracks: fallbackTracks.slice(0, 50).map((t, idx) => ({ ...t, chartRank: idx + 1, popularity: 100 - idx }))
          };
          setChartData(chartPayload);
          clientChartCache.set(cacheKey, chartPayload);
        }
      })
      .catch(async () => {
        const fallbackTracks = await searchUniversalTracks('Türkçe Pop');
        setChartData({
          title: 'Spotify Türkiye Top 50',
          description: 'En çok dinlenen listelerin zirvesindeki hit parçalar.',
          tracks: fallbackTracks
        });
      })
      .finally(() => {
        setIsLoadingChart(false);
      });
  }, [activeCategory, activeChartId]);

  // Robust Search Engine (Tracks + Artists + Playlists)
  useEffect(() => {
    if (activeCategory === 'charts' || activeCategory === 'followed') {
      return;
    }

    const currentCatObj = SEARCH_CATEGORIES.find(c => c.id === activeCategory);
    const query = searchTerm.trim() || currentCatObj?.query || '';

    if (!query) {
      setOnlineSearchResults(DEFAULT_POPULAR_ORIGINALS);
      // Pre-seed popular artists and playlists
      setArtistSearchResults(POPULAR_ARTISTS_SUGGESTIONS.map((a, i) => ({
        id: `pop_art_${i}`,
        name: a.name,
        picture: a.picture,
        fans: a.role,
        genres: [a.role],
        popularity: 98 - i
      })));
      setPlaylistSearchResults(POPULAR_PLAYLIST_SUGGESTIONS.map((p, i) => ({
        id: `pop_pl_${i}`,
        name: p.name,
        description: p.tag,
        coverUrl: p.cover,
        trackCount: 30 + i * 5,
        author: 'SoundPulse'
      })));
      setIsSearchingOnline(false);
      return;
    }

    let isMounted = true;
    setIsSearchingOnline(true);

    const timer = setTimeout(async () => {
      const searchType = activeCategory === 'lyrics' ? 'lyrics' : activeCategory === 'artists' ? 'artist' : 'all';
      const cacheKey = `${query.toLowerCase()}_${searchType}`;

      // 1. Check client caches
      const cachedTracks = clientSearchCache.get(cacheKey);
      const cachedArtists = clientArtistCache.get(cacheKey);
      const cachedPlaylists = clientPlaylistCache.get(cacheKey);

      if (cachedTracks && cachedArtists && cachedPlaylists) {
        setOnlineSearchResults(cachedTracks);
        setArtistSearchResults(cachedArtists);
        setPlaylistSearchResults(cachedPlaylists);
        setIsSearchingOnline(false);
        return;
      }

      try {
        // Parallel queries through universal search service with zero-failure fallback
        const [rawTracks, rawArtists, rawPlaylists] = await Promise.all([
          searchUniversalTracks(query, searchType),
          searchUniversalArtists(query),
          searchUniversalPlaylists(query, playlists)
        ]);

        if (isMounted) {
          setOnlineSearchResults(rawTracks);
          setArtistSearchResults(rawArtists);
          setPlaylistSearchResults(rawPlaylists);

          // Update client cache
          clientSearchCache.set(cacheKey, rawTracks);
          clientArtistCache.set(cacheKey, rawArtists);
          clientPlaylistCache.set(cacheKey, rawPlaylists);
        }
      } catch (err) {
        console.warn('Search query error:', err);
      } finally {
        if (isMounted) {
          setIsSearchingOnline(false);
        }
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchTerm, activeCategory, playlists]);

  // Derived tracks based on category
  const displayTracks = useMemo(() => {
    if (activeCategory === 'charts') {
      return chartData?.tracks || [];
    }

    if (activeCategory === 'followed') {
      return getFollowedTracks();
    }

    return onlineSearchResults;
  }, [activeCategory, chartData, onlineSearchResults, followTick]);

  const handleTrackSelection = (track: Track, contextList: Track[], contextName: string) => {
    onPlayTrack(track, contextList, contextName);
    if (searchTerm.trim()) {
      saveRecentQuery(searchTerm);
    }
  };

  const handleOpenArtist = (artist: ArtistResult) => {
    setActiveArtistDetail(artist);
    saveRecentQuery(artist.name);
  };

  const handleOpenPlaylist = (playlist: PlaylistSearchResult) => {
    setActivePlaylistDetail(playlist);
    saveRecentQuery(playlist.name);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 overflow-y-auto min-h-0 w-full p-4 sm:p-6 pb-64 sm:pb-52 space-y-6 animate-fade-in select-none custom-scrollbar">
      
      {/* Top Search Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-neutral-950 border border-neutral-800 shadow-2xl relative overflow-hidden">
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" /> Akıllı Müzik Arama Motoru
            </span>
            <span className="text-xs text-neutral-400 font-medium">Orijinal Sanatçı • Çalma Listesi • Sözler</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Müzik, Sanatçı ve Çalma Listesi Keşfi</span>
          </h1>
          <p className="text-xs text-neutral-400 max-w-xl">
            Şarkı adı, sanatçı ismi, çalma listesi veya aklınızdaki bir şarkı sözünü yazarak anında arayın ve dinleyin.
          </p>
        </div>

        {/* Action Button: Spotify Link Import */}
        <div className="flex items-center gap-2.5 z-10 shrink-0">
          <button
            onClick={onOpenSpotifyImport}
            className="px-4 py-2.5 bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-black rounded-2xl transition flex items-center gap-2 shadow-lg shadow-[#1DB954]/20 cursor-pointer"
          >
            <Disc className="w-4 h-4" /> Spotify İçe Aktar
          </button>
        </div>

        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* SEARCH INPUT BAR */}
      <div className="space-y-3">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            {isSearchingOnline ? (
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-neutral-400 group-focus-within:text-emerald-400 transition" />
            )}
          </div>

          <input
            id="search-main-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchTerm.trim()) {
                saveRecentQuery(searchTerm);
              }
            }}
            placeholder="Şarkı adı, Sanatçı (Mert Demir, Sezen Aksu), Çalma listesi veya söz arayın..."
            className="w-full pl-12 pr-12 py-3.5 bg-neutral-900/90 hover:bg-neutral-900 focus:bg-neutral-900 border border-neutral-800 focus:border-emerald-500 rounded-2xl text-sm font-semibold text-white placeholder-neutral-500 transition shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />

          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-400 hover:text-white cursor-pointer"
              title="Aramayı Temizle"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* PRIMARY CATEGORY TABS (Sanatçılar, Çalma Listeleri, Şarkılar, vs.) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {SEARCH_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  if (cat.query && !searchTerm) {
                    setSearchTerm('');
                  }
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/25 scale-102'
                    : 'bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* QUICK DISCOVERY SECTIONS WHEN EMPTY QUERY */}
      {!searchTerm.trim() && activeCategory !== 'charts' && activeCategory !== 'followed' && (
        <div className="space-y-6">
          {/* Quick Artists Suggestions (Şarkıcı Önerileri) */}
          <div className="space-y-3 p-4 bg-neutral-950/60 rounded-3xl border border-neutral-900">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                <Mic2 className="w-4 h-4 text-emerald-400" />
                <span>Popüler Şarkıcılar & Sanatçılar</span>
              </h3>
              <span className="text-[11px] text-emerald-400 font-bold">1-Tıkla Diskografi</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
              {POPULAR_ARTISTS_SUGGESTIONS.map((art, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    handleOpenArtist({
                      id: `art_sug_${idx}`,
                      name: art.name,
                      picture: art.picture,
                      fans: art.role,
                      genres: [art.role],
                      popularity: 98
                    });
                  }}
                  className="flex flex-col items-center text-center p-3 rounded-2xl bg-neutral-900/60 hover:bg-neutral-800/80 border border-neutral-800/60 hover:border-emerald-500/40 transition group cursor-pointer"
                >
                  <div className="relative mb-2">
                    <img
                      src={art.picture}
                      alt={art.name}
                      className="w-16 h-16 rounded-full object-cover shadow-lg border border-neutral-700 group-hover:scale-105 transition"
                    />
                    <div className="absolute inset-0 rounded-full bg-black/20 group-hover:bg-transparent transition" />
                  </div>
                  <span className="text-xs font-bold text-neutral-200 group-hover:text-emerald-300 truncate w-full">
                    {art.name}
                  </span>
                  <span className="text-[10px] text-neutral-500 truncate w-full mt-0.5">
                    {art.role}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Playlists Suggestions (Çalma Listesi Önerileri) */}
          <div className="space-y-3 p-4 bg-neutral-950/60 rounded-3xl border border-neutral-900">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-emerald-400" />
                <span>Öne Çıkan Çalma Listeleri</span>
              </h3>
              <span className="text-[11px] text-neutral-400">Tümünü Çal veya Kütüphanene Kaydet</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {POPULAR_PLAYLIST_SUGGESTIONS.map((pl, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    handleOpenPlaylist({
                      id: `cur_pl_sug_${idx}`,
                      name: pl.name,
                      description: pl.tag,
                      coverUrl: pl.cover,
                      trackCount: 35,
                      author: pl.tag
                    });
                  }}
                  className="flex items-center gap-3 p-2.5 rounded-2xl bg-neutral-900/60 hover:bg-neutral-800/80 border border-neutral-800/60 hover:border-emerald-500/40 text-left transition group cursor-pointer"
                >
                  <img
                    src={pl.cover}
                    alt={pl.name}
                    className="w-14 h-14 rounded-xl object-cover shadow-md shrink-0 border border-neutral-700"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-neutral-200 group-hover:text-emerald-300 truncate">
                      {pl.name}
                    </div>
                    <span className="text-[10px] text-emerald-400 font-semibold mt-0.5 block">{pl.tag}</span>
                  </div>
                  <Play className="w-4 h-4 text-neutral-500 group-hover:text-emerald-400 shrink-0 group-hover:scale-110 transition mr-1" />
                </button>
              ))}
            </div>
          </div>

          {/* Recent Searches (Geçmiş Aramalar) */}
          {recentQueries.length > 0 && (
            <div className="space-y-2.5 p-4 bg-neutral-950/40 rounded-2xl border border-neutral-900">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Son Aramalarınız</span>
                </h3>
                <button
                  onClick={clearAllRecentQueries}
                  className="text-[11px] text-neutral-500 hover:text-rose-400 font-medium transition cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Geçmişi Temizle
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {recentQueries.map((query, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setSearchTerm(query);
                      saveRecentQuery(query);
                    }}
                    className="group flex items-center gap-2 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-emerald-500/40 rounded-full text-xs text-neutral-300 hover:text-white transition cursor-pointer"
                  >
                    <Clock className="w-3 h-3 text-neutral-500 group-hover:text-emerald-400 shrink-0" />
                    <span>{query}</span>
                    <button
                      onClick={(e) => removeRecentQuery(query, e)}
                      className="text-neutral-500 hover:text-rose-400 p-0.5 rounded-full"
                      title="Kaldır"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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

      {/* TRACKS / SONGS RESULTS SECTION (Shown in 'all', 'tracks', 'lyrics', 'charts', 'followed', genres) */}
      {activeCategory !== 'artists' && activeCategory !== 'playlists' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
              <Music className="w-4 h-4 text-emerald-400" />
              {activeCategory === 'charts' ? (
                <span>{chartData?.title || 'Spotify Trend Listesi'} ({displayTracks.length} Şarkı)</span>
              ) : activeCategory === 'lyrics' ? (
                <span>Şarkı Sözü Eşleşmeleri ({displayTracks.length} Sonuç)</span>
              ) : searchTerm.trim() ? (
                <span>Orijinal Şarkı Sonuçları ({displayTracks.length})</span>
              ) : (
                <span>Öne Çıkan & Popüler Şarkılar ({displayTracks.length})</span>
              )}
            </h2>

            {searchTerm && (
              <span className="text-xs text-neutral-500 font-medium">
                Öncelik: Doğrulanmış Sanatçı & Yüksek Popülerlik
              </span>
            )}
          </div>

          {/* Empty / Loading States */}
          {isLoadingChart || (isSearchingOnline && displayTracks.length === 0) ? (
            <div className="p-16 text-center border border-neutral-800 rounded-3xl bg-neutral-950/40 space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
              <p className="text-xs text-neutral-400 font-medium">Şarkılar, sanatçılar ve stüdyo kayıtları taranıyor...</p>
            </div>
          ) : displayTracks.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-neutral-800 rounded-3xl bg-neutral-950/40 space-y-3">
              {activeCategory === 'followed' ? (
                <>
                  <Heart className="w-10 h-10 text-rose-500/60 mx-auto" />
                  <p className="text-sm text-neutral-300 font-semibold">Henüz takip ettiğiniz bir şarkı bulunmuyor</p>
                  <p className="text-xs text-neutral-500 max-w-md mx-auto">
                    Şarkı kartlarındaki ❤️ kalp butonuna tıklayarak sevdiğiniz parçaları buraya ekleyebilirsiniz.
                  </p>
                  <button
                    onClick={() => setActiveCategory('all')}
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
            <div className="space-y-3">
              <div className="space-y-2">
                {displayTracks.slice(0, visibleTrackCount).map((track, idx) => {
                  const isCurrent = currentTrack?.id === track.id || currentTrack?.title === track.title;
                  const isCurrentPlaying = isCurrent && isPlaying;
                  const contextName = activeCategory === 'charts' 
                    ? (chartData?.title || 'Spotify Trendleri') 
                    : searchTerm.trim() 
                    ? `"${searchTerm}" Arama Sonuçları` 
                    : 'Keşfet & Öne Çıkanlar';
                  const isTrackFav = isTrackFollowed(track.id) || isTrackFollowed(track.title);

                  return (
                    <div
                      key={`${track.id}_${idx}`}
                      className={`group flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl border transition gap-3 ${
                        isCurrent
                          ? 'bg-emerald-500/15 border-emerald-500/50 shadow-md'
                          : 'bg-neutral-950/70 hover:bg-neutral-900 border-neutral-900 hover:border-neutral-800'
                      }`}
                    >
                      {/* Left: Rank / Artwork + Title + Lyric Snippet */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        {track.chartRank ? (
                          <span className="w-6 text-center text-sm font-black text-emerald-400 shrink-0 font-mono">
                            #{track.chartRank}
                          </span>
                        ) : (
                          <span className="w-5 text-center text-xs font-mono text-neutral-600 group-hover:text-neutral-400 shrink-0 font-bold">
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

                            {track.isOriginal && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-extrabold flex items-center gap-1">
                                <Award className="w-3 h-3" /> Orijinal
                              </span>
                            )}

                            {track.popularity && track.popularity >= 88 && (
                              <span className="px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[10px] font-bold flex items-center gap-0.5">
                                <Flame className="w-3 h-3 text-rose-400" /> Popüler
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-neutral-400 truncate flex items-center gap-1.5">
                            <span className="font-semibold text-neutral-300 hover:underline hover:text-emerald-300" onClick={(e) => {
                              e.stopPropagation();
                              handleOpenArtist({
                                id: `art_inline_${Date.now()}`,
                                name: track.artist,
                                picture: track.coverUrl,
                                fans: 'Sanatçı',
                                genres: [track.genre || 'Müzik'],
                                popularity: 95
                              });
                            }}>
                              {track.artist}
                            </span>
                            <span className="text-neutral-600">•</span>
                            <span className="text-neutral-500">{track.album || track.genre || 'Müzik'}</span>
                          </div>

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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFollowTrack(track);
                          }}
                          className={`p-2 rounded-xl border transition cursor-pointer ${
                            isTrackFav
                              ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                              : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-400 hover:text-rose-400'
                          }`}
                          title={isTrackFav ? 'Şarkıyı Takipten Çıkar' : 'Şarkıyı Takip Et (Favorilere Ekle)'}
                        >
                          <Heart className={`w-4 h-4 ${isTrackFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                        </button>

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

                        {/* Play Next */}
                        {onPlayNext && (
                          <button
                            onClick={() => onPlayNext(track)}
                            className="px-2.5 py-1.5 bg-neutral-900 hover:bg-emerald-500/20 text-neutral-300 hover:text-emerald-300 rounded-xl text-xs font-semibold border border-neutral-800 transition cursor-pointer"
                            title="Hemen bir sonraki şarkı olarak çal"
                          >
                            Sıradaki
                          </button>
                        )}

                        {/* Add to Queue */}
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

              {displayTracks.length > visibleTrackCount && (
                <div className="pt-3 text-center">
                  <button
                    onClick={() => setVisibleTrackCount((prev) => prev + 25)}
                    className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white hover:text-emerald-400 text-xs font-bold rounded-2xl border border-neutral-700 hover:border-emerald-500/50 transition cursor-pointer shadow-lg inline-flex items-center gap-2"
                  >
                    <span>Daha Fazla Şarkı Yükle ({displayTracks.length - visibleTrackCount} Şarkı Kaldı)</span>
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* DEDICATED ARTISTS VIEW (When activeCategory === 'artists' or in 'all' view when artists exist) */}
      {(activeCategory === 'artists' || (activeCategory === 'all' && artistSearchResults.length > 0 && searchTerm.trim())) && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>
                {searchTerm.trim() ? `Eşleşen Şarkıcılar (${artistSearchResults.length})` : `Tüm Popüler Sanatçılar & Şarkıcılar (${artistSearchResults.length})`}
              </span>
            </h2>
            <span className="text-[11px] text-neutral-500">1-Tıkla Diskografi ve Şarkıları Dinleyin</span>
          </div>

          {/* Artist Genre Filter Bar */}
          {activeCategory === 'artists' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              {[
                { id: 'all', label: 'Tümü' },
                { id: 'pop', label: '🇹🇷 Pop' },
                { id: 'arabesk', label: '🥀 Arabesk & Damar' },
                { id: 'rock', label: '🎸 Rock & Anadolu' },
                { id: 'rap', label: '🎤 Rap & Trap' },
                { id: 'indie', label: '✨ Alternatif' },
                { id: 'synthwave', label: '🌃 Synthwave' },
                { id: 'global', label: '🌍 Yabancı' }
              ].map((gf) => (
                <button
                  key={gf.id}
                  onClick={() => {
                    setArtistGenreFilter(gf.id);
                    setVisibleArtistCount(24);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    artistGenreFilter === gf.id
                      ? 'bg-emerald-500 text-black shadow-md'
                      : 'bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 border border-neutral-800'
                  }`}
                >
                  {gf.label}
                </button>
              ))}
            </div>
          )}

          {(() => {
            const filtered = artistSearchResults.filter((art) => {
              if (artistGenreFilter === 'all') return true;
              const gStr = (art.genres || []).join(' ').toLowerCase() + ' ' + (art.fans || '').toLowerCase();
              if (artistGenreFilter === 'pop') return gStr.includes('pop') && !gStr.includes('alt-pop');
              if (artistGenreFilter === 'arabesk') return gStr.includes('arabesk') || gStr.includes('damar') || gStr.includes('fantezi');
              if (artistGenreFilter === 'rock') return gStr.includes('rock') || gStr.includes('metal') || gStr.includes('anadolu');
              if (artistGenreFilter === 'rap') return gStr.includes('rap') || gStr.includes('hip-hop') || gStr.includes('trap') || gStr.includes('drill');
              if (artistGenreFilter === 'indie') return gStr.includes('indie') || gStr.includes('alternatif');
              if (artistGenreFilter === 'synthwave') return gStr.includes('synth') || gStr.includes('elektronik') || gStr.includes('retro');
              if (artistGenreFilter === 'global') return gStr.includes('global') || gStr.includes('country') || gStr.includes('folk') || gStr.includes('pop') || gStr.includes('alt-rock');
              return true;
            });

            const displayed = filtered.slice(0, visibleArtistCount);

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {displayed.map((artist) => (
                    <button
                      key={artist.id}
                      onClick={() => handleOpenArtist(artist)}
                      className="flex flex-col items-center text-center p-3.5 rounded-2xl bg-neutral-900/60 hover:bg-neutral-800/90 border border-neutral-800/80 hover:border-emerald-500/50 transition group cursor-pointer shadow-md"
                    >
                      <div className="relative mb-2.5">
                        <img
                          src={artist.picture}
                          alt={artist.name}
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover shadow-xl border-2 border-neutral-700 group-hover:border-emerald-500 transition group-hover:scale-105"
                        />
                        <div className="absolute bottom-0 right-0 p-1 rounded-full bg-emerald-500 text-black shadow-md">
                          <Award className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      <div className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-400 truncate w-full">
                        {artist.name}
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate w-full mt-0.5">
                        {artist.fans || 'Sanatçı'}
                      </div>
                      <div className="mt-2 text-[10px] text-emerald-400 font-bold px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                        Şarkıları İncele →
                      </div>
                    </button>
                  ))}
                </div>

                {filtered.length > visibleArtistCount && (
                  <div className="pt-2 text-center">
                    <button
                      onClick={() => setVisibleArtistCount((prev) => prev + 24)}
                      className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white hover:text-emerald-400 text-xs font-bold rounded-2xl border border-neutral-700 hover:border-emerald-500/50 transition cursor-pointer shadow-lg inline-flex items-center gap-2"
                    >
                      <span>Daha Fazla Şarkıcı Göster ({filtered.length - visibleArtistCount} Sanatçı Kaldı)</span>
                      <ArrowRight className="w-4 h-4 text-emerald-400" />
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* DEDICATED PLAYLISTS VIEW (When activeCategory === 'playlists' or in 'all' view when playlists exist) */}
      {(activeCategory === 'playlists' || (activeCategory === 'all' && playlistSearchResults.length > 0 && searchTerm.trim())) && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
              <FolderHeart className="w-4 h-4 text-emerald-400" />
              <span>
                {searchTerm.trim() ? `Eşleşen Çalma Listeleri (${playlistSearchResults.length})` : `Spotify & Özel Çalma Listeleri`}
              </span>
            </h2>
            <span className="text-[11px] text-neutral-400">Spotify Resmi Listeleri ve Kendi Listeleriniz</span>
          </div>

          {/* Playlist Filters Bar */}
          {activeCategory === 'playlists' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              {[
                { id: 'all', label: 'Tümü' },
                { id: 'user', label: `❤️ Kendi Listelerim (${playlists.length})` },
                { id: 'spotify', label: '🟢 Spotify Trendleri & Resmi' },
                { id: 'pop', label: '🇹🇷 Türkçe Pop' },
                { id: 'arabesk', label: '🥀 Arabesk & Damar' },
                { id: 'rock', label: '🎸 Türkçe Rock' },
                { id: 'rap', label: '🎤 Rap & Drill' },
                { id: 'lofi', label: '☕ Lo-Fi & Akustik' },
                { id: 'drive', label: '🌃 Gece Sürüşü' },
                { id: 'gym', label: '⚡ Gym & Spor' }
              ].map((pf) => (
                <button
                  key={pf.id}
                  onClick={() => {
                    setPlaylistSourceFilter(pf.id);
                    setVisiblePlaylistCount(20);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    playlistSourceFilter === pf.id
                      ? 'bg-emerald-500 text-black shadow-md'
                      : 'bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 border border-neutral-800'
                  }`}
                >
                  {pf.label}
                </button>
              ))}
            </div>
          )}

          {/* Spotify Direct Import Promo Banner inside Playlists view */}
          {activeCategory === 'playlists' && !searchTerm.trim() && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-[#121820] border border-emerald-500/20 flex items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1DB954]/20 border border-[#1DB954]/30 flex items-center justify-center shrink-0">
                  <Disc className="w-5 h-5 text-[#1DB954]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">İstediğiniz Spotify Çalma Listesini İçe Aktarın</h4>
                  <p className="text-[11px] text-neutral-400">Herhangi bir Spotify çalma listesi bağlantısını yapıştırarak 1000 şarkıya kadar anında yükleyin.</p>
                </div>
              </div>
              <button
                onClick={onOpenSpotifyImport}
                className="px-3.5 py-2 bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-bold rounded-xl transition shrink-0 cursor-pointer shadow-md"
              >
                Link İçe Aktar
              </button>
            </div>
          )}

          {(() => {
            // Build unified list of user playlists and search playlists
            const userPlaylistsFormatted: PlaylistSearchResult[] = playlists.map((p) => ({
              id: `usr_${p.id}`,
              name: p.name,
              description: `${p.tracks.length} Şarkı • Kendi Oluşturduğunuz Çalma Listesi`,
              coverUrl: p.tracks[0]?.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600',
              trackCount: p.tracks.length,
              author: 'Kendi Listeniz',
              tracks: p.tracks,
              isUserPlaylist: true,
              source: 'user'
            }));

            // Merge avoiding duplicate IDs
            const seenIds = new Set<string>();
            const unified: PlaylistSearchResult[] = [];

            // Add user playlists first if not searching or if searching matches
            for (const up of userPlaylistsFormatted) {
              if (!searchTerm.trim() || up.name.toLowerCase().includes(searchTerm.toLowerCase().trim())) {
                unified.push(up);
                seenIds.add(up.id);
                seenIds.add(up.name.toLowerCase());
              }
            }

            for (const pl of playlistSearchResults) {
              if (!seenIds.has(pl.id) && !seenIds.has(pl.name.toLowerCase())) {
                unified.push(pl);
                seenIds.add(pl.id);
                seenIds.add(pl.name.toLowerCase());
              }
            }

            const filtered = unified.filter((pl) => {
              if (playlistSourceFilter === 'all') return true;
              if (playlistSourceFilter === 'user') return pl.isUserPlaylist || pl.source === 'user';
              if (playlistSourceFilter === 'spotify') return pl.source === 'spotify' || pl.name.toLowerCase().includes('spotify') || pl.author?.toLowerCase().includes('spotify');
              const text = (pl.name + ' ' + (pl.description || '') + ' ' + (pl.author || '')).toLowerCase();
              if (playlistSourceFilter === 'pop') return text.includes('pop');
              if (playlistSourceFilter === 'arabesk') return text.includes('arabesk') || text.includes('damar');
              if (playlistSourceFilter === 'rock') return text.includes('rock') || text.includes('anadolu');
              if (playlistSourceFilter === 'rap') return text.includes('rap') || text.includes('drill') || text.includes('hiphop');
              if (playlistSourceFilter === 'lofi') return text.includes('lofi') || text.includes('lo-fi') || text.includes('akustik') || text.includes('chill');
              if (playlistSourceFilter === 'drive') return text.includes('sürüş') || text.includes('synthwave') || text.includes('gece') || text.includes('drive');
              if (playlistSourceFilter === 'gym') return text.includes('gym') || text.includes('motivasyon') || text.includes('fitness') || text.includes('enerji');
              return true;
            });

            const displayed = filtered.slice(0, visiblePlaylistCount);

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {displayed.map((pl) => (
                    <div
                      key={pl.id}
                      onClick={() => handleOpenPlaylist(pl)}
                      className="group flex flex-col p-3 rounded-2xl bg-neutral-900/60 hover:bg-neutral-800/90 border border-neutral-800/80 hover:border-emerald-500/40 transition cursor-pointer shadow-md"
                    >
                      <div className="relative aspect-video sm:aspect-square w-full rounded-xl overflow-hidden mb-2.5 bg-neutral-950">
                        <img
                          src={pl.coverUrl}
                          alt={pl.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <div className="p-3 bg-emerald-500 rounded-full text-black shadow-lg">
                            <Play className="w-5 h-5 fill-black" />
                          </div>
                        </div>
                        {pl.isUserPlaylist ? (
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-emerald-500/90 text-black text-[10px] font-black">
                            ❤️ KENDİ LİSTENİZ
                          </div>
                        ) : pl.source === 'spotify' || pl.name.includes('Spotify') ? (
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#1DB954]/90 text-black text-[10px] font-black">
                            SPOTIFY RESMİ
                          </div>
                        ) : null}
                      </div>

                      <div className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-400 truncate">
                        {pl.name}
                      </div>
                      <div className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                        {pl.description}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-neutral-500 mt-2 pt-2 border-t border-neutral-800">
                        <span>{pl.trackCount} Şarkı</span>
                        <span className="text-emerald-400 font-semibold">Tümünü Çal →</span>
                      </div>
                    </div>
                  ))}
                </div>

                {filtered.length > visiblePlaylistCount && (
                  <div className="pt-2 text-center">
                    <button
                      onClick={() => setVisiblePlaylistCount((prev) => prev + 20)}
                      className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white hover:text-emerald-400 text-xs font-bold rounded-2xl border border-neutral-700 hover:border-emerald-500/50 transition cursor-pointer shadow-lg inline-flex items-center gap-2"
                    >
                      <span>Daha Fazla Çalma Listesi Göster ({filtered.length - visiblePlaylistCount} Liste Kaldı)</span>
                      <ArrowRight className="w-4 h-4 text-emerald-400" />
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* MODAL 1: ARTIST DISCOGRAPHY DETAIL */}
      {activeArtistDetail && (
        <ArtistDetailModal
          artist={activeArtistDetail}
          onClose={() => setActiveArtistDetail(null)}
          playlists={playlists}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          onPlayTrack={onPlayTrack}
          onAddTrackToPlaylist={onAddTrackToPlaylist}
          onAddToQueue={onAddToQueue}
          onPlayNext={onPlayNext}
          onDownloadTrackOffline={onDownloadTrackOffline}
          onStartSongRadio={onStartSongRadio}
        />
      )}

      {/* MODAL 2: PLAYLIST DETAIL */}
      {activePlaylistDetail && (
        <PlaylistDetailModal
          playlist={activePlaylistDetail}
          onClose={() => setActivePlaylistDetail(null)}
          userPlaylists={playlists}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          onPlayTrack={onPlayTrack}
          onSavePlaylistToLibrary={onSaveChartToPlaylist}
          onAddTrackToPlaylist={onAddTrackToPlaylist}
          onAddToQueue={onAddToQueue}
          onDownloadTrackOffline={onDownloadTrackOffline}
        />
      )}

      {/* MODAL 3: ADD TRACK TO PLAYLIST */}
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
