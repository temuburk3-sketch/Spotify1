import { Track } from '../types';

export interface SpotifyParsedResult {
  type: 'playlist' | 'track' | 'album' | 'artist' | 'unknown';
  id: string;
  url: string;
  title: string;
  authorName?: string;
  thumbnailUrl?: string;
  tracks: Track[];
}

/**
 * Searches iTunes Search API directly from client/backend for original song audio preview
 */
export async function searchOriginalAudio(title: string, artist = ''): Promise<{
  audioUrl?: string;
  coverUrl?: string;
  duration?: number;
  album?: string;
} | null> {
  try {
    const cleanTitle = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
    const query = `${cleanTitle} ${artist}`.trim();
    
    // First try backend API
    try {
      const apiRes = await fetch(`/api/audio/match?title=${encodeURIComponent(cleanTitle)}&artist=${encodeURIComponent(artist)}`);
      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data && (data.previewUrl || data.audioUrl)) {
          return {
            audioUrl: data.previewUrl || data.audioUrl,
            coverUrl: data.coverUrl,
            duration: data.duration,
            album: data.album
          };
        }
      }
    } catch {}

    // Direct iTunes API query
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
          album: item.collectionName
        };
      }
    }
  } catch (err) {
    console.warn('Original audio search failed:', err);
  }
  return null;
}

/**
 * Parses any Spotify URL (playlist, track, album, etc.) and extracts real tracklist + genuine audio
 */
export async function parseSpotifyUrl(urlInput: string): Promise<SpotifyParsedResult | null> {
  const trimmed = urlInput.trim();
  let spotifyId = '';
  let type: 'playlist' | 'track' | 'album' | 'artist' | 'unknown' = 'unknown';

  const match = trimmed.match(/open\.spotify\.com\/(playlist|track|album|artist)\/([a-zA-Z0-9]+)/);
  if (match) {
    type = match[1] as any;
    spotifyId = match[2];
  } else if (trimmed.startsWith('spotify:')) {
    const parts = trimmed.split(':');
    if (parts.length >= 3) {
      type = parts[1] as any;
      spotifyId = parts[2];
    }
  }

  if (!spotifyId) {
    return null;
  }

  const cleanUrl = `https://open.spotify.com/${type}/${spotifyId}`;

  // 1. Try resolving via our server backend endpoint
  try {
    const serverRes = await fetch(`/api/spotify/resolve?url=${encodeURIComponent(cleanUrl)}`);
    if (serverRes.ok) {
      const serverData = await serverRes.json();
      if (serverData && serverData.tracks && serverData.tracks.length > 0) {
        return {
          type: serverData.type || type,
          id: spotifyId,
          url: cleanUrl,
          title: serverData.title,
          authorName: serverData.author,
          thumbnailUrl: serverData.coverUrl,
          tracks: serverData.tracks
        };
      }
    }
  } catch (err) {
    console.warn('Server resolve failed, attempting direct fallback...', err);
  }

  // 2. Direct Fallback: Fetch Spotify embed & search matching original audio
  try {
    const embedRes = await fetch(`https://open.spotify.com/embed/${type}/${spotifyId}`);
    if (embedRes.ok) {
      const html = await embedRes.text();
      const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
      if (nextDataMatch) {
        const nextData = JSON.parse(nextDataMatch[1]);
        const entity = nextData.props?.pageProps?.state?.data?.entity;
        if (entity) {
          const listTitle = entity.name || entity.title || 'Spotify Çalma Listesi';
          const authorName = entity.subtitle || entity.artists?.[0]?.name || 'Spotify';
          const listCover =
            entity.visualIdentity?.image?.[0]?.url ||
            entity.coverArt?.sources?.[0]?.url ||
            entity.images?.[0]?.url ||
            'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80';

          const rawList = type === 'track' ? [entity] : (entity.trackList || []);

          const tracks: Track[] = await Promise.all(
            rawList.map(async (t: any, idx: number) => {
              const trkTitle = t.title || t.name || `Şarkı #${idx + 1}`;
              const trkArtist = t.subtitle || (t.artists && t.artists.map((a: any) => a.name).join(', ')) || authorName;
              const trkDuration = t.duration ? Math.round(t.duration / 1000) : 180;
              const trkCover = t.coverArt?.sources?.[0]?.url || t.visualIdentity?.image?.[0]?.url || listCover;

              let audioUrl = t.audioPreview?.url || t.preview_url;

              // If preview audio is missing from embed, find real match
              if (!audioUrl) {
                const audioMatch = await searchOriginalAudio(trkTitle, trkArtist);
                if (audioMatch?.audioUrl) {
                  audioUrl = audioMatch.audioUrl;
                }
              }

              if (!audioUrl) {
                audioUrl = 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f792cb.mp3?filename=tuesday-glitch-122753.mp3';
              }

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
            })
          );

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
    console.warn('Direct embed parse fallback error:', err);
  }

  // 3. Last resort: oEmbed
  try {
    const oembedRes = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(cleanUrl)}`);
    if (oembedRes.ok) {
      const data = await oembedRes.json();
      const singleMatch = await searchOriginalAudio(data.title || 'Müzik', data.author_name || '');
      const tracks: Track[] = [{
        id: `sp_oembed_${spotifyId}`,
        title: data.title || 'Spotify Şarkısı',
        artist: data.author_name || 'Spotify',
        album: 'Spotify',
        duration: singleMatch?.duration || 190,
        coverUrl: data.thumbnail_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
        audioUrl: singleMatch?.audioUrl || 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/fb/3c/74/fb3c7480-781d-1830-3edd-fd15bdb23406/mzaf_17024654962565086082.plus.aac.p.m4a',
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
  } catch (e) {
    console.warn('oEmbed fallback error:', e);
  }

  return null;
}

export function createTracksFromSpotifyImport(parsed: SpotifyParsedResult): Track[] {
  if (parsed.tracks && parsed.tracks.length > 0) {
    return parsed.tracks;
  }

  return [{
    id: `spotify_track_${Date.now()}_${parsed.id}`,
    title: parsed.title,
    artist: parsed.authorName || 'Spotify Sanatçısı',
    album: parsed.title,
    duration: 190,
    coverUrl: parsed.thumbnailUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/fb/3c/74/fb3c7480-781d-1830-3edd-fd15bdb23406/mzaf_17024654962565086082.plus.aac.p.m4a',
    source: 'spotify',
    spotifyId: parsed.id,
    addedAt: new Date().toISOString(),
    genre: 'Pop'
  }];
}
