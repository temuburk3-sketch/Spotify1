import { Track, ArtistResult, PlaylistSearchResult, Playlist } from '../types';
import { POPULAR_ORIGINAL_HITS, POPULAR_ORIGINAL_ARTISTS } from '../data/popularOriginalTracks';

// Robust In-Memory Client-Side Caches
const trackCache = new Map<string, Track[]>();
const artistCache = new Map<string, ArtistResult[]>();
const playlistCache = new Map<string, PlaylistSearchResult[]>();
const artistTracksCache = new Map<string, Track[]>();

// Curated comprehensive Turkish & Global Artists Database
export const MASTER_ARTISTS_CATALOG: ArtistResult[] = [
  {
    id: 'art_sezen_aksu',
    name: 'Sezen Aksu',
    picture: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/4a/14/80/4a1480f2-e565-d0ff-788c-f8319f635676/8697407051752.jpg/600x600bb.jpg',
    fans: '3.8M Aylık Dinleyici • Minik Serçe',
    genres: ['Türkçe Pop', 'Klasik', 'Akustik'],
    popularity: 100
  },
  {
    id: 'art_mert_demir',
    name: 'Mert Demir',
    picture: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/43/39/bb/4339bbf7-d2c3-22ed-90e7-9a14416780c8/196922638558_Cover.jpg/600x600bb.jpg',
    fans: '2.9M Aylık Dinleyici',
    genres: ['Pop', 'Akustik', 'R&B'],
    popularity: 99
  },
  {
    id: 'art_muslum_gurses',
    name: 'Müslüm Gürses',
    picture: 'https://is1-ssl.mzstatic.com/image/thumb/Music118/v4/bc/f5/a3/bcf5a3c2-dcfb-5542-a4f6-8c4d52f6bfa7/8691531003426.jpg/600x600bb.jpg',
    fans: '3.1M Aylık Dinleyici • Müslüm Baba',
    genres: ['Arabesk', 'Damar', 'Klasik'],
    popularity: 99
  },
  {
    id: 'art_duman',
    name: 'Duman',
    picture: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/ec/3b/b7/ec3bb7c2-d352-7b27-2e1d-85472851eaee/8697407051189.jpg/600x600bb.jpg',
    fans: '2.4M Aylık Dinleyici',
    genres: ['Türkçe Rock', 'Grunge', 'Alternatif'],
    popularity: 98
  },
  {
    id: 'art_mabel_matiz',
    name: 'Mabel Matiz',
    picture: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/36/53/4e/36534e56-2dbb-5e6f-5777-61c0e3933c07/cover.jpg/600x600bb.jpg',
    fans: '3.4M Aylık Dinleyici',
    genres: ['Türkçe Pop', 'Elektronik', 'Alternatif'],
    popularity: 98
  },
  {
    id: 'art_tarkan',
    name: 'Tarkan',
    picture: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/3f/ea/89/3fea89eb-2df3-2e7a-c15c-37209ff8fca9/8697407051745.jpg/600x600bb.jpg',
    fans: '3.2M Aylık Dinleyici • Megastar',
    genres: ['Türkçe Pop', 'Dans', 'Klasik'],
    popularity: 99
  },
  {
    id: 'art_mor_ve_otesi',
    name: 'Mor ve Ötesi',
    picture: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/10/d8/ec/10d8ecf6-02e0-2df5-f674-c361952e42ef/8697407050304.jpg/600x600bb.jpg',
    fans: '1.9M Aylık Dinleyici',
    genres: ['Türkçe Rock', 'Alternatif'],
    popularity: 97
  },
  {
    id: 'art_teoman',
    name: 'Teoman',
    picture: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b8/63/ea/b863ea6b-4e12-88f5-9388-75b2ec68ea5b/8697407050212.jpg/600x600bb.jpg',
    fans: '2.1M Aylık Dinleyici',
    genres: ['Türkçe Rock', 'Akustik'],
    popularity: 97
  },
  {
    id: 'art_semicenk',
    name: 'Semicenk',
    picture: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/bf/16/be/bf16be84-5f50-3d71-9efb-91f061f22e70/cover.jpg/600x600bb.jpg',
    fans: '3.5M Aylık Dinleyici',
    genres: ['Türkçe Pop', 'Trap', 'Arabesk Pop'],
    popularity: 99
  },
  {
    id: 'art_melike_sahin',
    name: 'Melike Şahin',
    picture: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/4a/68/7c/4a687cc0-2b1b-681b-5e4c-13cf4a54c5ee/8697415717616.jpg/600x600bb.jpg',
    fans: '2.2M Aylık Dinleyici',
    genres: ['Alternatif', 'Akustik', 'Diva'],
    popularity: 98
  },
  {
    id: 'art_simge',
    name: 'Simge',
    picture: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/43/46/4a/43464a38-c6eb-ceb0-2b7e-9cb5f123ca39/cover.jpg/600x600bb.jpg',
    fans: '2.8M Aylık Dinleyici',
    genres: ['Türkçe Pop', 'Dans'],
    popularity: 98
  },
  {
    id: 'art_ezhel',
    name: 'Ezhel',
    picture: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/55/e8/60/55e86095-23c2-d383-747d-080b06b86cf7/cover.jpg/600x600bb.jpg',
    fans: '2.7M Aylık Dinleyici',
    genres: ['Türkçe Rap', 'Trap', 'Reggae'],
    popularity: 98
  },
  {
    id: 'art_ceza',
    name: 'Ceza',
    picture: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/49/65/59/49655972-e1d5-aa7f-d122-c3dfb86eecf7/8697407050182.jpg/600x600bb.jpg',
    fans: '1.8M Aylık Dinleyici • Rapstar',
    genres: ['Türkçe Rap', 'Hip-Hop'],
    popularity: 97
  },
  {
    id: 'art_sagopa_kajmer',
    name: 'Sagopa Kajmer',
    picture: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/5a/08/fc/5a08fc44-0b73-7749-ea2d-dcbc9d9c2a7e/cover.jpg/600x600bb.jpg',
    fans: '2.3M Aylık Dinleyici • Üstat',
    genres: ['Türkçe Rap', 'Melankolik Hip-Hop'],
    popularity: 98
  },
  {
    id: 'art_blok3',
    name: 'BLOK3',
    picture: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/91/97/34/919734e3-3b10-67c4-05e8-f9b1bc108154/cover.jpg/600x600bb.jpg',
    fans: '3.1M Aylık Dinleyici',
    genres: ['Türkçe Drill', 'Trap', 'Rap'],
    popularity: 99
  },
  {
    id: 'art_the_weeknd',
    name: 'The Weeknd',
    picture: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/d5/3d/bf/d53dbfdf-188b-2ee0-77a8-a3f231e64906/20UMGIM10188.rgb.jpg/600x600bb.jpg',
    fans: '110M Aylık Dinleyici • Global',
    genres: ['R&B', 'Synthwave', 'Pop'],
    popularity: 100
  },
  {
    id: 'art_billie_eilish',
    name: 'Billie Eilish',
    picture: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/58/63/c9/5863c9b7-1c94-817f-1786-90b9576f3f01/24UMGIM39276.rgb.jpg/600x600bb.jpg',
    fans: '95M Aylık Dinleyici',
    genres: ['Alternative Pop', 'Indie'],
    popularity: 100
  },
  {
    id: 'art_dua_lipa',
    name: 'Dua Lipa',
    picture: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/fb/03/65/fb036577-4fb8-18e3-05ec-08e1b12e3e56/190295286101.jpg/600x600bb.jpg',
    fans: '82M Aylık Dinleyici',
    genres: ['Dance Pop', 'Disco'],
    popularity: 99
  },
  {
    id: 'art_baris_manco',
    name: 'Barış Manço',
    picture: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/96/b5/6f/96b56f34-4bb9-3aa5-add2-5a2504e74562/cover.jpg/600x600bb.jpg',
    fans: '1.7M Aylık Dinleyici • Efsane',
    genres: ['Anadolu Rock', 'Klasik'],
    popularity: 98
  },
  {
    id: 'art_cem_karaca',
    name: 'Cem Karaca',
    picture: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/a4/09/b3/a409b33b-ebca-57ea-eb71-5527ca3d2319/8691531001460.jpg/600x600bb.jpg',
    fans: '1.4M Aylık Dinleyici • Efsane',
    genres: ['Anadolu Rock', 'Progresif Rock'],
    popularity: 97
  },
  {
    id: 'art_ahmet_kaya',
    name: 'Ahmet Kaya',
    picture: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/58/01/f9/5801f9bb-0062-8419-f9c9-04fa2851ee7e/8691531001712.jpg/600x600bb.jpg',
    fans: '2.8M Aylık Dinleyici • Özgün Müzik',
    genres: ['Özgün Müzik', 'Halk Müziği'],
    popularity: 99
  },
  {
    id: 'art_yildiz_tilbe',
    name: 'Yıldız Tilbe',
    picture: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/1e/8a/26/1e8a264a-2f47-e17f-055c-cf2e260c6d59/8697407050724.jpg/600x600bb.jpg',
    fans: '2.6M Aylık Dinleyici',
    genres: ['Türkçe Pop', 'Damar', 'Fantezi'],
    popularity: 98
  },
  {
    id: 'art_ebru_gundes',
    name: 'Ebru Gündeş',
    picture: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/91/97/d9/9197d9e5-94e8-8869-df41-10c71a3962b9/8697407050519.jpg/600x600bb.jpg',
    fans: '2.1M Aylık Dinleyici',
    genres: ['Türk Sanat Müziği', 'Fantezi', 'Pop'],
    popularity: 97
  }
];

