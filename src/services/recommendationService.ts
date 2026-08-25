import { Track, Playlist, ListeningHistoryItem, ListeningHabitsSummary, SmartRecommendationOptions } from '../types';

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
      badge: '📻 Arabesk Radyosu',
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
    text.includes('anadolu rock')
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
    text.includes('80s')
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
    text.includes('gym')
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

    // Add to start and cap at 100 entries
    history = [newItem, ...history.filter(h => !(h.title === track.title && h.artist === track.artist))].slice(0, 100);
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
        { genre: 'Türkçe Pop', count: 12, percentage: 40 },
        { genre: 'Synthwave', count: 8, percentage: 25 },
        { genre: 'Anadolu Rock', count: 6, percentage: 20 },
        { genre: 'Lo-Fi', count: 4, percentage: 15 }
      ],
      topArtists: [
        { artist: 'Mert Demir', count: 10 },
        { artist: 'KÖFN', count: 8 },
        { artist: 'Barış Manço', count: 6 },
        { artist: 'The Weeknd', count: 5 }
      ],
      recentTracks: [
        { title: 'Antidepresan', artist: 'Mert Demir, Mabel Matiz', playedAt: new Date().toISOString() },
        { title: 'Bi’ Tek Ben Anlarım', artist: 'KÖFN', playedAt: new Date().toISOString() },
        { title: 'Gülpembe', artist: 'Barış Manço', playedAt: new Date().toISOString() }
      ],
      dominantVibe: 'Enerjik & Ritmik Pop / Synth'
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

