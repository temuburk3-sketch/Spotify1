import { Track, Playlist, ListeningHistoryItem, ListeningHabitsSummary, SmartRecommendationOptions } from '../types';

const HISTORY_KEY = 'soundpulse_listening_history';
const PIN_KEY = 'soundpulse_user_pin';
const LOCK_STATE_KEY = 'soundpulse_is_locked';
const ENDLESS_AUTOPLAY_KEY = 'soundpulse_endless_autoplay';

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
// 2. Smart AI Recommendations Fetcher
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
