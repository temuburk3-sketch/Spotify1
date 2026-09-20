import { Track } from '../types';
import { parseSpotifyUrl, createTracksFromSpotifyImport, SpotifyParsedResult } from './spotifyParser';

export interface SpotifyPublicItem {
  id: string;
  type: 'playlist' | 'show' | 'album' | 'track' | 'episode';
  title: string;
  author: string;
  coverUrl: string;
  trackCount: number;
  description?: string;
  spotifyUrl: string;
  isPodcast?: boolean;
  category?: string;
}

export interface SpotifyResolvedData {
  id: string;
  type: 'playlist' | 'show' | 'album' | 'track' | 'episode';
  title: string;
  author: string;
  coverUrl: string;
  tracks: Track[];
  singleTrack?: Track;
  seriesEpisodes?: Track[];
  parentShow?: {
    id: string;
    title: string;
    totalEpisodes: number;
    coverUrl?: string;
  };
}

/**
 * Curated, verified live Spotify public playlists & podcast shows
 * (Instantly available and always responsive)
 */
export const FEATURED_SPOTIFY_COLLECTIONS: SpotifyPublicItem[] = [
  {
    id: '2kExBiXJq1F0oR0IWvc79Y',
    type: 'show',
    title: 'gidilmeyen yollar (Yıldız Kenter Şiirleri)',
    author: 'Yıldız Kenter / Metin Vural',
    coverUrl: 'https://i.scdn.co/image/ab6765630000ba8a6f687466049451cbd169f43d',
    trackCount: 13,
    description: 'Yıldız Kenter’in eşsiz sesinden Nisan’a Kaç Var, Geç Kaldın Bahar ve tüm unutulmaz şiir kayıtları.',
    spotifyUrl: 'https://open.spotify.com/show/2kExBiXJq1F0oR0IWvc79Y',
    isPodcast: true,
    category: 'Şiir & Edebiyat'
  },
  {
    id: '3HMCxw8PjUJLsxezlFHBhe',
    type: 'playlist',
    title: 'Yıldız Kenter Şiir Çalma Listesi',
    author: 'Spotify Kullanıcısı',
    coverUrl: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=600&auto=format&fit=crop&q=80',
    trackCount: 17,
    description: 'Yıldız Kenter seslendirmesiyle Türk edebiyatının başyapıt şiirleri ve özel ses kayıtları.',
    spotifyUrl: 'https://open.spotify.com/playlist/3HMCxw8PjUJLsxezlFHBhe',
    isPodcast: true,
    category: 'Şiir & Edebiyat'
  },
  {
    id: '37i9dQZF1DXcBWIGoYBM5M',
    type: 'playlist',
    title: "Today's Top Hits",
    author: 'Spotify',
    coverUrl: 'https://i.scdn.co/image/ab67706f000000021b72e2760a92b0c3453b3b4f',
    trackCount: 50,
    description: 'Dünya genelinde şu an en çok dinlenen ve listelerin zirvesinde yer alan küresel hitler.',
    spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    isPodcast: false,
    category: 'Pop & Trendler'
  },
  {
    id: '37i9dQZF1DX0XUsuxWHRQd',
    type: 'playlist',
    title: 'Türkçe Pop Zirvedekiler',
    author: 'Spotify',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    trackCount: 50,
    description: 'Türkiye müzik listelerinde en çok dinlenen ve radyolarda çalan en yeni popüler şarkılar.',
    spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd',
    isPodcast: false,
    category: 'Pop & Trendler'
  },
  {
    id: '37i9dQZF1DXa2PvUpywmrr',
    type: 'playlist',
    title: 'Viral 50 Türkiye',
    author: 'Spotify',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    trackCount: 50,
    description: 'Sosyal medyada ve dijital platformlarda en çok paylaşılan ve viral olan Türkçe parçalar.',
    spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXa2PvUpywmrr',
    isPodcast: false,
    category: 'Pop & Trendler'
  },
  {
    id: '37i9dQZF1DX7m5uO7eY30Z',
    type: 'playlist',
    title: 'Türkçe Akustik & Dinginlik',
    author: 'Spotify',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    trackCount: 45,
    description: 'Gitar ve piyano eşliğinde sade, duru ve ruhu dinlendiren akustik Türkçe parçalar.',
    spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX7m5uO7eY30Z',
    isPodcast: false,
    category: 'Sakinlik & Akustik'
  },
  {
    id: 'podcast_radyotiyatrosu',
    type: 'show',
    title: 'Radyo Tiyatrosu & Klasik Eserler',
    author: 'Radyo Tiyatrosu',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/ac/0c/3f/ac0c3f5c-8bde-f1b8-dcab-fcbede29b17d/mza_1408575835640953354.jpg/600x600bb.jpg',
    trackCount: 65,
    description: 'Usta seslendirme sanatçılarının hayat verdiği radyo oyunları ve edebi tiyatro seslendirmeleri.',
    spotifyUrl: 'https://open.spotify.com/show/6788330549',
    isPodcast: true,
    category: 'Şiir & Edebiyat'
  },
  {
    id: 'podcast_felsefe',
    type: 'show',
    title: 'Ortamlarda Satılacak Bilgi',
    author: 'Ozan Gündoğdu',
    coverUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&auto=format&fit=crop&q=80',
    trackCount: 90,
    description: 'Felsefe, tarih, sanat ve edebiyat konularında derin ve keyifli sohbetler.',
    spotifyUrl: 'https://open.spotify.com/show/1570628534',
    isPodcast: true,
    category: 'Podcast Yayınları'
  }
];

