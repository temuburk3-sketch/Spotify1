import { Track } from '../types';

export interface LyricsResponse {
  title: string;
  artist: string;
  synced: boolean;
  timedLyrics: { time: number; text: string }[];
  plainLyrics?: string;
  source?: string;
}

const clientLyricsCache = new Map<string, LyricsResponse>();

/**
 * Fetch real synchronized lyrics for any song (Turkish or International)
 */
export async function fetchLyricsForTrack(track: Track): Promise<LyricsResponse> {
  if (!track || !track.title) {
    return {
      title: '',
      artist: '',
      synced: false,
      timedLyrics: [],
      plainLyrics: ''
    };
  }

  const cacheKey = `${track.title.toLowerCase().trim()}___${(track.artist || '').toLowerCase().trim()}`;
  if (clientLyricsCache.has(cacheKey)) {
    return clientLyricsCache.get(cacheKey)!;
  }

  try {
    const params = new URLSearchParams({
      title: track.title,
      artist: track.artist || '',
      duration: String(track.duration || 200)
    });

    const res = await fetch(`/api/lyrics?${params.toString()}`);
    if (res.ok) {
      const data: LyricsResponse = await res.json();
      if (data && Array.isArray(data.timedLyrics) && data.timedLyrics.length > 0) {
        clientLyricsCache.set(cacheKey, data);
        return data;
      }
    }
  } catch (err) {
    console.warn('Lyrics fetch warning:', err);
  }

  // Fallback if network fails
  const fallback: LyricsResponse = {
    title: track.title,
    artist: track.artist || 'Sanatçı',
    synced: true,
    timedLyrics: [
      { time: 0, text: `🎵 ${track.title}` },
      { time: 6, text: `${track.artist}` },
      { time: 18, text: 'Melodinin ve ritmin tadını çıkar...' },
      { time: 35, text: 'SoundPulse Senkronize Şarkı Sözleri' },
      { time: 60, text: 'Müzik ruhun gıdasıdır...' },
      { time: 90, text: 'Arka planda ve çevrimdışı çalmaya hazır' }
    ],
    plainLyrics: `${track.title}\n${track.artist}\n\nSoundPulse`,
    source: 'local_fallback'
  };

  clientLyricsCache.set(cacheKey, fallback);
  return fallback;
}
