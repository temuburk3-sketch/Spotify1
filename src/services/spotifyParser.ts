import { Track } from '../types';

export interface SpotifyParsedResult {
  type: 'playlist' | 'track' | 'album' | 'artist' | 'episode' | 'show' | 'unknown';
  id: string;
  url: string;
  title: string;
  authorName?: string;
  thumbnailUrl?: string;
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
 * Searches iTunes Search API directly from client/backend for original song audio preview & high-res artwork
 */
export async function searchOriginalAudio(title: string, artist = ''): Promise<{
  audioUrl?: string;
  coverUrl?: string;
  duration?: number;
  album?: string;
  artist?: string;
} | null> {
  try {
    const cleanTitle = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
    const cleanArtist = artist.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
    const query = `${cleanTitle} ${cleanArtist}`.trim();

    // 1. Try backend API first if running full-stack
    try {
      const apiRes = await fetch(`/api/audio/match?title=${encodeURIComponent(cleanTitle)}&artist=${encodeURIComponent(cleanArtist)}`);
      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data && (data.previewUrl || data.audioUrl)) {
          return {
            audioUrl: data.previewUrl || data.audioUrl,
            coverUrl: data.coverUrl,
            duration: data.duration,
            album: data.album,
            artist: data.artist
          };
        }
      }
    } catch {}

    // 2. Direct iTunes Open CORS API
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`;
    const res = await fetch(itunesUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        return {
          audioUrl: item.previewUrl,
          coverUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : undefined,
          duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : undefined,
          album: item.collectionName,
          artist: item.artistName
        };
      }
    }

    // 3. Direct Audius Open API
    try {
      const audiusUrl = `https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=SOUNDPULSE`;
      const aRes = await fetch(audiusUrl);
      if (aRes.ok) {
        const aData = await aRes.json();
        if (aData.data && aData.data.length > 0) {
          const track = aData.data[0];
          return {
            audioUrl: `https://discoveryprovider.audius.co/v1/tracks/${track.id}/stream?app_name=SOUNDPULSE`,
            coverUrl: track.artwork?.['480x480'] || track.artwork?.['150x150'],
            duration: track.duration,
            album: track.title,
            artist: track.user?.name || artist
          };
        }
      }
    } catch {}
  } catch (err) {
    console.warn('Original audio search note:', err);
  }
  return null;
}

/**
 * Robust fetch helper that tries direct fetch then multiple reliable CORS proxies
 */
async function fetchWithCorsFallback(targetUrl: string): Promise<string | null> {
  // 1. Direct fetch
  try {
    const res = await fetch(targetUrl);
    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 50) return text;
    }
  } catch {}

  // 2. AllOrigins Proxy
  try {
    const pUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
    const pRes = await fetch(pUrl);
    if (pRes.ok) {
      const text = await pRes.text();
      if (text && text.length > 50) return text;
    }
  } catch {}

  // 3. CorsProxy.io
  try {
    const pUrl = `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`;
    const pRes = await fetch(pUrl);
    if (pRes.ok) {
      const text = await pRes.text();
      if (text && text.length > 50) return text;
    }
  } catch {}

  // 4. CodeTabs Proxy
  try {
    const pUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
    const pRes = await fetch(pUrl);
    if (pRes.ok) {
      const text = await pRes.text();
      if (text && text.length > 50) return text;
    }
  } catch {}

  return null;
}

/**
 * Parses any Spotify URL (playlist, track, album, etc.) and extracts real tracklist + genuine audio
 */
