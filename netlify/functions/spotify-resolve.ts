// Netlify Serverless Function for Spotify Playlist, Track, Album & Podcast Resolution
export const handler = async (event: any) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const params = event.queryStringParameters || {};
  const rawUrl = (params.url || '').trim();

  if (!rawUrl) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'url parametresi gereklidir.' })
    };
  }

  try {
    let type: 'playlist' | 'track' | 'album' | 'artist' | 'episode' | 'show' | 'unknown' = 'unknown';
    let id = '';

    // Match Spotify URL formats: /intl-tr/playlist/..., /playlist/..., /album/..., /track/..., spotify:uri, etc.
    const match = rawUrl.match(/open\.spotify\.com\/(?:[a-zA-Z]{2}(?:-[a-zA-Z]{2})?\/)?(?:intl-[a-z]{2}\/)?(playlist|track|album|artist|episode|show)\/([a-zA-Z0-9]+)/i);
    if (match) {
      type = match[1].toLowerCase() as any;
      id = match[2];
    } else if (rawUrl.startsWith('spotify:')) {
      const parts = rawUrl.split(':');
      if (parts.length >= 3) {
        type = parts[1].toLowerCase() as any;
        id = parts[2].split('?')[0];
      }
    } else {
      const rawIdMatch = rawUrl.match(/([a-zA-Z0-9]{22})/);
      if (rawIdMatch) {
        id = rawIdMatch[1];
        type = 'playlist';
      }
    }

    if (!id || type === 'unknown') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Geçersiz Spotify bağlantısı.' })
      };
    }

    // Try fetching Spotify embed HTML from multiple valid endpoints
    const embedUrls = [
      `https://open.spotify.com/embed/${type}/${id}`,
      `https://embed.spotify.com/?uri=spotify:${type}:${id}`,
      `https://open.spotify.com/intl-tr/embed/${type}/${id}`,
      `https://open.spotify.com/embed/${type}/${id}?utm_source=oembed`
    ];

    let embedHtml = '';
    let successUrl = '';

    for (const targetUrl of embedUrls) {
      try {
        const res = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': 'https://open.spotify.com/'
          },
          signal: AbortSignal.timeout(6000)
        });

        if (res.ok) {
          const text = await res.text();
          if (text && (text.includes('__NEXT_DATA__') || text.includes('initial-state') || text.includes('resource'))) {
            embedHtml = text;
            successUrl = targetUrl;
            break;
          }
        }
      } catch {}
    }

    let entity: any = null;

    if (embedHtml) {
      // 1. __NEXT_DATA__
      const nextMatch = embedHtml.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (nextMatch) {
        try {
          const data = JSON.parse(nextMatch[1]);
          entity = data.props?.pageProps?.state?.data?.entity || data.props?.pageProps?.entity || data.entity;
        } catch {}
      }

      // 2. initial-state (plain or base64)
      if (!entity) {
        const initMatch = embedHtml.match(/<script id="initial-state"[^>]*>([\s\S]*?)<\/script>/);
        if (initMatch) {
          try {
            const raw = initMatch[1].trim();
            if (raw.startsWith('{')) {
              const data = JSON.parse(raw);
              entity = data.data?.entity || data.entity;
            } else {
              const str = Buffer.from(raw, 'base64').toString('utf8');
              const data = JSON.parse(str);
              entity = data.data?.entity || data.entity;
            }
          } catch {}
        }
      }

      // 3. resource (base64)
      if (!entity) {
        const resMatch = embedHtml.match(/<script id="resource"[^>]*>([\s\S]*?)<\/script>/);
        if (resMatch) {
          try {
            const raw = resMatch[1].trim();
            const str = Buffer.from(raw, 'base64').toString('utf8');
            const data = JSON.parse(str);
            entity = data.data?.entity || data.entity || data;
          } catch {}
        }
      }
    }

    // Extract title, author, cover
    const listTitle = entity?.name || entity?.title || 'Spotify Çalma Listesi';
    const authorName = entity?.subtitle || entity?.artists?.[0]?.name || entity?.owner?.display_name || 'Spotify';
    const listCover =
      entity?.visualIdentity?.image?.[0]?.url ||
      entity?.coverArt?.sources?.[0]?.url ||
      entity?.images?.[0]?.url ||
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80';

    const rawList: any[] = [];
    if (type === 'track' || type === 'episode') {
      if (entity) rawList.push(entity);
    } else if (entity?.trackList && Array.isArray(entity.trackList)) {
      rawList.push(...entity.trackList);
    } else if (entity?.tracks && Array.isArray(entity.tracks.items)) {
      rawList.push(...entity.tracks.items);
    } else if (entity?.episodes && Array.isArray(entity.episodes.items)) {
      rawList.push(...entity.episodes.items);
    } else if (entity?.episodes && Array.isArray(entity.episodes)) {
      rawList.push(...entity.episodes);
    }

    // If tracks were found, map them to Track items
    if (rawList.length > 0) {
      const tracks = rawList.map((item: any, idx: number) => {
        const t = item.track || item.episode || item;
        const trkTitle = t.title || t.name || `Parça #${idx + 1}`;
        let trkArtist = t.subtitle || (t.artists && t.artists.map((a: any) => a.name).join(', ')) || t.show?.name || authorName;

        if (trkTitle.includes(' - ') && (trkArtist === authorName || trkArtist === 'Spotify' || !trkArtist)) {
          const parts = trkTitle.split(' - ');
          if (parts.length >= 2 && parts[0].trim()) {
            trkArtist = parts[0].trim();
          }
        }

        const trkDuration = t.duration ? Math.round(t.duration / 1000) : (t.duration_ms ? Math.round(t.duration_ms / 1000) : 180);
        const trkId = t.id || (t.uri ? t.uri.replace('spotify:track:', '').replace('spotify:episode:', '') : `sp_${id}_${idx}`);
        const trkCover =
          t.coverArt?.sources?.[0]?.url ||
          t.visualIdentity?.image?.[0]?.url ||
          t.album?.images?.[0]?.url ||
          t.images?.[0]?.url ||
          listCover;

        const audioUrl = t.audioPreview?.url || t.preview_url || '';

        return {
          id: `sp_${trkId}_${idx}`,
          title: trkTitle,
          artist: trkArtist,
          album: t.album?.name || t.show?.name || listTitle,
          duration: trkDuration,
          coverUrl: trkCover,
          audioUrl: audioUrl,
          source: 'spotify',
          spotifyId: trkId,
          addedAt: new Date().toISOString(),
          genre: 'Spotify'
        };
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          type,
          id,
          title: listTitle,
          author: authorName,
          coverUrl: listCover,
          tracks
        })
      };
    }

    // Fallback: If embed had no tracks (e.g. private user playlist or regional restriction), try oEmbed for basic metadata
    const oembedRes = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(`https://open.spotify.com/${type}/${id}`)}`);
    if (oembedRes.ok) {
      const oData = await oembedRes.json();
      
      // If single track or episode, oEmbed title is the song
      if (type === 'track' || type === 'episode') {
        const cleanT = (oData.title || '').trim();
        const cleanA = (oData.author_name || '').trim();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            type,
            id,
            title: cleanT,
            author: cleanA,
            coverUrl: oData.thumbnail_url || listCover,
            tracks: [{
              id: `sp_${id}_0`,
              title: cleanT,
              artist: cleanA || 'Spotify',
              album: cleanT,
              duration: 210,
              coverUrl: oData.thumbnail_url || listCover,
              audioUrl: '',
              source: 'spotify',
              spotifyId: id,
              addedAt: new Date().toISOString(),
              genre: 'Spotify'
            }]
          })
        };
      }

      // For playlists/albums with 0 tracks found:
      // Return 422 with a clear explanation so the UI can prompt the user to make the playlist public or paste songs
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({
          error: `"${oData.title || 'Bu çalma listesi'}" içeriği okunamadı. Çalma listesi Spotify'da "Gizli" (Özel) olabilir. Lütfen Spotify uygulamasında listeyi "Herkese Açık" (Public) yapın veya şarkı adlarını manuel olarak aratıp ekleyin.`,
          title: oData.title,
          coverUrl: oData.thumbnail_url,
          isPrivate: true
        })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Spotify içeriği bulunamadı. Lütfen bağlantının doğruluğunu kontrol edin.' })
    };
  } catch (err: any) {
    console.error('Netlify spotify-resolve function error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Spotify listesi çözümlenirken sunucu hatası oluştu.' })
    };
  }
};
