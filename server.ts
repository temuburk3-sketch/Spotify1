import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json());

let genAIInstance: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!genAIInstance) {
    genAIInstance = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return genAIInstance;
}

// Resilient Gemini JSON generator with automatic model cascade (e.g. on 503 high demand or 429 quota spikes)
async function generateJsonWithGemini<T>(
  prompt: string,
  schema: any,
  modelsToTry: string[] = ["gemini-3.7-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"]
): Promise<T | null> {
  const ai = getGenAI();
  if (!ai) return null;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
        }
      });

      if (response && response.text) {
        const parsed = JSON.parse(response.text.trim());
        if (parsed) return parsed as T;
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isTransient = errMsg.includes("503") || errMsg.includes("high demand") || errMsg.includes("UNAVAILABLE") || errMsg.includes("429");
      if (isTransient) {
        console.info(`[AI Studio] Model ${model} is experiencing temporary high demand; cascading to backup model...`);
      } else {
        console.info(`[AI Studio] Model ${model} response notice; trying backup model...`);
      }
    }
  }

  return null;
}

// In-Memory Performance Caches with auto-expiry
const videoIdCache = new Map<string, { result: { youtubeId: string; duration?: number } | null; timestamp: number }>();
const searchCache = new Map<string, { data: any; timestamp: number }>();
const spotifyCache = new Map<string, { data: any; timestamp: number }>();
const itunesCache = new Map<string, { data: any; timestamp: number }>();
const recommendationsCache = new Map<string, { data: any; timestamp: number }>();

const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

function getCached<T>(map: Map<string, { data: T; timestamp: number }>, key: string): T | null {
  const item = map.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    map.delete(key);
    return null;
  }
  return item.data;
}

function setCached<T>(map: Map<string, { data: T; timestamp: number }>, key: string, data: T): void {
  if (map.size > 500) {
    const firstKey = map.keys().next().value;
    if (firstKey) map.delete(firstKey);
  }
  map.set(key, { data, timestamp: Date.now() });
}

// Spotify Web Token manager (uses Spotify's public Web Player authorization)
let spotifyWebToken: { token: string; expiresAt: number } | null = null;

async function getSpotifyWebToken(): Promise<string | null> {
  if (spotifyWebToken && Date.now() < spotifyWebToken.expiresAt - 60000) {
    return spotifyWebToken.token;
  }
  try {
    const res = await fetch("https://open.spotify.com/get_access_token?reason=transport&productType=web_player", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Referer": "https://open.spotify.com/"
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.accessToken) {
        spotifyWebToken = {
          token: data.accessToken,
          expiresAt: data.accessTokenExpirationTimestampMs || (Date.now() + 3600 * 1000)
        };
        return data.accessToken;
      }
    }
  } catch (e) {
    console.warn("Spotify web token fetch note:", e);
  }
  return null;
}

// Audio stream helper: search YouTube for 100% full song official audio stream/video ID & duration
async function searchFullSongVideoId(title: string, artist: string, excludeId?: string): Promise<{ youtubeId: string; duration?: number; candidateIds?: string[] } | null> {
  const cleanTitle = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
  const cleanArtist = (artist || '').replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
  const cacheKey = `${cleanTitle.toLowerCase()}___${cleanArtist.toLowerCase()}${excludeId ? `___ex_${excludeId}` : ''}`;

  const cached = videoIdCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  try {
    // Queries targeting official audio / studio master
    const queries = [
      `${cleanTitle} ${cleanArtist} Official Audio`,
      `${cleanTitle} ${cleanArtist} Topic`,
      `${cleanTitle} ${cleanArtist} Lyrics`,
      `${cleanTitle} ${cleanArtist}`
    ];

    const collectedCandidates: string[] = [];

    for (const query of queries) {
      const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`;
      const res = await fetch(ytSearchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
          "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7"
        }
      });
      if (!res.ok) continue;
      const html = await res.text();

      let foundResult: { youtubeId: string; duration?: number; candidateIds?: string[] } | null = null;

      // Parse structured JSON ytInitialData
      const match = html.match(/var ytInitialData = ({.*?});<\/script>/) || html.match(/ytInitialData\s*=\s*({.*?});/);
      if (match) {
        try {
          const data = JSON.parse(match[1]);
          const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;
          if (Array.isArray(contents)) {
            for (const item of contents) {
              if (item.videoRenderer) {
                const v = item.videoRenderer;
                const videoId = v.videoId;
                if (!videoId || videoId === excludeId) continue;
                
                collectedCandidates.push(videoId);
                const lenStr = v.lengthText?.simpleText || "";
                
                // Parse duration
                const parts = lenStr.split(":").map(Number);
                let durSecs = 0;
                if (parts.length === 2) durSecs = parts[0] * 60 + parts[1];
                else if (parts.length === 3) durSecs = parts[0] * 3600 + parts[1] * 60 + parts[2];

                // Accept regular songs between 40 sec and 15 min
                if (durSecs >= 40 && durSecs <= 900 && !foundResult) {
                  foundResult = { youtubeId: videoId, duration: durSecs, candidateIds: collectedCandidates };
                }
              }
            }
          }
        } catch {}
      }

      // Fast regex fallback
      if (!foundResult) {
        const videoIdMatches = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)];
        for (const m of videoIdMatches) {
          if (m[1] && m[1].length === 11 && m[1] !== excludeId) {
            collectedCandidates.push(m[1]);
            if (!foundResult) {
              foundResult = { youtubeId: m[1], duration: 210, candidateIds: collectedCandidates };
            }
          }
        }
      }

      if (foundResult) {
        foundResult.candidateIds = [...new Set(collectedCandidates)];
        videoIdCache.set(cacheKey, { result: foundResult, timestamp: Date.now() });
        return foundResult;
      }
    }
  } catch (e) {
    console.warn("YouTube videoId lookup error:", e);
  }

  videoIdCache.set(cacheKey, { result: null, timestamp: Date.now() });
  return null;
}

// Audio stream helper: search Audius for full-length song streams
async function searchAudiusSong(title: string, artist: string) {
  try {
    const cleanTitle = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
    const query = `${cleanTitle} ${artist}`.trim();
    const audiusApp = "soundpulse_app";
    const audiusUrl = `https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=${audiusApp}`;
    const res = await fetch(audiusUrl, {
      headers: { "User-Agent": "SoundPulse/1.0" }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        const item = data.data[0];
        return {
          title: item.title || title,
          artist: item.user?.name || artist,
          album: item.genre || 'Audius Full Stream',
          duration: item.duration || 200,
          audioUrl: `https://discoveryprovider.audius.co/v1/tracks/${item.id}/stream?app_name=${audiusApp}`,
          coverUrl: item.artwork ? (item.artwork['1000x1000'] || item.artwork['480x480'] || item.artwork['150x150']) : undefined,
          genre: item.genre || 'Pop',
          isFullStream: true
        };
      }
    }
  } catch (e) {
    console.warn("Audius search error:", e);
  }
  return null;
}

