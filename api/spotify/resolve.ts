export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const urlInput = req.query.url as string;
  if (!urlInput) {
    return res.status(400).json({ error: 'URL parametresi gerekli' });
  }

  const match = urlInput.match(/open\.spotify\.com\/(playlist|track|album|artist)\/([a-zA-Z0-9]+)/);
  if (!match) {
    return res.status(400).json({ error: 'Geçersiz Spotify linki' });
  }

  const [, type, id] = match;

  try {
    // 1. Try Spotify Web Player access token
    let token: string | null = null;
    try {
      const tokenRes = await fetch("https://open.spotify.com/get_access_token?reason=transport&productType=web_player", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
          "Referer": "https://open.spotify.com/"
        }
      });
      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        token = tokenData.accessToken || null;
      }
    } catch {}

    if (token) {
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

          // Paginate up to 100 pages (up to 10,000 tracks)
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
              const trkId = t.id || `trk_${idx}`;
              return {
                id: `sp_${id}_${trkId}_${idx}`,
                title: t.name || `Şarkı #${idx + 1}`,
                artist: t.artists?.map((a: any) => a.name).join(", ") || listAuthor,
                album: t.album?.name || listTitle,
                duration: t.duration_ms ? Math.round(t.duration_ms / 1000) : (t.duration ? Math.round(t.duration / 1000) : 190),
                coverUrl: t.album?.images?.[0]?.url || listCover,
                audioUrl: t.preview_url || "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/fb/3c/74/fb3c7480-781d-1830-3edd-fd15bdb23406/mzaf_17024654962565086082.plus.aac.p.m4a",
                source: 'spotify',
                spotifyId: trkId,
                addedAt: new Date().toISOString(),
                genre: 'Spotify Hit'
              };
            });

          return res.json({
            type,
            id,
            title: listTitle,
            author: listAuthor,
            coverUrl: listCover,
            tracks
          });
        }
      } else if (type === 'album') {
        const aRes = await fetch(`https://api.spotify.com/v1/albums/${id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (aRes.ok) {
          const aData = await aRes.json();
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
            artist: t.artists?.map((a: any) => a.name).join(", ") || aData.name,
            album: aData.name,
            duration: t.duration_ms ? Math.round(t.duration_ms / 1000) : 190,
            coverUrl: aData.images?.[0]?.url,
            audioUrl: t.preview_url || "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/fb/3c/74/fb3c7480-781d-1830-3edd-fd15bdb23406/mzaf_17024654962565086082.plus.aac.p.m4a",
            source: 'spotify',
            spotifyId: t.id || `alb_${idx}`,
            addedAt: new Date().toISOString(),
            genre: 'Spotify Album'
          }));

          return res.json({
            type,
            id,
            title: aData.name,
            author: aData.artists?.map((a: any) => a.name).join(", ") || "Sanatçı",
            coverUrl: aData.images?.[0]?.url,
            tracks
          });
        }
      }
    }

    // 2. Embed fallback
    const embedRes = await fetch(`https://open.spotify.com/embed/${type}/${id}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
      }
    });

    if (!embedRes.ok) {
      return res.status(502).json({ error: 'Spotify sunucusuna erişilemedi' });
    }

    const html = await embedRes.text();
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
    if (!nextDataMatch) {
      return res.status(400).json({ error: 'Spotify verisi ayrıştırılamadı' });
    }

    const nextData = JSON.parse(nextDataMatch[1]);
    const entity = nextData.props?.pageProps?.state?.data?.entity;
    if (!entity) {
      return res.status(404).json({ error: 'İçerik bulunamadı' });
    }

    const listTitle = entity.name || entity.title || 'Spotify Listesi';
    const author = entity.subtitle || entity.artists?.[0]?.name || 'Spotify';
    const coverUrl = entity.visualIdentity?.image?.[0]?.url || entity.coverArt?.sources?.[0]?.url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600';
    const rawTracks = type === 'track' ? [entity] : (entity.trackList || []);

    const tracks = rawTracks.map((t: any, idx: number) => ({
      id: `sp_${t.id || id}_${idx}`,
      title: t.title || t.name,
      artist: t.subtitle || (t.artists && t.artists.map((a: any) => a.name).join(', ')) || author,
      album: t.album?.name || listTitle,
      duration: t.duration ? Math.round(t.duration / 1000) : 190,
      coverUrl: t.coverArt?.sources?.[0]?.url || coverUrl,
      audioUrl: t.audioPreview?.url || t.preview_url || 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/fb/3c/74/fb3c7480-781d-1830-3edd-fd15bdb23406/mzaf_17024654962565086082.plus.aac.p.m4a',
      source: 'spotify',
      spotifyId: t.id || id,
      addedAt: new Date().toISOString(),
      genre: 'Spotify Hit'
    }));

    return res.json({
      type,
      id,
      title: listTitle,
      author,
      coverUrl,
      tracks
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Hata oluştu' });
  }
}