export async function fetchThematicSongRadio(seedTrack: Track, count: number = 10, excludeTitles: string[] = []): Promise<SongRadioResult> {
  const classification = detectTrackTheme(seedTrack);

  try {
    const res = await fetch('/api/radio/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: seedTrack.title,
        artist: seedTrack.artist,
        genre: seedTrack.genre || classification.displayName,
        count,
        excludeTitles
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.tracks) && data.tracks.length > 0) {
        return {
          radioTitle: data.radioTitle || `📻 ${seedTrack.artist || seedTrack.title} Radyosu`,
          themeName: data.themeName || classification.displayName,
          themeCategory: classification.category,
          badge: classification.badge,
          tracks: data.tracks
        };
      }
    }
  } catch (err) {
    console.warn('Song Radio online API failed, using curated thematic pool:', err);
  }

  // Curated Fallbacks based on category
  let fallbackTracks: Track[] = [];

  if (classification.category === 'arabesk_damar') {
    fallbackTracks = [
      {
        id: `rad_arb_1`,
        title: 'Affet',
        artist: 'Müslüm Gürses',
        album: 'Aşk Tesadüfleri Sever',
        duration: 268,
        coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600',
        audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/fb/3c/74/fb3c7480-781d-1830-3edd-fd15bdb23406/mzaf_17024654962565086082.plus.aac.p.m4a',
        youtubeId: 'qQWwN5q6U7g',
        genre: 'Arabesk / Damar',
        recommendationReason: 'Müslüm Baba’dan unutulmaz bir arabesk rock şaheseri.',
        matchScore: 99,
        addedAt: new Date().toISOString()
      },
      {
        id: `rad_arb_2`,
        title: 'Nilüfer',
        artist: 'Müslüm Gürses',
        album: 'Aşk Tesadüfleri Sever',
        duration: 250,
        coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600',
        audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/15/84/08/15840844-8e98-e477-10dd-c2a82e30b2a3/mzaf_17204737277130849361.plus.aac.p.m4a',
        youtubeId: '6vYnO6zMh4w',
        genre: 'Arabesk / Damar',
        recommendationReason: 'Derin keman partisyonları ve içe işleyen arabesk vokaller.',
        matchScore: 98,
        addedAt: new Date().toISOString()
      },
      {
        id: `rad_arb_3`,
        title: 'Ben De Özledim',
        artist: 'Ferdi Tayfur',
        album: 'Ben De Özledim',
        duration: 245,
        coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600',
        audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview116/v4/ae/9d/83/ae9d833e-c551-a08e-f9f3-1cb68138d233/mzaf_2262890875392296175.plus.aac.p.m4a',
        youtubeId: '3tX9_K6Tf_8',
        genre: 'Arabesk / Damar',
        recommendationReason: 'Ferdi Tayfur’un elektro-bağlama ve hüzün dolu klasiği.',
        matchScore: 97,
        addedAt: new Date().toISOString()
      },
      {
        id: `rad_arb_4`,
        title: 'Sen Affetsen Ben Affetmem',
        artist: 'Bergen',
        album: 'Acıların Kadını',
        duration: 275,
        coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600',
        audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview126/v4/3c/a3/d1/3ca3d19c-d799-12af-0019-fd694b91812a/mzaf_11591350407176047081.plus.aac.p.m4a',
        youtubeId: '4yVbUv6HkP8',
        genre: 'Arabesk / Damar',
        recommendationReason: 'Acıların Kadını Bergen’den Türk arabesk tarihine geçen başyapıt.',
        matchScore: 98,
        addedAt: new Date().toISOString()
      },
      {
        id: `rad_arb_5`,
        title: 'Duyanlara Duymayanlara',
        artist: 'Cengiz Kurtoğlu',
        album: 'Unutulmayanlar',
        duration: 260,
        coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600',
        audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/17/b4/8f/17b48f9a-0b93-6bb8-fe1d-3a16623c2cfb/mzaf_9560252727299052414.plus.aac.p.m4a',
        youtubeId: 'W8G7vL2bCsc',
        genre: 'Taverna / Arabesk',
        recommendationReason: 'Cengiz Kurtoğlu ile taverna ve arabesk nostaljisi.',
        matchScore: 96,
        addedAt: new Date().toISOString()
      }
    ];
  } else if (classification.category === 'turkce_rock') {
    fallbackTracks = [
      {
        id: `rad_rck_1`,
        title: 'Aman Aman',
        artist: 'Duman',
        album: 'Seni Kendime Sakladım',
        duration: 245,
        coverUrl: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=600',
        audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/fb/3c/74/fb3c7480-781d-1830-3edd-fd15bdb23406/mzaf_17024654962565086082.plus.aac.p.m4a',
        youtubeId: 'b_fLkJp2xQw',
        genre: 'Türkçe Rock',
        recommendationReason: 'Duman’ın elektro gitar riffleri ve vokalleri.',
        matchScore: 98,
        addedAt: new Date().toISOString()
      },
      {
        id: `rad_rck_2`,
        title: 'Bir Derdim Var',
        artist: 'Mor ve Ötesi',
        album: 'Dünya Yalan Söylüyor',
        duration: 218,
        coverUrl: 'https://images.unsplash.com/photo-1464375117522-1311d6a5b81f?w=600',
        audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/15/84/08/15840844-8e98-e477-10dd-c2a82e30b2a3/mzaf_17204737277130849361.plus.aac.p.m4a',
        youtubeId: 'v8H9gW7Fk_8',
        genre: 'Türkçe Rock',
        recommendationReason: 'Efsanevi Türk rock marşı.',
        matchScore: 99,
        addedAt: new Date().toISOString()
      },
      {
        id: `rad_rck_3`,
        title: 'Sil Baştan',
        artist: 'Şebnem Ferah',
        album: 'Kelimeler Yetse',
        duration: 310,
        coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600',
        audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview116/v4/ae/9d/83/ae9d833e-c551-a08e-f9f3-1cb68138d233/mzaf_2262890875392296175.plus.aac.p.m4a',
        youtubeId: 'N8f9wKl2mPq',
        genre: 'Türkçe Rock',
        recommendationReason: 'Şebnem Ferah’ın görkemli sesi ve solosu.',
        matchScore: 97,
        addedAt: new Date().toISOString()
      }
    ];
  } else if (classification.category === 'turkce_rap') {
    fallbackTracks = [
      {
        id: `rad_rap_1`,
        title: 'Suspus',
        artist: 'Ceza',
        album: 'Suspus',
        duration: 254,
        coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600',
        audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview126/v4/3c/a3/d1/3ca3d19c-d799-12af-0019-fd694b91812a/mzaf_11591350407176047081.plus.aac.p.m4a',
        youtubeId: 'H8kM3wW8xP0',
        genre: 'Türkçe Rap',
        recommendationReason: 'Türkçe rapin teknik flow şaheseri.',
        matchScore: 99,
        addedAt: new Date().toISOString()
      },
      {
        id: `rad_rap_2`,
        title: 'Neyim Var Ki',
        artist: 'Ceza ft. Sagopa Kajmer',
        album: 'Rapstar',
        duration: 215,
        coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600',
        audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/17/b4/8f/17b48f9a-0b93-6bb8-fe1d-3a16623c2cfb/mzaf_9560252727299052414.plus.aac.p.m4a',
        youtubeId: 'Jk7F9vW8xL0',
        genre: 'Türkçe Rap',
        recommendationReason: 'Tüm zamanların en çok dinlenen kült rap klasiği.',
        matchScore: 99,
        addedAt: new Date().toISOString()
      }
    ];
  } else {
    fallbackTracks = [
      {
        id: `rad_pop_1`,
        title: 'Karakol',
        artist: 'Mabel Matiz',
        album: 'Fatih',
        duration: 234,
        coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600',
        audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/fb/3c/74/fb3c7480-781d-1830-3edd-fd15bdb23406/mzaf_17024654962565086082.plus.aac.p.m4a',
        genre: 'Türkçe Pop',
        recommendationReason: 'Melodik synthesizer altyapısı ve modern pop vokalleri.',
        matchScore: 98,
        addedAt: new Date().toISOString()
      },
      {
        id: `rad_pop_2`,
        title: 'Ateşe Düştüm',
        artist: 'Mert Demir',
        album: 'Ateşe Düştüm',
        duration: 231,
        coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/43/39/bb/4339bbf7-d2c3-22ed-90e7-9a14416780c8/196922638558_Cover.jpg/600x600bb.jpg',
        audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview126/v4/3c/a3/d1/3ca3d19c-d799-12af-0019-fd694b91812a/mzaf_11591350407176047081.plus.aac.p.m4a',
        genre: 'Akustik / Pop',
        recommendationReason: 'Akustik gitar ve samimi vokal altyapısı.',
        matchScore: 98,
        addedAt: new Date().toISOString()
      }
    ];
  }

  return {
    radioTitle: `📻 ${seedTrack.artist || seedTrack.title} Radyosu`,
    themeName: classification.displayName,
    themeCategory: classification.category,
    badge: classification.badge,
    tracks: fallbackTracks
  };
}

