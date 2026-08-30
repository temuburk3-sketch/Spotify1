import { Track, Playlist, ListeningHistoryItem, ListeningHabitsSummary, SmartRecommendationOptions } from '../types';
import { searchUniversalTracks } from './universalSearchService';

const HISTORY_KEY = 'soundpulse_listening_history';
const PIN_KEY = 'soundpulse_user_pin';
const LOCK_STATE_KEY = 'soundpulse_is_locked';
const ENDLESS_AUTOPLAY_KEY = 'soundpulse_endless_autoplay';
const SMART_SHUFFLE_KEY = 'soundpulse_smart_shuffle_enabled';

export type MusicThemeCategory =
  | 'arabesk_damar'
  | 'turkce_rock'
  | 'turkce_rap'
  | 'turkce_pop'
  | 'synthwave_retro'
  | 'lofi_chill'
  | 'workout_edm'
  | 'global_pop'
  | 'general';

export interface ThematicClassification {
  category: MusicThemeCategory;
  displayName: string;
  badge: string;
  color: string;
}

// ----------------------------------------------------
// Related Artists Graph (Spotify-style Peer Mapping)
// ----------------------------------------------------
export const ARTIST_SIMILARITY_GRAPH: Record<string, string[]> = {
  // Arabesk & Damar
  'müslüm gürses': ['Ferdi Tayfur', 'Bergen', 'Azer Bülbül', 'Cengiz Kurtoğlu', 'Orhan Gencebay', 'Ebru Gündeş', 'Ahmet Kaya'],
  'ferdi tayfur': ['Müslüm Gürses', 'Bergen', 'Azer Bülbül', 'Cengiz Kurtoğlu', 'Orhan Gencebay', 'İbrahim Tatlıses'],
  'bergen': ['Müslüm Gürses', 'Ferdi Tayfur', 'Güllü', 'Kibariye', 'Cengiz Kurtoğlu', 'Ebru Gündeş'],
  'azer bülbül': ['Müslüm Gürses', 'Ferdi Tayfur', 'Hakan Taşıyan', 'Bergen', 'Ahmet Kaya', 'Güllü'],
  'cengiz kurtoğlu': ['Ümit Besen', 'Müslüm Gürses', 'Ferdi Tayfur', 'Hakan Altun', 'Coşkun Sabah', 'Arif Susam'],
  'ibrahim tatlıses': ['Müslüm Gürses', 'Ferdi Tayfur', 'Mahsun Kırmızıgül', 'Ebru Gündeş', 'Sibel Can'],
  'ahmet kaya': ['Müslüm Gürses', 'Selda Bağcan', 'Edip Akbayram', 'Grup Yorum', 'Cevdet Bağca', 'Deniz Koyuncu'],
  'ebru gündeş': ['Sibel Can', 'Yıldız Tilbe', 'Müslüm Gürses', 'Gülben Ergen', 'Zara', 'Linet'],
  'yıldız tilbe': ['Sezen Aksu', 'Sıla', 'Müslüm Gürses', 'Ebru Gündeş', 'Ceylan Ertem', 'Hakan Altun'],

  // Türkçe Rock & Anadolu Rock
  'duman': ['Mor ve Ötesi', 'Şebnem Ferah', 'Teoman', 'Adamlar', 'Madrigal', 'Yüzyüzeyken Konuşuruz', 'Athena', 'Kaan Tangöze'],
  'mor ve ötesi': ['Duman', 'Şebnem Ferah', 'Teoman', 'Manga', 'Gripin', 'Pentagram', 'Redd'],
  'şebnem ferah': ['Mor ve Ötesi', 'Duman', 'Teoman', 'Özlem Tekin', 'Ogün Sanlısoy', 'Pentagram'],
  'teoman': ['Duman', 'Mor ve Ötesi', 'Şebnem Ferah', 'Madrigal', 'Kaan Tangöze', 'Pinhani', 'Haluk Levent'],
  'manga': ['Mor ve Ötesi', 'Duman', 'Gripin', 'Athena', 'Pentagram', 'Model'],
  'barış manço': ['Cem Karaca', 'Erkin Koray', 'Fikret Kızılok', 'Moğollar', 'Edip Akbayram', 'İlhan İrem'],
  'cem karaca': ['Barış Manço', 'Erkin Koray', 'Moğollar', 'Selda Bağcan', 'Edip Akbayram'],
  'erkin koray': ['Barış Manço', 'Cem Karaca', 'Moğollar', 'Fikret Kızılok', '3 Hürel'],
  'adamlar': ['Yüzyüzeyken Konuşuruz', 'Dolu Kadehi Ters Tut', 'Madrigal', 'Büyük Ev Ablukada', 'Yaşlı Amca', 'Son Feci Bisiklet'],
  'yüzyüzeyken konuşuruz': ['Adamlar', 'Dolu Kadehi Ters Tut', 'Madrigal', 'Son Feci Bisiklet', 'Yaşlı Amca', 'DKTT'],
  'madrigal': ['Adamlar', 'Yüzyüzeyken Konuşuruz', 'Dolu Kadehi Ters Tut', 'Dedublüman', 'KÖFN', 'Pinhani'],
  'pinhani': ['Madrigal', 'Mor ve Ötesi', 'Duman', 'Yüksek Sadakat', 'Gripin', 'Zakkum'],

  // Türkçe Rap & Hip-Hop
  'ceza': ['Sagopa Kajmer', 'Ezhel', 'Şanışer', 'Contra', 'No.1', 'Gazapizm', 'Allame', 'Jokzilla'],
  'sagopa kajmer': ['Ceza', 'Kolera', 'Şanışer', 'Gazapizm', 'Defkhan', 'No.1', 'Dr. Fuchs'],
  'ezhel': ['BLOK3', 'UZI', 'Motive', 'Ceza', 'Murda', 'Cakal', 'Reckol', 'Lvbel C5'],
  'uzi': ['Motive', 'BLOK3', 'Cakal', 'Reckol', 'Lvbel C5', 'Ezhel', 'Heijan', 'Muti'],
  'motive': ['UZI', 'BLOK3', 'Cakal', 'Ezhel', 'Bebeto', 'Era7capone', 'Ati242'],
  'blok3': ['UZI', 'Motive', 'Cakal', 'Lvbel C5', 'Reckol', 'Ezhel'],
  'şanışer': ['Sokrat ST', 'Ceza', 'Sagopa Kajmer', 'Contra', 'Gazapizm', 'Sehabe'],
  'gazapizm': ['Ceza', 'Sagopa Kajmer', 'No.1', 'Cash Flow', 'Anıl Piyancı'],

  // Türkçe Pop & Alternatif
  'mert demir': ['Mabel Matiz', 'Semicenk', 'Simge', 'KÖFN', 'Emir Can İğrek', 'Zeynep Bastık', 'Melike Şahin'],
  'mabel matiz': ['Mert Demir', 'Semicenk', 'KÖFN', 'Göksel', 'Sıla', 'Ceylan Ertem', 'Melike Şahin', 'Edis'],
  'semicenk': ['Mert Demir', 'Doğu Swag', 'Rast', 'Burak Bulut', 'Kurtuluş Kuş', 'Simge', 'Reynmen'],
  'simge': ['Mert Demir', 'Edis', 'Merve Özbey', 'İrem Derici', 'Zeynep Bastık', 'Hadise', 'Derya Uluğ'],
  'tarkan': ['Kenan Doğulu', 'Mustafa Sandal', 'Murat Boz', 'Edis', 'Yalın', 'Burak Kut'],
  'sezen aksu': ['Yıldız Tilbe', 'Sıla', 'Zuhal Olcay', 'Leman Sam', 'Nükhet Duru', 'Sertab Erener', 'Aşkın Nur Yengi'],
  'edis': ['Tarkan', 'Mert Demir', 'Simge', 'Zeynep Bastık', 'Murat Boz', 'Gülşen'],
  'emir can iğrek': ['Mert Demir', 'Mabel Matiz', 'KÖFN', 'Dedublüman', 'Madrigal', 'Pinhani'],
  'melike şahin': ['Mabel Matiz', 'Mert Demir', 'Ceylan Ertem', 'Gaye Su Akyol', 'Evrencan Gündüz'],

  // Global Hits & Synthwave
  'the weeknd': ['Daft Punk', 'Kavinsky', 'Bruno Mars', 'Post Malone', 'Drake', 'Dua Lipa'],
  'daft punk': ['The Weeknd', 'Kavinsky', 'Justice', 'Gorillaz', 'Empire of the Sun', 'M83'],
  'kavinsky': ['The Weeknd', 'Daft Punk', 'Lazerhawk', 'Carpenter Brut', 'Perturbator', 'Miami Nights 1984'],
  'dua lipa': ['The Weeknd', 'Taylor Swift', 'Billie Eilish', 'Ariana Grande', 'Olivia Rodrigo', 'Lady Gaga']
};