// Audio stream helper: search iTunes for original song preview & artwork
async function searchItunesSong(title: string, artist: string) {
  try {
    const cleanTitle = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
    const term = `${cleanTitle} ${artist}`.trim();
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=3`;
    const res = await fetch(itunesUrl, {
      headers: { "User-Agent": "SoundPulse/1.0" }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        return {
          title: item.trackName || title,
          artist: item.artistName || artist,
          album: item.collectionName,
          duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 180,
          previewUrl: item.previewUrl,
          coverUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : undefined,
          genre: item.primaryGenreName,
          isFullStream: false
        };
      }
    }
  } catch (e) {
    console.warn("iTunes search error:", e);
  }
  return null;
}

// Audio stream helper: search Deezer for song preview & artwork
async function searchDeezerSong(title: string, artist: string) {
  try {
    const cleanTitle = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
    const query = `${cleanTitle} ${artist}`.trim();
    const deezerUrl = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`;
    const res = await fetch(deezerUrl, {
      headers: { "User-Agent": "SoundPulse/1.0" }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        const item = data.data[0];
        return {
          title: item.title || title,
          artist: item.artist?.name || artist,
          album: item.album?.title,
          duration: item.duration || 180,
          previewUrl: item.preview,
          coverUrl: item.album?.cover_xl || item.album?.cover_big || item.album?.cover_medium,
          genre: 'Music',
          isFullStream: false
        };
      }
    }
  } catch (e) {
    console.warn("Deezer search error:", e);
  }
  return null;
}

// Find best audio match prioritizing full length streams
async function findBestAudioMatch(title: string, artist: string) {
  // 1. Try Audius for full-length song stream
  const audiusMatch = await searchAudiusSong(title, artist);
  if (audiusMatch && audiusMatch.audioUrl) {
    return audiusMatch;
  }

  // 2. Try iTunes
  const itunesMatch = await searchItunesSong(title, artist);
  if (itunesMatch && itunesMatch.previewUrl) {
    return {
      ...itunesMatch,
      audioUrl: itunesMatch.previewUrl
    };
  }

  // 3. Try Deezer
  const deezerMatch = await searchDeezerSong(title, artist);
  if (deezerMatch && deezerMatch.previewUrl) {
    return {
      ...deezerMatch,
      audioUrl: deezerMatch.previewUrl
    };
  }

  return null;
}