// Helper: Fast timeout fetch
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 2500): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

/**
 * Universal Track Search that works 100% on Vercel, Netlify, Cloud Run and Client SPA
 */
export async function searchUniversalTracks(query: string, category = 'all'): Promise<Track[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return POPULAR_ORIGINAL_HITS;

  const cacheKey = `tracks_${cleanQuery.toLowerCase()}_${category}`;
  if (trackCache.has(cacheKey)) {
    return trackCache.get(cacheKey)!;
  }

  const results: Track[] = [];
  const seenKeys = new Set<string>();

  const addTrack = (track: Track) => {
    const key = `${track.title.toLowerCase().replace(/\(.*?\)/g, '').trim()}___${track.artist.toLowerCase().trim()}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      results.push(track);
    }
  };

  // 1. Check local curated database for instant matches
  const qLower = cleanQuery.toLowerCase();
  for (const track of POPULAR_ORIGINAL_HITS) {
    if (
      track.title.toLowerCase().includes(qLower) ||
      track.artist.toLowerCase().includes(qLower) ||
      track.album.toLowerCase().includes(qLower) ||
      (track.lyrics && track.lyrics.some(l => l.toLowerCase().includes(qLower)))
    ) {
      addTrack(track);
    }
  }

  // 2. Try server-side API endpoint if available (Local dev / Cloud Run)
  try {
    const serverType = category === 'lyrics' ? 'lyrics' : category === 'artists' ? 'artist' : 'all';
    const sRes = await fetchWithTimeout(`/api/audio/search?q=${encodeURIComponent(cleanQuery)}&type=${serverType}`, {}, 1800);
    if (sRes.ok) {
      const sData = await sRes.json();
      if (sData.results && Array.isArray(sData.results)) {
        for (const t of sData.results) {
          addTrack(t);
        }
      }
    }
  } catch {}

  // 3. Direct Client-Side Open APIs (Guarantees zero-failure on Vercel & static hosting!)
  // Query A: iTunes Open Search API (Turkey catalog for best Turkish music matching)
  try {
    const itunesUrlTR = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&entity=song&limit=50&country=TR`;
    const itRes = await fetchWithTimeout(itunesUrlTR, {}, 3500);
    if (itRes.ok) {
      const itData = await itRes.json();
      if (itData.results && Array.isArray(itData.results)) {
        for (const item of itData.results) {
          if (!item.trackName || !item.artistName) continue;
          
          const cover = item.artworkUrl100 
            ? item.artworkUrl100.replace('100x100bb', '600x600bb')
            : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600';

          const track: Track = {
            id: `itunes_${item.trackId}`,
            title: item.trackName,
            artist: item.artistName,
            album: item.collectionName || item.trackName,
            duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 180,
            coverUrl: cover,
            audioUrl: item.previewUrl || '',
            genre: item.primaryGenreName || 'Pop',
            source: 'stream',
            isOriginal: true,
            popularity: 90,
            addedAt: new Date().toISOString()
          };
          addTrack(track);
        }
      }
    }
  } catch (err) {
    console.warn('Direct iTunes TR search notice:', err);
  }

  // If few results, also search global iTunes catalog
  if (results.length < 5) {
    try {
      const itunesUrlGlobal = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&entity=song&limit=40`;
      const itGlobalRes = await fetchWithTimeout(itunesUrlGlobal, {}, 3000);
      if (itGlobalRes.ok) {
        const itData = await itGlobalRes.json();
        if (itData.results && Array.isArray(itData.results)) {
          for (const item of itData.results) {
            const cover = item.artworkUrl100 
              ? item.artworkUrl100.replace('100x100bb', '600x600bb')
              : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600';

            const track: Track = {
              id: `itunes_gl_${item.trackId}`,
              title: item.trackName,
              artist: item.artistName,
              album: item.collectionName || item.trackName,
              duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 180,
              coverUrl: cover,
              audioUrl: item.previewUrl || '',
              genre: item.primaryGenreName || 'Pop',
              source: 'stream',
              isOriginal: true,
              popularity: 88,
              addedAt: new Date().toISOString()
            };
            addTrack(track);
          }
        }
      }
    } catch {}
  }

  // Query B: Audius Open Music API for independent/full streams
  try {
    const audiusUrl = `https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(cleanQuery)}&app_name=SOUNDPULSE`;
    const aRes = await fetchWithTimeout(audiusUrl, {}, 3000);
    if (aRes.ok) {
      const aData = await aRes.json();
      if (aData.data && Array.isArray(aData.data)) {
        for (const item of aData.data.slice(0, 15)) {
          const track: Track = {
            id: `aud_${item.id}`,
            title: item.title,
            artist: item.user?.name || 'Sanatçı',
            album: item.genre || 'Audius Full Stream',
            duration: item.duration || 200,
            coverUrl: item.artwork?.['480x480'] || item.artwork?.['150x150'] || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600',
            audioUrl: `https://discoveryprovider.audius.co/v1/tracks/${item.id}/stream?app_name=SOUNDPULSE`,
            genre: item.genre || 'Electronic',
            source: 'stream',
            isOriginal: true,
            popularity: 80,
            addedAt: new Date().toISOString()
          };
          addTrack(track);
        }
      }
    }
  } catch {}

  trackCache.set(cacheKey, results);
  return results;
}