export function getRelatedArtists(artistName: string): string[] {
  if (!artistName) return [];
  const lower = artistName.toLowerCase().trim();
  for (const [key, related] of Object.entries(ARTIST_SIMILARITY_GRAPH)) {
    if (lower.includes(key) || key.includes(lower)) {
      return related;
    }
  }
  return [];
}

// ----------------------------------------------------
// 0. Thematic Music Taxonomy & Classification
// ----------------------------------------------------

export function detectTrackTheme(track: { title?: string; artist?: string; genre?: string; album?: string }): ThematicClassification {
  const text = `${track.title || ''} ${track.artist || ''} ${track.genre || ''} ${track.album || ''}`.toLowerCase();

  // 1. Arabesk / Damar / Fantezi / Taverna
  if (
    text.includes('müslüm') ||
    text.includes('ferdi tayfur') ||
    text.includes('bergen') ||
    text.includes('azer bülbül') ||
    text.includes('cengiz kurtoğlu') ||
    text.includes('ibrahim tatlıses') ||
    text.includes('ebru gündeş') ||
    text.includes('ahmet kaya') ||
    text.includes('orhan gencebay') ||
    text.includes('yıldız tilbe') ||
    text.includes('hakan taşıyan') ||
    text.includes('kibariye') ||
    text.includes('güllü') ||
    text.includes('ümit besen') ||
    text.includes('selahattin özdemir') ||
    text.includes('hakkı bulut') ||
    text.includes('neşet ertaş') ||
    text.includes('arabesk') ||
    text.includes('damar') ||
    text.includes('taverna') ||
    text.includes('fantezi') ||
    text.includes('alaturka')
  ) {
    return {
      category: 'arabesk_damar',
      displayName: 'Arabesk & Damar',
      badge: '🥀 Arabesk Radyosu',
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    };
  }

  // 2. Türkçe Rock & Anadolu Rock
  if (
    text.includes('duman') ||
    text.includes('mor ve ötesi') ||
    text.includes('şebnem ferah') ||
    text.includes('teoman') ||
    text.includes('manga') ||
    text.includes('barış manço') ||
    text.includes('cem karaca') ||
    text.includes('erkin koray') ||
    text.includes('athena') ||
    text.includes('gripin') ||
    text.includes('haluk levent') ||
    text.includes('pentagram') ||
    text.includes('kurban') ||
    text.includes('pinhani') ||
    text.includes('madrigal') ||
    text.includes('yüzyüzeyken') ||
    text.includes('adamlar') ||
    text.includes('dolu kadehi') ||
    text.includes('rock') ||
    text.includes('anadolu rock') ||
    text.includes('metal')
  ) {
    return {
      category: 'turkce_rock',
      displayName: 'Türkçe & Anadolu Rock',
      badge: '🎸 Rock Radyosu',
      color: 'text-red-400 bg-red-500/10 border-red-500/30'
    };
  }

  // 3. Türkçe Rap & Hip-Hop
  if (
    text.includes('ezhel') ||
    text.includes('ceza') ||
    text.includes('sagopa') ||
    text.includes('uzi') ||
    text.includes('motive') ||
    text.includes('şanışer') ||
    text.includes('contra') ||
    text.includes('lvbel c5') ||
    text.includes('cakal') ||
    text.includes('sefo') ||
    text.includes('gazapizm') ||
    text.includes('no.1') ||
    text.includes('blok3') ||
    text.includes('era7capone') ||
    text.includes('rap') ||
    text.includes('hip-hop') ||
    text.includes('trap') ||
    text.includes('drill')
  ) {
    return {
      category: 'turkce_rap',
      displayName: 'Türkçe Rap & Trap',
      badge: '🎤 Rap Radyosu',
      color: 'text-violet-400 bg-violet-500/10 border-violet-500/30'
    };
  }

  // 4. Synthwave & 80s Retro
  if (
    text.includes('the weeknd') ||
    text.includes('kavinsky') ||
    text.includes('daft punk') ||
    text.includes('m83') ||
    text.includes('synthwave') ||
    text.includes('retrowave') ||
    text.includes('80s') ||
    text.includes('cyberpunk')
  ) {
    return {
      category: 'synthwave_retro',
      displayName: 'Synthwave & 80s Retro',
      badge: '⚡ Synthwave Radyosu',
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
    };
  }

  // 5. Lo-Fi & Chill
  if (
    text.includes('wys') ||
    text.includes('kupla') ||
    text.includes('lofi') ||
    text.includes('lo-fi') ||
    text.includes('study') ||
    text.includes('chill') ||
    text.includes('ambient')
  ) {
    return {
      category: 'lofi_chill',
      displayName: 'Lo-Fi & Chill Beats',
      badge: '☕ Lo-Fi Radyosu',
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    };
  }

  // 6. Workout EDM
  if (
    text.includes('neffex') ||
    text.includes('tevvez') ||
    text.includes('workout') ||
    text.includes('hardstyle') ||
    text.includes('edm') ||
    text.includes('gym') ||
    text.includes('electronic')
  ) {
    return {
      category: 'workout_edm',
      displayName: 'Workout & EDM Motivasyon',
      badge: '🔥 Workout Radyosu',
      color: 'text-orange-400 bg-orange-500/10 border-orange-500/30'
    };
  }

  // 7. Türkçe Pop
  if (
    text.includes('mert demir') ||
    text.includes('mabel matiz') ||
    text.includes('köfn') ||
    text.includes('tarkan') ||
    text.includes('sezen aksu') ||
    text.includes('simge') ||
    text.includes('edis') ||
    text.includes('kenan doğulu') ||
    text.includes('zeynep bastık') ||
    text.includes('semicenk') ||
    text.includes('gülşen') ||
    text.includes('pop') ||
    text.includes('akustik')
  ) {
    return {
      category: 'turkce_pop',
      displayName: 'Türkçe Pop & Akustik',
      badge: '✨ Pop Radyosu',
      color: 'text-pink-400 bg-pink-500/10 border-pink-500/30'
    };
  }

  return {
    category: 'general',
    displayName: 'Özel Müzik Teması',
    badge: '📻 Şarkı Radyosu',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
  };
}