// ----------------------------------------------------
// 3. Smart Thematic Next Track Selector
// ----------------------------------------------------

export function selectSmartThematicNextTrack(
  currentTrack: Track | null,
  availableTracks: Track[],
  playedTrackIds: Set<string> = new Set()
): Track | null {
  if (!availableTracks || availableTracks.length === 0) return null;
  if (!currentTrack) return availableTracks[0];

  const currentTheme = detectTrackTheme(currentTrack);

  // Unplayed tracks in the playlist
  const unplayed = availableTracks.filter(t => t.id !== currentTrack.id && !playedTrackIds.has(t.id));
  const pool = unplayed.length > 0 ? unplayed : availableTracks.filter(t => t.id !== currentTrack.id);

  if (pool.length === 0) return availableTracks[0];

  // 1. Exact theme match
  const exactMatches = pool.filter(t => {
    const tTheme = detectTrackTheme(t);
    return tTheme.category === currentTheme.category;
  });

  if (exactMatches.length > 0) {
    const randomIdx = Math.floor(Math.random() * exactMatches.length);
    return exactMatches[randomIdx];
  }

  // 2. Same artist match
  const sameArtist = pool.filter(t => t.artist.toLowerCase() === currentTrack.artist.toLowerCase());
  if (sameArtist.length > 0) {
    return sameArtist[0];
  }

  // 3. Fallback to random unplayed
  const randomIdx = Math.floor(Math.random() * pool.length);
  return pool[randomIdx];
}

// ----------------------------------------------------
// 4. Smart Shuffle Mode Preference
// ----------------------------------------------------

export function getSmartShuffleEnabled(): boolean {
  try {
    const val = localStorage.getItem(SMART_SHUFFLE_KEY);
    return val !== null ? JSON.parse(val) : true; // default true for Spotify-style smart thematic shuffle
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
// 5. Smart AI Recommendations Fetcher
// ----------------------------------------------------

export async function fetchSmartRecommendations(options: SmartRecommendationOptions = {}): Promise<Track[]> {
  try {
    const habits = getListeningHabitsSummary();
    const history = getListeningHistory();

    const payload = {
      history: history.slice(0, 10),
      topGenres: habits.topGenres.map(g => g.genre),
      topArtists: habits.topArtists.map(a => a.artist),
      mood: options.mood || 'all',
      count: options.count || 8,
      playlistTracks: options.playlistTracks || []
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
    console.warn('Smart recommendations fetch failed, using offline fallback:', err);
  }

  // Fallback if network/offline
  return [
    {
      id: `fallback_rec_1`,
      title: 'Karakol',
      artist: 'Mabel Matiz',
      album: 'Fatih',
      duration: 234,
      coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600',
      audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/fb/3c/74/fb3c7480-781d-1830-3edd-fd15bdb23406/mzaf_17024654962565086082.plus.aac.p.m4a',
      genre: 'Türkçe Pop',
      recommendationReason: 'Antidepresan ve Mert Demir dinlemelerinizle eşleşen modern melodik altyapı.',
      matchScore: 98,
      addedAt: new Date().toISOString()
    },
    {
      id: `fallback_rec_2`,
      title: 'Save Your Tears',
      artist: 'The Weeknd',
      album: 'After Hours',
      duration: 215,
      coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600',
      audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/17/b4/8f/17b48f9a-0b93-6bb8-fe1d-3a16623c2cfb/mzaf_9560252727299052414.plus.aac.p.m4a',
      genre: 'Synthwave',
      recommendationReason: 'Blinding Lights sevenlere özel 80ler esintili ritmik başyapıt.',
      matchScore: 99,
      addedAt: new Date().toISOString()
    }
  ];
}

// ----------------------------------------------------
// 3. Endless Autoplay Setting
// ----------------------------------------------------

export function getEndlessAutoplay(): boolean {
  try {
    const val = localStorage.getItem(ENDLESS_AUTOPLAY_KEY);
    return val !== null ? JSON.parse(val) : true; // default true for smart autoplay
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
// 4. Personal PIN & Master Passkey (Private Mode)
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
// 5. Full Personal Data Export / Import (Ownership)
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