/**
 * Dynamic Spotify Public Search & Discovery Service
 */
export async function searchSpotifyPublic(query: string, filterType?: 'all' | 'playlist' | 'show' | 'album'): Promise<SpotifyPublicItem[]> {
  const cleanQ = query.trim().toLowerCase();
  if (!cleanQ) return FEATURED_SPOTIFY_COLLECTIONS;

  // 1. Check local featured matches first for instantaneous response
  const localMatches = FEATURED_SPOTIFY_COLLECTIONS.filter(item => {
    const matchesText = item.title.toLowerCase().includes(cleanQ) ||
                        item.author.toLowerCase().includes(cleanQ) ||
                        (item.category && item.category.toLowerCase().includes(cleanQ)) ||
                        (item.description && item.description.toLowerCase().includes(cleanQ));
    if (!matchesText) return false;
    if (filterType && filterType !== 'all') {
      return item.type === filterType;
    }
    return true;
  });

  // 2. Query backend search endpoint
  try {
    const params = new URLSearchParams({
      q: query,
      type: filterType || 'all'
    });
    const res = await fetch(`/api/spotify/search?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.items) && data.items.length > 0) {
        // Merge with any local matches without duplicating IDs
        const existingIds = new Set(data.items.map((i: any) => i.id));
        const combined = [...data.items];
        for (const loc of localMatches) {
          if (!existingIds.has(loc.id)) {
            combined.unshift(loc);
          }
        }
        return combined;
      }
    }
  } catch (err) {
    console.warn('Backend Spotify search note, using fallback...', err);
  }

  // 3. Fallback: Search iTunes Podcasts (CORS-friendly open public index)
  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=podcast&limit=10`;
    const itunesRes = await fetch(itunesUrl);
    if (itunesRes.ok) {
      const itunesData = await itunesRes.json();
      const podcastItems: SpotifyPublicItem[] = (itunesData.results || []).map((item: any) => ({
        id: `itunes_pod_${item.collectionId}`,
        type: 'show' as const,
        title: item.collectionName || query,
        author: item.artistName || 'Podcast Yayıncısı',
        coverUrl: item.artworkUrl600 || item.artworkUrl100 || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600',
        trackCount: item.trackCount || 12,
        description: `${item.primaryGenreName || 'Podcast'} yayını. Tüm bölümleri eksiksiz aktarılabilir.`,
        spotifyUrl: item.collectionViewUrl || `https://open.spotify.com/search/${encodeURIComponent(item.collectionName)}`,
        isPodcast: true,
        category: 'Podcast Yayınları'
      }));

      const existingIds = new Set(localMatches.map(i => i.id));
      const results = [...localMatches];
      for (const pod of podcastItems) {
        if (!existingIds.has(pod.id)) {
          results.push(pod);
        }
      }
      return results;
    }
  } catch (e) {
    console.warn('Podcast search fallback note:', e);
  }

  return localMatches;
}

/**
 * Resolves any Spotify URL or Collection item into playable tracks,
 * automatically detecting if an episode belongs to a series/show and expanding it!
 */
export async function resolveSpotifyMedia(urlOrId: string, options: { expandSeries?: boolean } = { expandSeries: true }): Promise<SpotifyResolvedData> {
  const trimmed = urlOrId.trim();

  // If already a full URL or Spotify URI, send to backend resolver
  try {
    const expandParam = options.expandSeries ? '&expandSeries=true' : '';
    const res = await fetch(`/api/spotify/resolve?url=${encodeURIComponent(trimmed)}${expandParam}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.tracks && data.tracks.length > 0) {
        return {
          id: data.id || 'resolved',
          type: data.type || 'playlist',
          title: data.title || 'Spotify Listesi',
          author: data.author || 'Spotify',
          coverUrl: data.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600',
          tracks: data.tracks,
          singleTrack: data.singleTrack,
          seriesEpisodes: data.seriesEpisodes,
          parentShow: data.parentShow
        };
      }
    }
  } catch (err) {
    console.warn('Backend resolve note, falling back to client parser...', err);
  }

  // Fallback to client parser
  const parsed = await parseSpotifyUrl(trimmed);
  if (!parsed || !parsed.tracks || parsed.tracks.length === 0) {
    throw new Error('Spotify verisi veya bölümleri çözümlenemedi. Lütfen geçerli bir Spotify veya podcast bağlantısı girin.');
  }

  return {
    id: parsed.id,
    type: parsed.type as any,
    title: parsed.title,
    author: parsed.authorName || 'Spotify',
    coverUrl: parsed.thumbnailUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600',
    tracks: parsed.tracks
  };
}