// ----------------------------------------------------
// 1. Listening History & Habits Logger
// ----------------------------------------------------

export function recordListeningEvent(track: Track, durationSeconds: number = 30, completed: boolean = false): void {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    let history: ListeningHistoryItem[] = raw ? JSON.parse(raw) : [];

    const newItem: ListeningHistoryItem = {
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      genre: track.genre || 'Pop',
      playedAt: new Date().toISOString(),
      durationSeconds: Math.round(durationSeconds),
      completed
    };

    history = [newItem, ...history.filter(h => !(h.title.toLowerCase() === track.title.toLowerCase() && h.artist.toLowerCase() === track.artist.toLowerCase()))].slice(0, 100);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (err) {
    console.warn('Failed to record listening event:', err);
  }
}

export function getListeningHistory(): ListeningHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getListeningHabitsSummary(): ListeningHabitsSummary {
  const history = getListeningHistory();
  
  if (history.length === 0) {
    return {
      totalPlays: 0,
      totalDurationSeconds: 0,
      topGenres: [
        { genre: 'Türkçe Pop', count: 1, percentage: 35 },
        { genre: 'Türkçe Rock', count: 1, percentage: 30 },
        { genre: 'Arabesk', count: 1, percentage: 20 },
        { genre: 'Türkçe Rap', count: 1, percentage: 15 }
      ],
      topArtists: [
        { artist: 'Mert Demir', count: 1 },
        { artist: 'Duman', count: 1 },
        { artist: 'Müslüm Gürses', count: 1 },
        { artist: 'Ceza', count: 1 }
      ],
      recentTracks: [],
      dominantVibe: 'Keşif Modu'
    };
  }

  let totalDuration = 0;
  const genreCounts: Record<string, number> = {};
  const artistCounts: Record<string, number> = {};

  history.forEach(item => {
    totalDuration += item.durationSeconds || 120;
    
    const genre = item.genre || 'Pop';
    genreCounts[genre] = (genreCounts[genre] || 0) + 1;

    const artist = item.artist || 'Sanatçı';
    artistCounts[artist] = (artistCounts[artist] || 0) + 1;
  });

  const totalPlays = history.length;

  const topGenres = Object.entries(genreCounts)
    .map(([genre, count]) => ({
      genre,
      count,
      percentage: Math.round((count / totalPlays) * 100)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topArtists = Object.entries(artistCounts)
    .map(([artist, count]) => ({ artist, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const recentTracks = history.slice(0, 5).map(h => ({
    title: h.title,
    artist: h.artist,
    playedAt: h.playedAt
  }));

  let dominantVibe = 'Dengeli & Çeşitli';
  if (topGenres.length > 0) {
    dominantVibe = `${topGenres[0].genre} & ${topArtists[0]?.artist || 'Hit'} Ağırlıklı`;
  }

  return {
    totalPlays,
    totalDurationSeconds: totalDuration,
    topGenres,
    topArtists,
    recentTracks,
    dominantVibe
  };
}

// ----------------------------------------------------
// 2. Thematic Song Radio Fetcher (Spotify-style)
// ----------------------------------------------------

export interface SongRadioResult {
  radioTitle: string;
  themeName: string;
  themeCategory: MusicThemeCategory;
  badge: string;
  tracks: Track[];
}

export async function fetchThematicSongRadio(seedTrack: Track, count: number = 15, excludeIds: string[] = []): Promise<SongRadioResult> {
  const classification = detectTrackTheme(seedTrack);
  const excludeSet = new Set(excludeIds.map(id => id.toLowerCase()));
  excludeSet.add(seedTrack.id.toLowerCase());
  excludeSet.add(seedTrack.title.toLowerCase());

  // 1. Try Server API first
  try {
    const res = await fetch('/api/radio/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: seedTrack.title,
        artist: seedTrack.artist,
        genre: seedTrack.genre || classification.displayName,
        count,
        excludeIds: Array.from(excludeSet)
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.tracks) && data.tracks.length > 0) {
        return {
          radioTitle: data.radioTitle || `${seedTrack.artist} Radyosu`,
          themeName: classification.displayName,
          themeCategory: classification.category,
          badge: classification.badge,
          tracks: data.tracks
        };
      }
    }
  } catch (err) {
    console.warn('Song Radio online API failed, executing client-side related artist query:', err);
  }

  // 2. Client-side Spotify-like Related Artist Query
  const related = getRelatedArtists(seedTrack.artist);
  const searchQueries = [
    seedTrack.artist,
    ...related.slice(0, 4),
    classification.displayName
  ].filter(Boolean);

  const radioTracks: Track[] = [];
  const seenIds = new Set<string>();

  for (const query of searchQueries) {
    if (radioTracks.length >= count) break;
    try {
      const found = await searchUniversalTracks(query);
      for (const t of found) {
        const normTitle = t.title.toLowerCase().trim();
        const normId = t.id.toLowerCase().trim();
        if (
          !seenIds.has(normId) &&
          !excludeSet.has(normId) &&
          !excludeSet.has(normTitle) &&
          !normTitle.includes(seedTrack.title.toLowerCase().trim())
        ) {
          seenIds.add(normId);
          radioTracks.push({
            ...t,
            recommendationReason: `${seedTrack.artist} tarzı Spotify benzeri radyo parçası`,
            matchScore: Math.floor(90 + Math.random() * 9)
          });
        }
      }
    } catch {}
  }

  // Natural radio shuffle
  for (let i = radioTracks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [radioTracks[i], radioTracks[j]] = [radioTracks[j], radioTracks[i]];
  }

  return {
    radioTitle: `📻 ${seedTrack.artist || seedTrack.title} Radyosu`,
    themeName: classification.displayName,
    themeCategory: classification.category,
    badge: classification.badge,
    tracks: radioTracks.slice(0, count)
  };
}

// ----------------------------------------------------
// 3. Smart Shuffle Mode Preference
// ----------------------------------------------------

export function getSmartShuffleEnabled(): boolean {
  try {
    const val = localStorage.getItem(SMART_SHUFFLE_KEY);
    return val !== null ? JSON.parse(val) : true;
  } catch {
    return true;
  }
}

export function setSmartShuffleEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SMART_SHUFFLE_KEY, JSON.stringify(enabled));
  } catch {}
}

// ----------------------------------------------------
// 4. Smart AI Recommendations Fetcher (Spotify-style)
// ----------------------------------------------------

export async function fetchSmartRecommendations(options: SmartRecommendationOptions = {}): Promise<Track[]> {
  const habits = getListeningHabitsSummary();
  const history = getListeningHistory();
  const playlistTracks = options.playlistTracks || [];
  const count = options.count || 12;

  // Build exclusion list
  const existingSet = new Set<string>();
  for (const t of [...history, ...playlistTracks]) {
    if (t.title) existingSet.add(t.title.toLowerCase().trim());
  }

  // 1. Try Server API
  try {
    const payload = {
      history: history.slice(0, 10),
      topGenres: habits.topGenres.map(g => g.genre),
      topArtists: habits.topArtists.map(a => a.artist),
      mood: options.mood || 'all',
      count,
      playlistTracks
    };

    const res = await fetch('/api/recommendations/smart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.recommendations) && data.recommendations.length > 0) {
        return data.recommendations;
      }
    }
  } catch (err) {
    console.warn('Smart recommendations server request failed, running client-side recommendation engine:', err);
  }

  // 2. Client-side Intelligent Recommendation Engine
  let searchSeeds: string[] = [];

  if (playlistTracks.length > 0) {
    // Playlist Context: Find dominant artists and genres in the playlist
    const artistCounts: Record<string, number> = {};
    const genreCounts: Record<string, number> = {};

    playlistTracks.forEach(t => {
      if (t.artist) artistCounts[t.artist] = (artistCounts[t.artist] || 0) + 1;
      if (t.genre) genreCounts[t.genre] = (genreCounts[t.genre] || 0) + 1;
    });

    const topPlaylistArtists = Object.entries(artistCounts).sort((a, b) => b[1] - a[1]).map(e => e[0]);
    const topPlaylistGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).map(e => e[0]);

    // Also get related artists for the top playlist artists
    const relatedPeers: string[] = [];
    topPlaylistArtists.slice(0, 3).forEach(art => {
      relatedPeers.push(...getRelatedArtists(art));
    });

    searchSeeds = [
      ...topPlaylistArtists.slice(0, 2),
      ...relatedPeers.slice(0, 3),
      ...topPlaylistGenres.slice(0, 2)
    ].filter(Boolean);
  } else if (options.mood && options.mood !== 'all') {
    // Mood-specific query
    const moodMap: Record<string, string[]> = {
      arabesk: ['Müslüm Gürses', 'Ferdi Tayfur', 'Bergen', 'Azer Bülbül', 'Cengiz Kurtoğlu'],
      turkish: ['Mert Demir', 'Mabel Matiz', 'Semicenk', 'Simge', 'Edis'],
      rock: ['Duman', 'Mor ve Ötesi', 'Şebnem Ferah', 'Teoman', 'Adamlar'],
      rap: ['Ezhel', 'Ceza', 'Sagopa Kajmer', 'UZI', 'Motive', 'BLOK3'],
      energetic: ['Workout Hits', 'Tevvez', 'Hardstyle', 'EDM Festival', 'Neffex'],
      chill: ['Lo-Fi Beats', 'Chillhop', 'Acoustic Pop', 'Study Beats'],
      driving: ['Synthwave', 'The Weeknd', 'Kavinsky', 'Nightcall', 'Retrowave']
    };
    searchSeeds = moodMap[options.mood] || ['Türkçe Pop'];
  } else {
    // Habits / Global recommendations
    searchSeeds = [
      ...habits.topArtists.slice(0, 2).map(a => a.artist),
      ...habits.topGenres.slice(0, 2).map(g => g.genre),
      'Mert Demir',
      'Duman',
      'Müslüm Gürses',
      'Ezhel'
    ].filter(Boolean);
  }

  const recommendations: Track[] = [];
  const seenIds = new Set<string>();

  for (const seed of searchSeeds) {
    if (recommendations.length >= count) break;
    try {
      const found = await searchUniversalTracks(seed);
      for (const t of found) {
        const normTitle = t.title.toLowerCase().trim();
        const normId = t.id.toLowerCase().trim();
        if (!seenIds.has(normId) && !existingSet.has(normTitle)) {
          seenIds.add(normId);
          recommendations.push({
            ...t,
            recommendationReason: `${seed} benzeri çalma listesi önerisi`,
            matchScore: Math.floor(91 + Math.random() * 8)
          });
        }
      }
    } catch {}
  }

  // Shuffle for fresh listening discovery
  for (let i = recommendations.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [recommendations[i], recommendations[j]] = [recommendations[j], recommendations[i]];
  }

  return recommendations.slice(0, count);
}