/**
 * Universal Artist Search that works everywhere
 */
export async function searchUniversalArtists(query: string): Promise<ArtistResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return MASTER_ARTISTS_CATALOG;

  const cacheKey = `artists_${cleanQuery.toLowerCase()}`;
  if (artistCache.has(cacheKey)) {
    return artistCache.get(cacheKey)!;
  }

  const results: ArtistResult[] = [];
  const seenNames = new Set<string>();

  const addArtist = (artist: ArtistResult) => {
    const norm = artist.name.toLowerCase().trim();
    if (!seenNames.has(norm)) {
      seenNames.add(norm);
      results.push(artist);
    }
  };

  // 1. Search Master Artists Catalog
  const qLower = cleanQuery.toLowerCase();
  for (const a of MASTER_ARTISTS_CATALOG) {
    if (
      a.name.toLowerCase().includes(qLower) ||
      (a.genres && a.genres.some(g => g.toLowerCase().includes(qLower))) ||
      (a.fans && a.fans.toLowerCase().includes(qLower))
    ) {
      addArtist(a);
    }
  }

  // 2. Try server-side API if running
  try {
    const sRes = await fetchWithTimeout(`/api/search/artists?q=${encodeURIComponent(cleanQuery)}`, {}, 1800);
    if (sRes.ok) {
      const sData = await sRes.json();
      if (sData.artists && Array.isArray(sData.artists)) {
        for (const a of sData.artists) {
          addArtist(a);
        }
      }
    }
  } catch {}

  // 3. Direct iTunes Open API for music artists and top tracks
  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&entity=song&limit=30&country=TR`;
    const itRes = await fetchWithTimeout(itunesUrl, {}, 3000);
    if (itRes.ok) {
      const itData = await itRes.json();
      if (itData.results && Array.isArray(itData.results)) {
        for (const item of itData.results) {
          if (!item.artistName) continue;
          const cover = item.artworkUrl100 
            ? item.artworkUrl100.replace('100x100bb', '600x600bb')
            : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600';

          addArtist({
            id: `art_it_${item.artistId || Math.random().toString(36).substring(7)}`,
            name: item.artistName,
            picture: cover,
            fans: 'Sanatçı • Diskografi Mevcut',
            genres: [item.primaryGenreName || 'Pop'],
            popularity: 90
          });
        }
      }
    }
  } catch {}

  artistCache.set(cacheKey, results);
  return results;
}

/**
 * Universal Playlist Search
 */
export async function searchUniversalPlaylists(query: string, userPlaylists: Playlist[] = []): Promise<PlaylistSearchResult[]> {
  const cleanQuery = query.trim();
  const qLower = cleanQuery.toLowerCase();

  const results: PlaylistSearchResult[] = [];
  const seenIds = new Set<string>();

  const addPl = (pl: PlaylistSearchResult) => {
    if (!seenIds.has(pl.id)) {
      seenIds.add(pl.id);
      results.push(pl);
    }
  };

  // 1. User playlists matching query
  for (const up of userPlaylists) {
    if (!cleanQuery || up.name.toLowerCase().includes(qLower) || up.description.toLowerCase().includes(qLower)) {
      addPl({
        id: `usr_${up.id}`,
        name: up.name,
        description: `${up.tracks.length} Parça • Kendi Çalma Listeniz`,
        coverUrl: up.tracks[0]?.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600',
        trackCount: up.tracks.length,
        author: 'Siz',
        tracks: up.tracks,
        isUserPlaylist: true,
        source: 'user'
      });
    }
  }

  // 2. Curated Curations
  const PRESET_PLAYLISTS: PlaylistSearchResult[] = [
    {
      id: 'pl_tr_pop',
      name: 'Türkçe Pop 2024 & Zirvedekiler',
      description: 'Mert Demir, Mabel Matiz, Semicenk, Simge ve en çok dinlenen Türkçe Pop hitleri.',
      coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/43/39/bb/4339bbf7-d2c3-22ed-90e7-9a14416780c8/196922638558_Cover.jpg/600x600bb.jpg',
      trackCount: 45,
      author: 'Spotify & SoundPulse',
      source: 'spotify'
    },
    {
      id: 'pl_arabesk_damar',
      name: 'Arabesk Efsaneleri & Damar FM',
      description: 'Müslüm Gürses, Bergen, Ferdi Tayfur, Azer Bülbül ve unutulmaz damar parçalar.',
      coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music118/v4/bc/f5/a3/bcf5a3c2-dcfb-5542-a4f6-8c4d52f6bfa7/8691531003426.jpg/600x600bb.jpg',
      trackCount: 50,
      author: 'Spotify & SoundPulse',
      source: 'spotify'
    },
    {
      id: 'pl_tr_rock',
      name: 'Türkçe Rock & Anadolu Klasikleri',
      description: 'Duman, Mor ve Ötesi, Barış Manço, Şebnem Ferah, Teoman ve efsane rock marşları.',
      coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/ec/3b/b7/ec3bb7c2-d352-7b27-2e1d-85472851eaee/8697407051189.jpg/600x600bb.jpg',
      trackCount: 40,
      author: 'Spotify & SoundPulse',
      source: 'spotify'
    },
    {
      id: 'pl_tr_rap',
      name: 'Türkçe Rap & Trap Ateşi',
      description: 'BLOK3, Ezhel, Ceza, Sagopa Kajmer, UZI ve en sert rap beatleri.',
      coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/91/97/34/919734e3-3b10-67c4-05e8-f9b1bc108154/cover.jpg/600x600bb.jpg',
      trackCount: 35,
      author: 'Spotify & SoundPulse',
      source: 'spotify'
    },
    {
      id: 'pl_night_drive',
      name: 'Gece Sürüşü & Synthwave Retro',
      description: 'The Weeknd, Daft Punk, Kavinsky ve gece yolculuğunun en iyi atmosferi.',
      coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/d5/3d/bf/d53dbfdf-188b-2ee0-77a8-a3f231e64906/20UMGIM10188.rgb.jpg/600x600bb.jpg',
      trackCount: 30,
      author: 'SoundPulse Curated',
      source: 'spotify'
    },
    {
      id: 'pl_lofi_chill',
      name: 'Lo-Fi Beats & Odaklanma Kahvesi',
      description: 'Ders çalışma, kod yazma ve derin odaklanma için pürüzsüz lo-fi akışı.',
      coverUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600',
      trackCount: 50,
      author: 'SoundPulse Curated',
      source: 'spotify'
    }
  ];

  for (const pl of PRESET_PLAYLISTS) {
    if (!cleanQuery || pl.name.toLowerCase().includes(qLower) || pl.description.toLowerCase().includes(qLower)) {
      addPl(pl);
    }
  }

  // 3. Try server playlists endpoint if active
  try {
    const sRes = await fetchWithTimeout(`/api/search/playlists?q=${encodeURIComponent(cleanQuery)}`, {}, 1800);
    if (sRes.ok) {
      const sData = await sRes.json();
      if (sData.playlists && Array.isArray(sData.playlists)) {
        for (const pl of sData.playlists) {
          addPl(pl);
        }
      }
    }
  } catch {}

  return results;
}

/**
 * Universal Artist Top Tracks & Discography Loader
 */
export async function fetchUniversalArtistTracks(artistId: string, artistName: string): Promise<Track[]> {
  const cacheKey = `artist_tracks_${artistName.toLowerCase()}`;
  if (artistTracksCache.has(cacheKey)) {
    return artistTracksCache.get(cacheKey)!;
  }

  const tracks: Track[] = [];
  const seenKeys = new Set<string>();

  const addTrack = (track: Track) => {
    const key = track.title.toLowerCase().replace(/\(.*?\)/g, '').trim();
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      tracks.push(track);
    }
  };

  // 1. Check local catalog first
  for (const hit of POPULAR_ORIGINAL_HITS) {
    if (hit.artist.toLowerCase().includes(artistName.toLowerCase()) || artistName.toLowerCase().includes(hit.artist.toLowerCase())) {
      addTrack(hit);
    }
  }

  // 2. Try server API
  try {
    const sRes = await fetchWithTimeout(`/api/artist/top-tracks?artistId=${encodeURIComponent(artistId)}&artistName=${encodeURIComponent(artistName)}`, {}, 2000);
    if (sRes.ok) {
      const sData = await sRes.json();
      if (sData.tracks && Array.isArray(sData.tracks)) {
        for (const t of sData.tracks) {
          addTrack(t);
        }
      }
    }
  } catch {}

  // 3. Direct iTunes Artist Songs API
  try {
    const itUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=song&limit=50&country=TR`;
    const itRes = await fetchWithTimeout(itUrl, {}, 3500);
    if (itRes.ok) {
      const itData = await itRes.json();
      if (itData.results && Array.isArray(itData.results)) {
        for (const item of itData.results) {
          if (!item.trackName) continue;
          const cover = item.artworkUrl100 
            ? item.artworkUrl100.replace('100x100bb', '600x600bb')
            : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600';

          const track: Track = {
            id: `art_song_${item.trackId}`,
            title: item.trackName,
            artist: item.artistName || artistName,
            album: item.collectionName || item.trackName,
            duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 180,
            coverUrl: cover,
            audioUrl: item.previewUrl || '',
            genre: item.primaryGenreName || 'Pop',
            source: 'stream',
            isOriginal: true,
            popularity: 95,
            addedAt: new Date().toISOString()
          };
          addTrack(track);
        }
      }
    }
  } catch {}

  artistTracksCache.set(cacheKey, tracks);
  return tracks;
}

/**
 * Universal Playlist Tracks Loader
 */
export async function fetchUniversalPlaylistTracks(playlistId: string, playlistName: string): Promise<Track[]> {
  // 1. Try server API
  try {
    const sRes = await fetchWithTimeout(`/api/playlist/tracks?playlistId=${encodeURIComponent(playlistId)}&name=${encodeURIComponent(playlistName)}`, {}, 2000);
    if (sRes.ok) {
      const sData = await sRes.json();
      if (sData.tracks && Array.isArray(sData.tracks) && sData.tracks.length > 0) {
        return sData.tracks;
      }
    }
  } catch {}

  // 2. Curated thematic queries for open API
  const query = playlistName.replace(/Türkçe|Pop|Rock|Rap|Arabesk|Hits|Top 50/gi, '').trim() || playlistName;
  return await searchUniversalTracks(query);
}