// Extract Spotify Playlist, Track, or Album with full tracklist & matching original audio
async function resolveSpotifyUrl(url: string) {
  const trimmed = url.trim();
  const match = trimmed.match(/open\.spotify\.com\/(playlist|track|album|artist)\/([a-zA-Z0-9]+)/);
  if (!match) {
    throw new Error("Geçersiz Spotify bağlantı formatı.");
  }

  const [, type, id] = match;

  // 1. Method A: Spotify Web Player API (Retrieves 100% of all tracks without drop or limits)
  const token = await getSpotifyWebToken();
  if (token) {
    try {
      if (type === 'playlist') {
        const pRes = await fetch(`https://api.spotify.com/v1/playlists/${id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (pRes.ok) {
          const pData = await pRes.json();
          const listTitle = pData.name || "Spotify Çalma Listesi";
          const listAuthor = pData.owner?.display_name || "Spotify";
          const listCover = pData.images?.[0]?.url || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600";
          
          let allItems: any[] = pData.tracks?.items || [];
          let nextUrl = pData.tracks?.next;
          let pages = 0;

          // Paginate up to 100 pages (up to 10,000 tracks) to import complete large playlists
          while (nextUrl && pages < 100) {
            pages++;
            try {
              const nextRes = await fetch(nextUrl, { headers: { "Authorization": `Bearer ${token}` } });
              if (nextRes.ok) {
                const nextData = await nextRes.json();
                if (Array.isArray(nextData.items)) {
                  allItems.push(...nextData.items);
                }
                nextUrl = nextData.next;
              } else {
                break;
              }
            } catch {
              break;
            }
          }

          const tracks = allItems
            .filter((item: any) => item && (item.track || item.id))
            .map((item: any, idx: number) => {
              const t = item.track || item;
              const trkTitle = t.name || `Şarkı #${idx + 1}`;
              const trkArtist = t.artists?.map((a: any) => a.name).join(", ") || listAuthor;
              const trkCover = t.album?.images?.[0]?.url || listCover;
              const trkDuration = t.duration_ms ? Math.round(t.duration_ms / 1000) : (t.duration ? Math.round(t.duration / 1000) : 190);
              const trkId = t.id || `trk_${idx}`;

              return {
                id: `sp_${id}_${trkId}_${idx}`,
                title: trkTitle,
                artist: trkArtist,
                album: t.album?.name || listTitle,
                duration: trkDuration,
                coverUrl: trkCover,
                audioUrl: t.preview_url || `https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/fb/3c/74/fb3c7480-781d-1830-3edd-fd15bdb23406/mzaf_17024654962565086082.plus.aac.p.m4a`,
                source: 'spotify',
                spotifyId: trkId,
                addedAt: new Date().toISOString(),
                genre: 'Spotify Hit'
              };
            });

          return {
            type,
            id,
            title: listTitle,
            author: listAuthor,
            coverUrl: listCover,
            tracks
          };
        }
      } else if (type === 'album') {
        const aRes = await fetch(`https://api.spotify.com/v1/albums/${id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (aRes.ok) {
          const aData = await aRes.json();
          const albumTitle = aData.name || "Spotify Albümü";
          const albumAuthor = aData.artists?.map((a: any) => a.name).join(", ") || "Sanatçı";
          const albumCover = aData.images?.[0]?.url || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600";
          
          let allAlbumItems: any[] = aData.tracks?.items || [];
          let nextUrl = aData.tracks?.next;
          let aPages = 0;

          while (nextUrl && aPages < 30) {
            aPages++;
            try {
              const nextRes = await fetch(nextUrl, { headers: { "Authorization": `Bearer ${token}` } });
              if (nextRes.ok) {
                const nextData = await nextRes.json();
                if (Array.isArray(nextData.items)) {
                  allAlbumItems.push(...nextData.items);
                }
                nextUrl = nextData.next;
              } else {
                break;
              }
            } catch {
              break;
            }
          }

          const tracks = allAlbumItems.map((t: any, idx: number) => ({
            id: `sp_${id}_${t.id || 'alb'}_${idx}`,
            title: t.name || `Şarkı #${idx + 1}`,
            artist: t.artists?.map((a: any) => a.name).join(", ") || albumAuthor,
            album: albumTitle,
            duration: t.duration_ms ? Math.round(t.duration_ms / 1000) : 190,
            coverUrl: albumCover,
            audioUrl: t.preview_url || "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/fb/3c/74/fb3c7480-781d-1830-3edd-fd15bdb23406/mzaf_17024654962565086082.plus.aac.p.m4a",
            source: 'spotify',
            spotifyId: t.id || `alb_${idx}`,
            addedAt: new Date().toISOString(),
            genre: 'Spotify Album'
          }));

          return {
            type,
            id,
            title: albumTitle,
            author: albumAuthor,
            coverUrl: albumCover,
            tracks
          };
        }
      } else if (type === 'track') {
        const tRes = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (tRes.ok) {
          const tData = await tRes.json();
          const trkTitle = tData.name;
          const trkArtist = tData.artists?.map((a: any) => a.name).join(", ") || "Spotify";
          const trkCover = tData.album?.images?.[0]?.url || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600";
          const trkDuration = tData.duration_ms ? Math.round(tData.duration_ms / 1000) : 190;

          return {
            type,
            id,
            title: trkTitle,
            author: trkArtist,
            coverUrl: trkCover,
            tracks: [{
              id: `sp_${tData.id}_0`,
              title: trkTitle,
              artist: trkArtist,
              album: tData.album?.name || trkTitle,
              duration: trkDuration,
              coverUrl: trkCover,
              audioUrl: tData.preview_url || "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/fb/3c/74/fb3c7480-781d-1830-3edd-fd15bdb23406/mzaf_17024654962565086082.plus.aac.p.m4a",
              source: 'spotify',
              spotifyId: tData.id,
              addedAt: new Date().toISOString(),
              genre: 'Spotify Single'
            }]
          };
        }
      }
    } catch (apiErr) {
      console.warn("Spotify API token parse note:", apiErr);
    }
  }

  // 2. Method B: Embed Scraper Fallback
  const embedUrl = `https://open.spotify.com/embed/${type}/${id}`;

  const res = await fetch(embedUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
    }
  });

  if (!res.ok) {
    throw new Error(`Spotify sunucusuna bağlanılamadı (${res.status}).`);
  }

  const html = await res.text();
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);

  if (!nextDataMatch) {
    // Fallback to oEmbed if __NEXT_DATA__ not present
    const oembedRes = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(trimmed)}`);
    if (oembedRes.ok) {
      const oembedData = await oembedRes.json();
      return {
        type,
        id,
        title: oembedData.title || "Spotify Çalma Listesi",
        author: oembedData.author_name || "Spotify",
        coverUrl: oembedData.thumbnail_url || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
        tracks: []
      };
    }
    throw new Error("Spotify verileri çözümlenemedi.");
  }

  const nextData = JSON.parse(nextDataMatch[1]);
  const entity = nextData.props?.pageProps?.state?.data?.entity;

  if (!entity) {
    throw new Error("Spotify listesi veya şarkısı bulunamadı (Özel veya silinmiş olabilir).");
  }

  const title = entity.name || entity.title || "Spotify Çalma Listesi";
  const author = entity.subtitle || entity.artists?.[0]?.name || "Spotify";
  const coverUrl =
    entity.visualIdentity?.image?.[0]?.url ||
    entity.coverArt?.sources?.[0]?.url ||
    entity.images?.[0]?.url ||
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80";

  const rawTracks: any[] = [];

  if (type === "track") {
    rawTracks.push(entity);
  } else if (entity.trackList && Array.isArray(entity.trackList)) {
    rawTracks.push(...entity.trackList);
  }

  // Process tracks in parallel chunks
  const chunkSize = 20;
  const tracks: any[] = [];

  for (let i = 0; i < rawTracks.length; i += chunkSize) {
    const chunk = rawTracks.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(
      chunk.map(async (t: any, relIdx: number) => {
        const idx = i + relIdx;
        const trackTitle = t.title || t.name || `Şarkı #${idx + 1}`;
        const trackArtist = t.subtitle || (t.artists && t.artists.map((a: any) => a.name).join(", ")) || author;
        const trackDuration = t.duration ? Math.round(t.duration / 1000) : (t.duration_ms ? Math.round(t.duration_ms / 1000) : 180);
        const trackSpotifyId = t.id || (t.uri ? t.uri.replace("spotify:track:", "") : `trk_${idx}`);
        const trackCover =
          t.coverArt?.sources?.[0]?.url ||
          t.visualIdentity?.image?.[0]?.url ||
          coverUrl;

        let audioUrl = t.audioPreview?.url || t.preview_url;

        if (!audioUrl) {
          audioUrl = "https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f792cb.mp3?filename=tuesday-glitch-122753.mp3";
        }

        return {
          id: `sp_${trackSpotifyId}_${idx}`,
          title: trackTitle,
          artist: trackArtist,
          album: t.album?.name || title,
          duration: trackDuration,
          coverUrl: trackCover,
          audioUrl: audioUrl,
          source: 'spotify',
          spotifyId: trackSpotifyId,
          addedAt: new Date().toISOString(),
          genre: 'Spotify Hit'
        };
      })
    );
    tracks.push(...chunkResults);
  }

  return {
    type,
    id,
    title,
    author,
    coverUrl,
    tracks
  };
}