export async function parseSpotifyUrl(urlInput: string): Promise<SpotifyParsedResult | null> {
  let trimmed = urlInput.trim();
  let spotifyId = '';
  let type: 'playlist' | 'track' | 'album' | 'artist' | 'episode' | 'show' | 'unknown' = 'unknown';

  // Support international localized URLs like /intl-tr/playlist/..., /intl-en/..., user playlists /user/.../playlist/..., /tr/..., etc.
  const match = trimmed.match(/open\.spotify\.com\/(?:[a-zA-Z]{2}(?:-[a-zA-Z]{2})?\/)?(?:intl-[a-z]{2}\/)?(?:user\/[^\/]+\/)?(playlist|track|album|artist|episode|show)\/([a-zA-Z0-9]+)/i);
  if (match) {
    type = match[1].toLowerCase() as any;
    spotifyId = match[2];
  } else if (trimmed.includes('spotify:')) {
    const uriMatch = trimmed.match(/spotify:(playlist|track|album|artist|episode|show):([a-zA-Z0-9]+)/i);
    if (uriMatch) {
      type = uriMatch[1].toLowerCase() as any;
      spotifyId = uriMatch[2];
    }
  } else {
    // Check if user just pasted an ID or query
    const simpleMatch = trimmed.match(/([a-zA-Z0-9]{22})/);
    if (simpleMatch) {
      spotifyId = simpleMatch[1];
      type = 'playlist';
    }
  }

  // 1. Try resolving via backend / serverless endpoint (Netlify & Server)
  try {
    const resolveUrl = spotifyId ? `https://open.spotify.com/${type}/${spotifyId}` : trimmed;
    const serverRes = await fetch(`/api/spotify/resolve?url=${encodeURIComponent(resolveUrl)}&expandSeries=true`);
    const contentType = serverRes.headers.get('content-type') || '';
    if (serverRes.ok && contentType.includes('application/json')) {
      const serverData = await serverRes.json();
      if (serverData && serverData.tracks && serverData.tracks.length > 0) {
        return {
          type: serverData.type || type,
          id: serverData.id || spotifyId,
          url: resolveUrl,
          title: serverData.title,
          authorName: serverData.author,
          thumbnailUrl: serverData.coverUrl,
          tracks: serverData.tracks,
          singleTrack: serverData.singleTrack,
          seriesEpisodes: serverData.seriesEpisodes,
          parentShow: serverData.parentShow
        };
      } else if (serverData && serverData.error) {
        throw new Error(serverData.error);
      }
    } else if (!serverRes.ok && contentType.includes('application/json')) {
      try {
        const errJson = await serverRes.json();
        if (errJson && errJson.error) {
          throw new Error(errJson.error);
        }
      } catch (e: any) {
        if (e.message && !e.message.includes('JSON')) throw e;
      }
    }
  } catch (err: any) {
    if (err.message && (err.message.includes('Herkese Açık') || err.message.includes('Gizli') || err.message.includes('korumalı') || err.message.includes('bulunamadı'))) {
      throw err;
    }
    console.warn('Server resolve notice, checking direct embed fallback...', err);
  }

  if (!spotifyId) {
    return null;
  }

  const cleanUrl = `https://open.spotify.com/${type}/${spotifyId}`;

  // 2. Direct / Proxy Fallback: Fetch Spotify Embed and parse JSON state
  try {
    const embedUrl = `https://open.spotify.com/embed/${type}/${spotifyId}`;
    const html = await fetchWithCorsFallback(embedUrl);

    if (html) {
      let entity: any = null;

      // Check __NEXT_DATA__
      const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (nextDataMatch) {
        try {
          const nextData = JSON.parse(nextDataMatch[1]);
          entity = nextData.props?.pageProps?.state?.data?.entity || nextData.props?.pageProps?.entity || nextData.entity;
        } catch {}
      }

      // Check initial-state (plain or base64)
      if (!entity) {
        const initMatch = html.match(/<script id="initial-state"[^>]*>([\s\S]*?)<\/script>/);
        if (initMatch) {
          try {
            const raw = initMatch[1].trim();
            if (raw.startsWith('{')) {
              const data = JSON.parse(raw);
              entity = data.data?.entity || data.entity;
            } else {
              const str = atob(raw);
              const data = JSON.parse(str);
              entity = data.data?.entity || data.entity;
            }
          } catch {}
        }
      }

      // Check resource (base64)
      if (!entity) {
        const resMatch = html.match(/<script id="resource"[^>]*>([\s\S]*?)<\/script>/);
        if (resMatch) {
          try {
            const raw = resMatch[1].trim();
            const str = atob(raw);
            const data = JSON.parse(str);
            entity = data.data?.entity || data.entity || data;
          } catch {}
        }
      }

      if (entity) {
        const listTitle = entity.name || entity.title || 'Spotify Çalma Listesi';
        const authorName = entity.subtitle || entity.artists?.[0]?.name || 'Spotify';
        const listCover =
          entity.visualIdentity?.image?.[0]?.url ||
          entity.coverArt?.sources?.[0]?.url ||
          entity.images?.[0]?.url ||
          'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80';

        const rawList: any[] = (type === 'track' || type === 'episode')
          ? [entity]
          : (entity.trackList || entity.tracks?.items || entity.episodesList || entity.episodes || []);

        if (rawList.length > 0) {
          const tracks: Track[] = rawList.map((item: any, idx: number) => {
            const t = item.track || item.episode || item;
            const trkTitle = t.title || t.name || `Şarkı #${idx + 1}`;
            let trkArtist = t.subtitle || (t.artists && t.artists.map((a: any) => a.name).join(', ')) || authorName;

            if (trkTitle.includes(' - ') && (trkArtist === authorName || trkArtist === 'Spotify' || !trkArtist)) {
              const parts = trkTitle.split(' - ');
              if (parts.length >= 2 && parts[0].trim()) {
                trkArtist = parts[0].trim();
              }
            }

            const trkDuration = t.duration ? Math.round(t.duration / 1000) : (t.duration_ms ? Math.round(t.duration_ms / 1000) : 190);
            const trkCover = t.coverArt?.sources?.[0]?.url || t.visualIdentity?.image?.[0]?.url || t.album?.images?.[0]?.url || listCover;
            const audioUrl = t.audioPreview?.url || t.preview_url || '';

            return {
              id: `sp_${t.id || spotifyId}_${idx}_${Date.now()}`,
              title: trkTitle,
              artist: trkArtist,
              album: t.album?.name || listTitle,
              duration: trkDuration,
              coverUrl: trkCover,
              audioUrl: audioUrl,
              source: 'spotify',
              spotifyId: t.id || `${spotifyId}_${idx}`,
              addedAt: new Date().toISOString(),
              genre: 'Spotify Hit'
            };
          });

          return {
            type,
            id: spotifyId,
            url: cleanUrl,
            title: listTitle,
            authorName,
            thumbnailUrl: listCover,
            tracks
          };
        }
      }
    }
  } catch (err) {
    console.warn('Direct embed parse fallback notice:', err);
  }

  // 3. Fallback: Spotify oEmbed API (supports CORS)
  try {
    const oembedRes = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(cleanUrl)}`);
    if (oembedRes.ok) {
      const data = await oembedRes.json();
      
      // If single track or episode, oEmbed title is the song title
      if (type === 'track' || type === 'episode') {
        const singleMatch = await searchOriginalAudio(data.title || 'Müzik', data.author_name || '');
        const tracks: Track[] = [{
          id: `sp_oembed_${spotifyId}`,
          title: data.title || 'Spotify Şarkısı',
          artist: data.author_name || 'Spotify',
          album: 'Spotify',
          duration: singleMatch?.duration || 190,
          coverUrl: data.thumbnail_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
          audioUrl: singleMatch?.audioUrl || '',
          source: 'spotify',
          spotifyId: spotifyId,
          addedAt: new Date().toISOString(),
          genre: 'Pop'
        }];

        return {
          type,
          id: spotifyId,
          url: cleanUrl,
          title: data.title || 'Spotify İçe Aktarma',
          authorName: data.author_name || 'Spotify',
          thumbnailUrl: data.thumbnail_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
          tracks
        };
      }

      // CRITICAL: NEVER CREATE A DUMMY TRACK FOR A PLAYLIST OR ALBUM!
      // If oEmbed returns playlist metadata but no tracks could be extracted, throw a clear explanatory error
      throw new Error(
        `"${data.title || 'Bu çalma listesi'}" içeriğindeki parçalar okunamadı. ` +
        `Çalma listesi Spotify'da "Gizli" (Özel) olabilir veya Spotify tarafından engellenmiş olabilir. ` +
        `Lütfen Spotify uygulamasında listeyi "Herkese Açık" (Public) yapın veya şarkı adlarını girin.`
      );
    }
  } catch (e: any) {
    if (e.message && (e.message.includes('Herkese Açık') || e.message.includes('Gizli') || e.message.includes('okunamadı'))) {
      throw e;
    }
    console.warn('oEmbed fallback notice:', e);
  }

  return null;
}

export function createTracksFromSpotifyImport(parsed: SpotifyParsedResult, options?: { deduplicate?: boolean; maxTracks?: number }): Track[] {
  let tracks = parsed.tracks && parsed.tracks.length > 0 ? [...parsed.tracks] : [];

  if (tracks.length === 0) {
    if (parsed.singleTrack) {
      tracks = [parsed.singleTrack];
    } else {
      return [];
    }
  }

  // Deduplicate if requested
  if (options?.deduplicate) {
    const seen = new Set<string>();
    tracks = tracks.filter((t) => {
      const key = `${t.title.toLowerCase().trim()}_${t.artist.toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Cap at maxTracks if specified
  if (options?.maxTracks && options.maxTracks > 0) {
    tracks = tracks.slice(0, options.maxTracks);
  }

  return tracks;
}
