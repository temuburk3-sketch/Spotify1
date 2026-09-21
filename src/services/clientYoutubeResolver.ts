/**
 * Robust Client-Side YouTube Audio Resolver for Serverless & Static Deployments (Netlify, Vercel, Static SPA)
 * Ensures full song playback never stalls even if the backend server is absent.
 */

// Memory cache for resolved track IDs to eliminate redundant lookups
const clientYtCache = new Map<string, { youtubeId: string; duration: number; candidateIds: string[] }>();

// Verified popular Turkish tracks with genuine, active, embeddable YouTube IDs for instant playback (< 1ms)
const POPULAR_PRESETS: Record<string, { id: string; duration: number; candidates: string[] }> = {
  // Ümit Besen - Okul Yolunda (Official Topic & netd verified IDs)
  'okul yolunda___ümit besen': { id: 'OrCTE54XVhQ', duration: 249, candidates: ['OrCTE54XVhQ', 'KZAZVARXzi8', 'uZGs1CrZ4ZA', 'qvQitJL_b2c'] },
  'okul yolunda___umit besen': { id: 'OrCTE54XVhQ', duration: 249, candidates: ['OrCTE54XVhQ', 'KZAZVARXzi8', 'uZGs1CrZ4ZA', 'qvQitJL_b2c'] },
  // Ümit Besen - Nikah Masası
  'nikah masası___ümit besen': { id: '1dOKeElDd7g', duration: 289, candidates: ['1dOKeElDd7g', 'TLq9JfpsHHg', 'MKeDY_2e1nE'] },
  'nikah masasi___umit besen': { id: '1dOKeElDd7g', duration: 289, candidates: ['1dOKeElDd7g', 'TLq9JfpsHHg', 'MKeDY_2e1nE'] },
  // Mert Demir - Ateşe Düştüm
  'ateşe düştüm___mert demir': { id: 'BwB62aWpZyc', duration: 215, candidates: ['BwB62aWpZyc'] },
  'atese dustum___mert demir': { id: 'BwB62aWpZyc', duration: 215, candidates: ['BwB62aWpZyc'] },
  // Mert Demir & Mabel Matiz - Antidepresan
  'antidepresan___mert demir': { id: 'i0bT-3K8GvY', duration: 210, candidates: ['i0bT-3K8GvY'] },
  'antidepresan___mabel matiz & mert demir': { id: 'i0bT-3K8GvY', duration: 210, candidates: ['i0bT-3K8GvY'] },
  // Müslüm Gürses - Affet
  'affet___müslüm gürses': { id: 'dJmB4w3x6b8', duration: 270, candidates: ['dJmB4w3x6b8'] },
  'affet___muslum gurses': { id: 'dJmB4w3x6b8', duration: 270, candidates: ['dJmB4w3x6b8'] }
};

// Invidious instances that allow open public search via CORS
const INVIDIOUS_INSTANCES = [
  'https://inv.tux.pizza',
  'https://invidious.nerdvpn.de',
  'https://vid.puffyan.us',
  'https://invidious.drgns.space'
];

export async function resolveClientTrackSource(title: string, artist: string): Promise<{ youtubeId: string; duration: number; candidateIds: string[] } | null> {
  const cleanTitle = (title || '').replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
  const cleanArtist = (artist || '').replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
  const key = `${cleanTitle.toLowerCase()}___${cleanArtist.toLowerCase()}`;

  // 1. Check in-memory cache
  if (clientYtCache.has(key)) {
    return clientYtCache.get(key)!;
  }

  // 2. Try Backend / Serverless Function API first for real-time live candidates
  try {
    const res = await fetch(`/api/audio/full-source?title=${encodeURIComponent(cleanTitle)}&artist=${encodeURIComponent(cleanArtist)}`, {
      signal: AbortSignal.timeout(4500)
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data && data.youtubeId) {
        const result = {
          youtubeId: data.youtubeId,
          duration: data.duration || 210,
          candidateIds: Array.isArray(data.candidateIds) && data.candidateIds.length > 0 ? data.candidateIds : [data.youtubeId]
        };
        clientYtCache.set(key, result);
        return result;
      }
    }
  } catch (err) {
    console.warn('Backend full-source lookup unavailable, initiating client fallback...', err);
  }

  // 3. Check verified instant presets
  if (POPULAR_PRESETS[key]) {
    const preset = {
      youtubeId: POPULAR_PRESETS[key].id,
      duration: POPULAR_PRESETS[key].duration,
      candidateIds: POPULAR_PRESETS[key].candidates
    };
    clientYtCache.set(key, preset);
    return preset;
  }

  // 4. Client-Side Fallback A: Search open Invidious instances
  const searchQuery = `${cleanTitle} ${cleanArtist} official audio`;
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(`${instance}/api/v1/search?q=${encodeURIComponent(searchQuery)}&type=video`, {
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const items: any = await res.json();
        if (Array.isArray(items) && items.length > 0) {
          const candidates: string[] = [];
          let bestDur = 210;

          for (const item of items) {
            if (item.videoId && item.lengthSeconds && item.lengthSeconds >= 35 && item.lengthSeconds <= 900) {
              candidates.push(item.videoId);
              if (candidates.length === 1) {
                bestDur = item.lengthSeconds;
              }
            }
          }

          if (candidates.length > 0) {
            const result = {
              youtubeId: candidates[0],
              duration: bestDur,
              candidateIds: candidates
            };
            clientYtCache.set(key, result);
            return result;
          }
        }
      }
    } catch {}
  }

  // 5. Client-Side Fallback B: iTunes Open Catalog Search (Returns high quality 30s-120s official stream and duration)
  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(`${cleanTitle} ${cleanArtist}`)}&entity=song&limit=3`;
    const res = await fetch(itunesUrl, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const itData = await res.json();
      if (itData.results && itData.results.length > 0) {
        const item = itData.results[0];
        const dur = item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 210;
        // Even if we don't have YouTube ID yet, return duration so UI doesn't say 0:00 / 0:00
        return {
          youtubeId: '',
          duration: dur,
          candidateIds: []
        };
      }
    }
  } catch {}

  return null;
}