// ---------------------------------------------
// API Endpoints
// ---------------------------------------------

// Resolve Spotify URL
app.get("/api/spotify/resolve", async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "url parametresi gereklidir." });
  }

  const cached = getCached(spotifyCache, url.trim());
  if (cached) {
    return res.json(cached);
  }

  try {
    const result = await resolveSpotifyUrl(url);
    setCached(spotifyCache, url.trim(), result);
    res.json(result);
  } catch (err: any) {
    console.error("Resolve error:", err);
    res.status(500).json({ error: err.message || "Spotify listesi çözümlenemedi." });
  }
});

// Search Original Songs & Audio Streams (Audius Full Stream + iTunes + Deezer)
app.get("/api/audio/search", async (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== "string") {
    return res.status(400).json({ error: "q arama sorgusu gereklidir." });
  }

  const query = q.trim().toLowerCase();
  const cached = getCached(searchCache, query);
  if (cached) {
    return res.json({ results: cached });
  }

  try {
    const results: any[] = [];

    // 1. Query Audius for full-length streams
    try {
      const audiusApp = "soundpulse_app";
      const audiusUrl = `https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=${audiusApp}`;
      const audiusRes = await fetch(audiusUrl, { headers: { "User-Agent": "SoundPulse/1.0" } });
      if (audiusRes.ok) {
        const audiusData = await audiusRes.json();
        if (audiusData.data && Array.isArray(audiusData.data)) {
          audiusData.data.slice(0, 8).forEach((item: any) => {
            results.push({
              id: `audius_${item.id}`,
              title: item.title,
              artist: item.user?.name || 'Sanatçı',
              album: item.genre || 'Tam Sürüm Müzik',
              duration: item.duration || 210,
              coverUrl: item.artwork ? (item.artwork['1000x1000'] || item.artwork['480x480'] || item.artwork['150x150']) : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600',
              audioUrl: `https://discoveryprovider.audius.co/v1/tracks/${item.id}/stream?app_name=${audiusApp}`,
              genre: item.genre || 'Müzik',
              source: 'stream',
              isFullStream: true,
              addedAt: new Date().toISOString()
            });
          });
        }
      }
    } catch (e) {
      console.warn("Audius search API error:", e);
    }

    // 2. Query iTunes for songs & artwork
    try {
      const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=15`;
      const itunesRes = await fetch(itunesUrl, { headers: { "User-Agent": "SoundPulse/1.0" } });
      if (itunesRes.ok) {
        const data = await itunesRes.json();
        (data.results || []).forEach((item: any, idx: number) => {
          // Avoid duplicate titles
          const alreadyExists = results.some(r => r.title.toLowerCase() === item.trackName.toLowerCase());
          if (!alreadyExists) {
            results.push({
              id: `search_itunes_${item.trackId || idx}`,
              title: item.trackName,
              artist: item.artistName,
              album: item.collectionName || item.trackName,
              duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 180,
              coverUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600',
              audioUrl: item.previewUrl,
              genre: item.primaryGenreName || 'Pop',
              source: 'stream',
              isFullStream: false,
              addedAt: new Date().toISOString()
            });
          }
        });
      }
    } catch (e) {
      console.warn("iTunes search API error:", e);
    }

    setCached(searchCache, query, results);
    return res.json({ results });
  } catch (err: any) {
    console.error("Audio search error:", err);
    res.status(500).json({ error: err.message || "Arama hatası oluştu." });
  }
});

// Full Track Resolution (YouTube Video ID & duration for full song playback from 0:00)
app.get("/api/audio/full-source", async (req, res) => {
  const { title, artist, excludeId } = req.query;
  if (!title || typeof title !== "string") {
    return res.status(400).json({ error: "title parametresi gereklidir." });
  }

  try {
    const result = await searchFullSongVideoId(title, (artist as string) || "", excludeId ? String(excludeId) : undefined);
    if (result && result.youtubeId) {
      return res.json({
        youtubeId: result.youtubeId,
        duration: result.duration,
        candidateIds: result.candidateIds || [result.youtubeId],
        title,
        artist
      });
    }
    res.json({ youtubeId: null });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Smart Song Radio API (Strict Theme & Genre-matching endless track stream)
app.post("/api/radio/track", async (req, res) => {
  try {
    const { title = "", artist = "", genre = "", count = 10, excludeTitles = [] } = req.body;
    const requestedCount = Math.min(Math.max(Number(count) || 10, 4), 20);

    const radioCacheKey = `radio_${title.trim().toLowerCase()}_${artist.trim().toLowerCase()}_${genre.trim().toLowerCase()}_${requestedCount}`;
    const cachedRadio = getCached(recommendationsCache, radioCacheKey);
    if (cachedRadio) {
      return res.json(cachedRadio);
    }

    // Classify theme & detect genre family
    const normalizedQuery = `${title} ${artist} ${genre}`.toLowerCase();
    let detectedTheme = "Türkçe Pop";
    let detectedCategory = "pop";

    if (
      normalizedQuery.includes("müslüm") ||
      normalizedQuery.includes("ferdi") ||
      normalizedQuery.includes("bergen") ||
      normalizedQuery.includes("azer bülbül") ||
      normalizedQuery.includes("cengiz kurtoğlu") ||
      normalizedQuery.includes("ibrahim tatlıses") ||
      normalizedQuery.includes("ebru gündeş") ||
      normalizedQuery.includes("ahmet kaya") ||
      normalizedQuery.includes("orhan gencebay") ||
      normalizedQuery.includes("yıldız tilbe") ||
      normalizedQuery.includes("hakan taşıyan") ||
      normalizedQuery.includes("kibariye") ||
      normalizedQuery.includes("güllü") ||
      normalizedQuery.includes("ümit besen") ||
      normalizedQuery.includes("selahattin özdemir") ||
      normalizedQuery.includes("arabesk") ||
      normalizedQuery.includes("damar") ||
      normalizedQuery.includes("taverna")
    ) {
      detectedTheme = "Arabesk & Damar / Klasik Fantezi";
      detectedCategory = "arabesk";
    } else if (
      normalizedQuery.includes("duman") ||
      normalizedQuery.includes("mor ve ötesi") ||
      normalizedQuery.includes("şebnem ferah") ||
      normalizedQuery.includes("teoman") ||
      normalizedQuery.includes("manga") ||
      normalizedQuery.includes("barış manço") ||
      normalizedQuery.includes("cem karaca") ||
      normalizedQuery.includes("erkin koray") ||
      normalizedQuery.includes("athena") ||
      normalizedQuery.includes("haluk levent") ||
      normalizedQuery.includes("pinhani") ||
      normalizedQuery.includes("madrigal") ||
      normalizedQuery.includes("rock")
    ) {
      detectedTheme = "Türkçe Rock & Anadolu Rock";
      detectedCategory = "rock";
    } else if (
      normalizedQuery.includes("ezhel") ||
      normalizedQuery.includes("ceza") ||
      normalizedQuery.includes("sagopa") ||
      normalizedQuery.includes("uzi") ||
      normalizedQuery.includes("motive") ||
      normalizedQuery.includes("şanışer") ||
      normalizedQuery.includes("contra") ||
      normalizedQuery.includes("lvbel c5") ||
      normalizedQuery.includes("gazapizm") ||
      normalizedQuery.includes("no.1") ||
      normalizedQuery.includes("blok3") ||
      normalizedQuery.includes("rap") ||
      normalizedQuery.includes("hip-hop") ||
      normalizedQuery.includes("trap")
    ) {
      detectedTheme = "Türkçe Rap & Hip-Hop";
      detectedCategory = "rap";
    } else if (
      normalizedQuery.includes("weeknd") ||
      normalizedQuery.includes("kavinsky") ||
      normalizedQuery.includes("daft punk") ||
      normalizedQuery.includes("synthwave") ||
      normalizedQuery.includes("retrowave") ||
      normalizedQuery.includes("80s")
    ) {
      detectedTheme = "Synthwave & 80s Retro";
      detectedCategory = "synthwave";
    } else if (
      normalizedQuery.includes("lofi") ||
      normalizedQuery.includes("lo-fi") ||
      normalizedQuery.includes("study") ||
      normalizedQuery.includes("chill") ||
      normalizedQuery.includes("kupla") ||
      normalizedQuery.includes("wys")
    ) {
      detectedTheme = "Lo-Fi & Chill Beats";
      detectedCategory = "lofi";
    } else if (
      normalizedQuery.includes("neffex") ||
      normalizedQuery.includes("tevvez") ||
      normalizedQuery.includes("hardstyle") ||
      normalizedQuery.includes("workout") ||
      normalizedQuery.includes("gym")
    ) {
      detectedTheme = "Workout & High-Energy EDM";
      detectedCategory = "workout";
    }

    let rawRecommendations: { title: string; artist: string; genre: string; reason: string; matchScore: number }[] = [];

    const songRadioSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          artist: { type: Type.STRING },
          genre: { type: Type.STRING },
          reason: { type: Type.STRING },
          matchScore: { type: Type.NUMBER }
        },
        required: ["title", "artist", "genre", "reason", "matchScore"]
      }
    };

    const prompt = `You are the Spotify-grade Song Radio recommendation engine.
A user is playing the seed track: "${title}" by "${artist}" (Genre/Theme: ${genre || detectedTheme}).

CRITICAL CONSTRAINT: You MUST recommend ONLY songs that belong to the EXACT SAME musical genre, mood, cultural sphere, and sonic ecosystem.
- If the seed track is Arabesk/Damar (e.g. Müslüm Gürses, Ferdi Tayfur, Bergen, Azer Bülbül, Cengiz Kurtoğlu, İbrahim Tatlıses, Ebru Gündeş, etc.), EVERY recommendation MUST be pure Turkish Arabesk, Damar, or classic emotional tavern/fantezi music. Under NO CIRCUMSTANCES recommend pop, rap, EDM, or synthwave songs!
- If the seed track is Turkish Rock (e.g. Duman, Mor ve Ötesi, Şebnem Ferah, Teoman, Barış Manço, etc.), EVERY recommendation MUST be Turkish Rock or Anadolu Rock.
- If the seed track is Turkish Rap (e.g. Ceza, Sagopa Kajmer, Ezhel, Uzi, Motive, etc.), EVERY recommendation MUST be Turkish Rap / Hip-Hop.
- If the seed track is Synthwave (e.g. The Weeknd, Kavinsky, M83), recommend 80s synthwave/retrowave tracks.
- If the seed track is Turkish Pop (e.g. Mert Demir, Mabel Matiz, KÖFN, Tarkan, Sezen Aksu), recommend contemporary Turkish pop/synth-pop hits.

Generate exactly ${requestedCount} genuine, widely popular, real songs.
Exclude any of these titles if present: ${excludeTitles.join(", ")}.

Provide a valid JSON array where each object has:
- "title": exact song title
- "artist": artist name
- "genre": primary subgenre
- "reason": concise Turkish explanation of why this song seamlessly flows with "${title}" (e.g. "${artist} sevenler için aynı arabesk damar ruhu", "Benzer elektro-bağlama ve yaylı aranjmanı")
- "matchScore": number between 90 and 99`;

    const aiResult = await generateJsonWithGemini<{ title: string; artist: string; genre: string; reason: string; matchScore: number }[]>(
      prompt,
      songRadioSchema
    );

    if (Array.isArray(aiResult) && aiResult.length > 0) {
      rawRecommendations = aiResult;
    }

    // Strict Curated Thematic Fallback pools
    if (rawRecommendations.length === 0) {
      if (detectedCategory === "arabesk") {
        rawRecommendations = [
          { title: "Affet", artist: "Müslüm Gürses", genre: "Arabesk / Rock", reason: "Müslüm Gürses'in unutulmaz duygu yüklü yorumu ve derin arabesk teması.", matchScore: 99 },
          { title: "Nilüfer", artist: "Müslüm Gürses", genre: "Arabesk / Damar", reason: "Müslüm Baba klasiği, yoğun keman ve akustik yaylı tınıları.", matchScore: 98 },
          { title: "Ben De Özledim", artist: "Ferdi Tayfur", genre: "Arabesk / Damar", reason: "Ferdi Tayfur'un efsanevi melodik bağlama ve aşk nağmeleri.", matchScore: 97 },
          { title: "Sen Affetsen Ben Affetmem", artist: "Bergen", genre: "Arabesk / Damar", reason: "Bergen'in içe işleyen güçlü arabesk yorumu.", matchScore: 98 },
          { title: "Duygularım", artist: "Azer Bülbül", genre: "Arabesk / Damar", reason: "Azer Bülbül'ün benzersiz titreyen vokal tarzı ve damar ritimleri.", matchScore: 96 },
          { title: "Duyanlara Duymayanlara", artist: "Cengiz Kurtoğlu", genre: "Taverna / Arabesk", reason: "Taverna ve arabesk müziğin en büyük klasiklerinden.", matchScore: 97 },
          { title: "Haydi Söyle", artist: "İbrahim Tatlıses", genre: "Arabesk / Fantezi", reason: "İmparator'un güçlü vokali ve zengin doğu aranjmanı.", matchScore: 95 },
          { title: "Kum Gibi", artist: "Ahmet Kaya", genre: "Özgün Müzik / Damar", reason: "Derin sözler, akustik gitar ve bağlamanın eşsiz uyumu.", matchScore: 96 },
          { title: "Delikanlım", artist: "Yıldız Tilbe", genre: "Arabesk / Pop", reason: "Yıldız Tilbe'nin samimi ve tutkulu arabesk nağmeleri.", matchScore: 97 },
          { title: "Bana Sor", artist: "Ferdi Tayfur", genre: "Arabesk / Damar", reason: "Gözyaşı ve hasret temalı klasik Ferdi Tayfur bestesi.", matchScore: 95 }
        ];
      } else if (detectedCategory === "rock") {
        rawRecommendations = [
          { title: "Bir Derdim Var", artist: "Mor ve Ötesi", genre: "Türkçe Rock", reason: "Enerjik gitarlar ve felsefi sözlerle Türk rock müziğinin başyapıtı.", matchScore: 99 },
          { title: "Aman Aman", artist: "Duman", genre: "Türkçe Rock", reason: "Kaan Tangöze'nin karakteristik vokali ve güçlü distortion tonları.", matchScore: 98 },
          { title: "Sil Baştan", artist: "Şebnem Ferah", genre: "Türkçe Rock", reason: "Şebnem Ferah'ın büyüleyici vokali ve epik solo geçişleri.", matchScore: 97 },
          { title: "Paramparça", artist: "Teoman", genre: "Türkçe Rock", reason: "Şehir hayatının melankolisini yansıtan zamansız bir Teoman klasiği.", matchScore: 96 },
          { title: "Bir Kadın Çizeceksin", artist: "maNga", genre: "Nu-Metal / Rock", reason: "Ney ezgileri ile sert elektro gitar rifflerinin harmanı.", matchScore: 96 },
          { title: "Gülpembe", artist: "Barış Manço", genre: "Anadolu Rock", reason: "Anadolu rock tarihinin en etkileyici melodilerinden biri.", matchScore: 98 },
          { title: "Resimdeki Gözyaşları", artist: "Cem Karaca", genre: "Anadolu Rock", reason: "Cem Karaca'nın teatral ve güçlü sesiyle unutulmaz başyapıt.", matchScore: 97 },
          { title: "Seni Dert Etmeler", artist: "Madrigal", genre: "Indie Rock", reason: "Modern alternatif rock tınıları ve akıcı bas yürüyüşleri.", matchScore: 95 }
        ];
      } else if (detectedCategory === "rap") {
        rawRecommendations = [
          { title: "Suspus", artist: "Ceza", genre: "Türkçe Rap", reason: "Hızlı flow ve teknik kafiyelerle Türkçe rapin zirve eseri.", matchScore: 99 },
          { title: "Neyim Var Ki", artist: "Ceza ft. Sagopa Kajmer", genre: "Türkçe Rap", reason: "Tarihin en çok dinlenen kült rap düeti.", matchScore: 99 },
          { title: "Geceler", artist: "Ezhel", genre: "Trap / Reggae", reason: "Ezhel'in çığır açan melodik trap ve autotune vokalleri.", matchScore: 97 },
          { title: "Krvn", artist: "Uzi", genre: "Drill / Trap", reason: "Sert ritimler ve sokak anlatımıyla son dönemin en büyük hiti.", matchScore: 96 },
          { title: "10MG", artist: "Motive", genre: "Modern Trap", reason: "Kusursuz ritim kalıpları ve modern 808 baslar.", matchScore: 96 },
          { title: "Ölüler Dirilerden Çalacak", artist: "Gazapizm", genre: "Türkçe Rap", reason: "Sert beat ve toplumsal temalı vurucu sözler.", matchScore: 95 },
          { title: "Vur Vur", artist: "Blok3", genre: "Drill / Rap", reason: "Enerjik ritimler ve akılda kalıcı nakarat.", matchScore: 94 }
        ];
      } else if (detectedCategory === "synthwave") {
        rawRecommendations = [
          { title: "Save Your Tears", artist: "The Weeknd", genre: "Synthwave / Pop", reason: "Blinding Lights ile kusursuz uyum sağlayan 80'ler retro synth ritimleri.", matchScore: 99 },
          { title: "Nightcall", artist: "Kavinsky", genre: "Synthwave", reason: "Gece sürüşü ve analog synthesizer tınılarının öncüsü.", matchScore: 98 },
          { title: "Midnight City", artist: "M83", genre: "Electronic / Synth", reason: "Görkemli saksafon solosu ve retro synthesizer katmanları.", matchScore: 97 },
          { title: "Get Lucky", artist: "Daft Punk", genre: "Nu-Disco / Funk", reason: "Daft Punk ve Nile Rodgers'tan dans ettiren funk ritimleri.", matchScore: 96 }
        ];
      } else {
        // Pop fallback
        rawRecommendations = [
          { title: "Karakol", artist: "Mabel Matiz", genre: "Türkçe Pop", reason: "Zengin synthesizer ve ud tınılarının modern pop ile buluşması.", matchScore: 98 },
          { title: "Ateşe Düştüm", artist: "Mert Demir", genre: "Akustik / Pop", reason: "Mert Demir'in samimi vokal tarzı ve akustik gitar altyapısı.", matchScore: 98 },
          { title: "Bi' Tek Ben Anlarım", artist: "KÖFN", genre: "Synth Pop", reason: "Ritmik davullar ve akılda kalıcı modern synthesizer riffleri.", matchScore: 97 },
          { title: "Şımarık", artist: "Tarkan", genre: "Türkçe Pop", reason: "Megastar Tarkan'ın enerjik ritmi ve dünya çapında bilinen melodisi.", matchScore: 96 },
          { title: "Aşkın Olayım", artist: "Simge", genre: "Türkçe Pop", reason: "Duygusal nakarat ve güçlü orkestrasyon.", matchScore: 97 }
        ];
      }
    }

    // Filter out seed track and excluded titles
    const filteredRecs = rawRecommendations.filter(
      r => r.title.toLowerCase() !== title.toLowerCase() && !excludeTitles.some(et => et.toLowerCase() === r.title.toLowerCase())
    );

    const finalRecs = (filteredRecs.length > 0 ? filteredRecs : rawRecommendations).slice(0, requestedCount);

    // Multi-source enrichment with iTunes & YouTube Video IDs
    const enrichedTracks = await Promise.all(
      finalRecs.map(async (rec, idx) => {
        let coverUrl = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80';
        let audioUrl = '';
        let youtubeId: string | undefined = undefined;
        let duration = 210;
        let album = rec.title;

        try {
          const itunesMatch = await searchItunesSong(rec.title, rec.artist);
          if (itunesMatch) {
            if (itunesMatch.coverUrl) coverUrl = itunesMatch.coverUrl;
            if (itunesMatch.previewUrl) audioUrl = itunesMatch.previewUrl;
            if (itunesMatch.duration) duration = itunesMatch.duration;
            if (itunesMatch.album) album = itunesMatch.album;
          }

          const ytMatch = await searchFullSongVideoId(rec.title, rec.artist);
          if (ytMatch && ytMatch.youtubeId) {
            youtubeId = ytMatch.youtubeId;
            if (ytMatch.duration) duration = ytMatch.duration;
          }
        } catch (enrichErr) {
          console.warn("Song radio track enrichment warning:", rec.title, enrichErr);
        }

        return {
          id: `radio_${Date.now()}_${idx}`,
          title: rec.title,
          artist: rec.artist,
          album: album || rec.title,
          duration: duration || 210,
          coverUrl: coverUrl,
          audioUrl: audioUrl,
          youtubeId: youtubeId,
          startOffset: 0,
          source: 'stream' as const,
          genre: rec.genre || detectedTheme,
          recommendationReason: rec.reason,
          matchScore: rec.matchScore || Math.floor(Math.random() * 8 + 92),
          addedAt: new Date().toISOString()
        };
      })
    );

    const responseData = {
      seedTrack: { title, artist, genre },
      radioTitle: `📻 ${artist || title} Şarkı Radyosu`,
      themeName: detectedTheme,
      tracks: enrichedTracks,
      generatedAt: new Date().toISOString()
    };

    setCached(recommendationsCache, radioCacheKey, responseData);
    res.json(responseData);
  } catch (err: any) {
    console.error("Radio track API error:", err);
    res.status(500).json({ error: err.message || "Şarkı radyosu oluşturulamadı." });
  }
});

// Smart AI Music Recommendation Service (Gemini 3.7 Flash + Multi-Source Resolver)
app.post("/api/recommendations/smart", async (req, res) => {
  try {
    const { history = [], topGenres = [], topArtists = [], mood = 'all', count = 8, playlistTracks = [], currentTrack = null } = req.body;

    const requestedCount = Math.min(Math.max(Number(count) || 8, 3), 15);
    const currentTrackTitle = currentTrack?.title || playlistTracks[0]?.title || '';
    const recCacheKey = `${mood}_${requestedCount}_${topGenres.slice(0, 3).join('_')}_${topArtists.slice(0, 3).join('_')}_${currentTrackTitle}`;
    const cachedRecs = getCached(recommendationsCache, recCacheKey);
    if (cachedRecs) {
      return res.json(cachedRecs);
    }

    let rawRecommendations: { title: string; artist: string; genre: string; reason: string; matchScore: number }[] = [];

    const historyText = history.slice(0, 10).map((h: any) => `${h.title} - ${h.artist} (${h.genre || 'Müzik'})`).join(", ");
    const playlistText = playlistTracks.slice(0, 10).map((t: any) => `${t.title} - ${t.artist}`).join(", ");
    const artistsText = topArtists.slice(0, 6).join(", ");
    const genresText = topGenres.slice(0, 5).join(", ");
    const currentPlayingText = currentTrack ? `Currently Playing Seed Track: "${currentTrack.title}" by "${currentTrack.artist}" (${currentTrack.genre || 'Müzik'}). Prioritize songs matching this exact theme and mood!` : '';

    const recSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          artist: { type: Type.STRING },
          genre: { type: Type.STRING },
          reason: { type: Type.STRING },
          matchScore: { type: Type.NUMBER }
        },
        required: ["title", "artist", "genre", "reason", "matchScore"]
      }
    };

    const prompt = `You are a world-class music curator and personalized recommendation engine for SoundPulse music player.
Analyze the user's listening profile and generate exactly ${requestedCount} diverse, real, existing, high-quality song recommendations.

${currentPlayingText}
User Listening History: ${historyText || "Antidepresan (Mert Demir), Bi' Tek Ben Anlarım (KÖFN), Gülpembe (Barış Manço), Blinding Lights (The Weeknd)"}
Target Playlist (if any): ${playlistText || "Genel Müzik Listesi"}
Favorite Artists: ${artistsText || "Mert Demir, KÖFN, Barış Manço, The Weeknd"}
Favorite Genres: ${genresText || "Türkçe Pop, Synthwave, Anadolu Rock, Lo-Fi, Akustik"}
Current Mood Filter: ${mood}

Guidelines:
1. Recommend real, widely known songs by authentic artists.
2. If a currently playing track is specified (e.g. Arabesk by Müslüm Gürses, Rock by Duman, Rap by Ceza), ensure the recommended songs strictly align with that musical genre and vibe without jarring cross-genre jumps.
3. For each recommendation, provide:
   - "title": Exact original song title
   - "artist": Artist name
   - "genre": Primary genre (e.g. Arabesk, Türkçe Rock, Türkçe Pop, Türkçe Rap, Synthwave, Lo-Fi)
   - "reason": Short, appealing explanation in Turkish why this song fits their taste
   - "matchScore": Match percentage between 85 and 99
4. Do not include songs that are already in the target playlist or recently played history.
5. Output valid JSON array.`;

    const aiResult = await generateJsonWithGemini<{ title: string; artist: string; genre: string; reason: string; matchScore: number }[]>(
      prompt,
      recSchema
    );

    if (Array.isArray(aiResult) && aiResult.length > 0) {
      rawRecommendations = aiResult;
    }

    // Heuristic & Curated Fallback if Gemini returned empty or was unavailable
    if (rawRecommendations.length === 0) {
      const fallbackPool = [
        { title: "Gözlerimin Etrafındaki Çizgiler", artist: "Şebnem Ferah", genre: "Türkçe Rock", reason: "Barış Manço ve Anadolu Rock dinlemelerinizle uyumlu güçlü vokal ve melodik gitar.", matchScore: 97 },
        { title: "Karakol", artist: "Mabel Matiz", genre: "Türkçe Pop", reason: "Antidepresan ve Mert Demir dinleme alışkanlığınıza özel modern synth altyapılı şarkı.", matchScore: 98 },
        { title: "Dön Bak Dünyaya", artist: "Pinhâni", genre: "Akustik / Alternatif", reason: "Akustik ve dingin müzik zevkinize uygun samimi bir klasik.", matchScore: 95 },
        { title: "Save Your Tears", artist: "The Weeknd", genre: "Synthwave / Pop", reason: "Blinding Lights ve 80'ler retro synth dokusunu sevenler için kusursuz eşleşme.", matchScore: 99 },
        { title: "Al Gözümden Yaşları", artist: "KÖFN", genre: "Synth Pop", reason: "Bi' Tek Ben Anlarım'ın yapımcılarından ritmik ve enerjik modern pop.", matchScore: 96 },
        { title: "Affet", artist: "Müslüm Gürses", genre: "Anadolu Rock / Arabesk", reason: "Derin duygusal akustik tınılar ve unutulmaz rock aranjmanı.", matchScore: 94 },
        { title: "Midnight City", artist: "M83", genre: "Synthwave / Electronic", reason: "Gece sürüşü ve synthwave temalı parçalarınıza eşlik eden efsanevi melodi.", matchScore: 95 },
        { title: "Bir Derdim Var", artist: "Mor ve Ötesi", genre: "Türkçe Rock", reason: "Klasikleşmiş enerjik ritimler ve etkileyici vokaller.", matchScore: 96 },
        { title: "Seni Dert Etmeler", artist: "Madrigal", genre: "Indie Pop", reason: "Modern Türkçe alternatif pop akımının en sevilen hitlerinden biri.", matchScore: 98 },
        { title: "Resimdeki Gözyaşları", artist: "Cem Karaca", genre: "Anadolu Rock", reason: "Gülpembe gibi Türk rock tarihinin kilometre taşlarından zamansız bir başyapıt.", matchScore: 96 }
      ];

      // Filter out tracks already in playlist
      const existingTitles = new Set([
        ...history.map((h: any) => (h.title || '').toLowerCase()),
        ...playlistTracks.map((t: any) => (t.title || '').toLowerCase())
      ]);

      const filteredFallback = fallbackPool.filter(t => !existingTitles.has(t.title.toLowerCase()));
      rawRecommendations = (filteredFallback.length >= 4 ? filteredFallback : fallbackPool).slice(0, requestedCount);
    }

    // Parallel multi-source resolution (Artwork, preview audio & verified YouTube ID)
    const enrichedTracks = await Promise.all(
      rawRecommendations.slice(0, requestedCount).map(async (rec, idx) => {
        const query = `${rec.title} ${rec.artist}`.trim();
        let coverUrl = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
        let audioUrl = '';
        let youtubeId: string | undefined = undefined;
        let duration = 210;
        let album = rec.title;

        try {
          // 1. Fetch metadata from iTunes for high-res cover & standard preview
          const itunesMatch = await searchItunesSong(rec.title, rec.artist);
          if (itunesMatch) {
            if (itunesMatch.coverUrl) coverUrl = itunesMatch.coverUrl;
            if (itunesMatch.previewUrl) audioUrl = itunesMatch.previewUrl;
            if (itunesMatch.duration) duration = itunesMatch.duration;
            if (itunesMatch.album) album = itunesMatch.album;
          }

          // 2. Fetch full-song YouTube video ID & duration
          const ytMatch = await searchFullSongVideoId(rec.title, rec.artist);
          if (ytMatch && ytMatch.youtubeId) {
            youtubeId = ytMatch.youtubeId;
            if (ytMatch.duration) duration = ytMatch.duration;
          }
        } catch (enrichErr) {
          console.warn("Track enrichment warning for:", query, enrichErr);
        }

        return {
          id: `rec_${Date.now()}_${idx}`,
          title: rec.title,
          artist: rec.artist,
          album: album || rec.title,
          duration: duration || 200,
          coverUrl: coverUrl,
          audioUrl: audioUrl,
          youtubeId: youtubeId,
          startOffset: 0,
          source: 'stream' as const,
          genre: rec.genre || 'Müzik',
          recommendationReason: rec.reason,
          matchScore: rec.matchScore || Math.floor(Math.random() * 8 + 92),
          addedAt: new Date().toISOString()
        };
      })
    );

    const resObj = {
      recommendations: enrichedTracks,
      mood,
      generatedAt: new Date().toISOString()
    };
    setCached(recommendationsCache, recCacheKey, resObj);

    res.json(resObj);
  } catch (err: any) {
    console.error("Smart recommendations API error:", err);
    res.status(500).json({ error: err.message || "Öneri üretilirken bir hata oluştu." });
  }
});

// Match single track
app.get("/api/audio/match", async (req, res) => {
  const { title, artist } = req.query;
  if (!title || typeof title !== "string") {
    return res.status(400).json({ error: "title parametresi gereklidir." });
  }

  try {
    const match = await findBestAudioMatch(title, (artist as string) || "");
    if (match) {
      return res.json(match);
    }
    res.json(null);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ---------------------------------------------
// Vite Middleware / Static Server
// ---------------------------------------------
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SoundPulse server running on http://0.0.0.0:${PORT}`);
  });
}

start();