// ----------------------------------------------------
// 5. Smart Autoplay Selector (Next Track in Flow)
// ----------------------------------------------------

export function selectSmartThematicNextTrack(
  currentTrack: Track,
  pool: Track[],
  playedTrackIds: Set<string>
): Track | null {
  if (!pool || pool.length === 0) return null;

  const currentTheme = detectTrackTheme(currentTrack);
  const relatedArtists = getRelatedArtists(currentTrack.artist).map(a => a.toLowerCase());

  // Filter unplayed tracks
  const unplayed = pool.filter(t => !playedTrackIds.has(t.id) && t.id !== currentTrack.id);
  const candidatePool = unplayed.length > 0 ? unplayed : pool.filter(t => t.id !== currentTrack.id);

  if (candidatePool.length === 0) return null;

  // Score each candidate
  const scored = candidatePool.map(candidate => {
    let score = 0;
    const candidateTheme = detectTrackTheme(candidate);

    // Same category match
    if (candidateTheme.category === currentTheme.category && currentTheme.category !== 'general') {
      score += 50;
    }

    // Same artist
    if (candidate.artist && currentTrack.artist && candidate.artist.toLowerCase() === currentTrack.artist.toLowerCase()) {
      score += 40;
    }

    // Related artist match
    if (candidate.artist && relatedArtists.some(r => candidate.artist.toLowerCase().includes(r))) {
      score += 35;
    }

    // Same genre tag
    if (candidate.genre && currentTrack.genre && candidate.genre.toLowerCase() === currentTrack.genre.toLowerCase()) {
      score += 20;
    }

    // Popularity booster
    score += (candidate.popularity || 50) * 0.1;

    // Small random perturbation for variety
    score += Math.random() * 10;

    return { track: candidate, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.track || null;
}

// ----------------------------------------------------
// 6. Endless Autoplay Setting
// ----------------------------------------------------

export function getEndlessAutoplay(): boolean {
  try {
    const val = localStorage.getItem(ENDLESS_AUTOPLAY_KEY);
    return val !== null ? JSON.parse(val) : true;
  } catch {
    return true;
  }
}

export function setEndlessAutoplay(enabled: boolean): void {
  try {
    localStorage.setItem(ENDLESS_AUTOPLAY_KEY, JSON.stringify(enabled));
  } catch {}
}

// ----------------------------------------------------
// 7. Personal PIN & Master Passkey (Private Mode)
// ----------------------------------------------------

export function getStoredPIN(): string | null {
  try {
    return localStorage.getItem(PIN_KEY);
  } catch {
    return null;
  }
}

export function setStoredPIN(pin: string | null): void {
  try {
    if (pin && pin.trim().length >= 4) {
      localStorage.setItem(PIN_KEY, pin.trim());
    } else {
      localStorage.removeItem(PIN_KEY);
      localStorage.removeItem(LOCK_STATE_KEY);
    }
  } catch {}
}

export function isAppLocked(): boolean {
  try {
    const hasPin = Boolean(localStorage.getItem(PIN_KEY));
    if (!hasPin) return false;
    const isLocked = localStorage.getItem(LOCK_STATE_KEY);
    return isLocked !== 'false';
  } catch {
    return false;
  }
}

export function setAppLockedState(locked: boolean): void {
  try {
    localStorage.setItem(LOCK_STATE_KEY, locked ? 'true' : 'false');
  } catch {}
}

export function verifyPIN(entered: string): boolean {
  const stored = getStoredPIN();
  if (!stored) return true;
  return stored === entered.trim();
}

// ----------------------------------------------------
// 8. Full Personal Data Export / Import (Ownership)
// ----------------------------------------------------

export function exportPersonalDataJSON(playlists: Playlist[]): void {
  const history = getListeningHistory();
  const habits = getListeningHabitsSummary();

  const backupData = {
    app: 'SoundPulse',
    version: '2.0.0',
    exportDate: new Date().toISOString(),
    playlists,
    listeningHistory: history,
    listeningHabits: habits,
    settings: {
      hasPersonalPin: Boolean(getStoredPIN()),
      endlessAutoplay: getEndlessAutoplay()
    }
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `soundpulse_kisisel_yedek_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseImportDataJSON(jsonString: string): { playlists?: Playlist[]; history?: ListeningHistoryItem[] } | null {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed && (Array.isArray(parsed.playlists) || Array.isArray(parsed.listeningHistory))) {
      return {
        playlists: parsed.playlists,
        history: parsed.listeningHistory
      };
    }
    return null;
  } catch (err) {
    console.error('Failed to parse backup JSON:', err);
    return null;
  }
}
