async function scrapeShow(showId: string) {
  try {
    const showUrl = `https://open.spotify.com/show/${showId}`;
    const res = await fetch(showUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });

    if (!res.ok) return null;
    const html = await res.text();

    const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                       html.match(/<title>([^<]+)<\/title>/i);
    const showTitle = titleMatch ? titleMatch[1].replace(/ \| Spotify$/, '').replace(/ \| Podcast on Spotify$/, '').trim() : 'Podcast Serisi';

    const coverMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    const showCover = coverMatch ? coverMatch[1] : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600';

    const episodes: Array<{ id: string; title: string; subtitle?: string; duration?: number; date?: string; coverUrl?: string }> = [];
    const episodeRegex = /href=["']\/(?:intl-[a-z]{2}\/)?episode\/([a-zA-Z0-9]{22})["'][^>]*>([^<]+)<\/a>/g;
    let match;
    const seenIds = new Set<string>();

    while ((match = episodeRegex.exec(html)) !== null) {
      const epId = match[1];
      const epName = match[2].trim();
      if (!seenIds.has(epId) && epName) {
        seenIds.add(epId);
        episodes.push({
          id: epId,
          title: epName,
          subtitle: showTitle,
          coverUrl: showCover
        });
      }
    }

    return {
      id: showId,
      title: showTitle,
      coverUrl: showCover,
      totalEpisodes: episodes.length,
      episodes
    };
  } catch (err) {
    console.error('scrapeShow error:', err);
    return null;
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const urlInput = req.query.url as string;
  const expandSeries = req.query.expandSeries !== 'false';
  if (!urlInput) {
    return res.status(400).json({ error: 'URL parametresi gerekli' });
  }

  const match = urlInput.match(/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(playlist|track|album|artist|episode|show)\/([a-zA-Z0-9]+)/);
  if (!match) {
    return res.status(400).json({ error: 'Geçersiz Spotify linki' });
  }

  const [, type, id] = match;

  try {
    // If show directly
    if (type === 'show') {
      const showData = await scrapeShow(id);
      if (showData && showData.episodes.length > 0) {
        const tracks = showData.episodes.map((ep, idx) => ({
          id: `sp_show_${id}_${ep.id}_${idx}`,
          title: ep.title,
          artist: showData.title,
          album: showData.title,
          duration: 210,
          coverUrl: showData.coverUrl,
          audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/fb/3c/74/fb3c7480-781d-1830-3edd-fd15bdb23406/mzaf_17024654962565086082.plus.aac.p.m4a',
          source: 'spotify',
          spotifyId: ep.id,
          addedAt: new Date().toISOString(),
          genre: 'Podcast / Şiir'
        }));

        return res.json({
          type: 'show',
          id,
          title: showData.title,
          author: showData.title,
          coverUrl: showData.coverUrl,
          tracks
        });
      }
    }

    // Embed fetch
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

    if (type === 'episode') {
      const singleTrack = {
        id: `sp_${id}_0`,
        title: listTitle,
        artist: author,
        album: author,
        duration: entity.duration ? Math.round(entity.duration / 1000) : 210,
        coverUrl,
        audioUrl: entity.audioPreview?.url || 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/fb/3c/74/fb3c7480-781d-1830-3edd-fd15bdb23406/mzaf_17024654962565086082.plus.aac.p.m4a',
        source: 'spotify',
        spotifyId: id,
        addedAt: new Date().toISOString(),
        genre: 'Podcast / Şiir'
      };

      let parentShowInfo: any = undefined;
      let allSeriesTracks = [singleTrack];

      const parentUri = entity.relatedEntityUri || '';
      const showMatch = parentUri.match(/spotify:show:([a-zA-Z0-9]+)/);
      if (showMatch && expandSeries) {
        const showId = showMatch[1];
        const scrapedShow = await scrapeShow(showId);
        if (scrapedShow && scrapedShow.episodes.length > 0) {
          parentShowInfo = {
            id: showId,
            title: scrapedShow.title,
            coverUrl: scrapedShow.coverUrl,
            totalEpisodes: scrapedShow.totalEpisodes
          };

          allSeriesTracks = scrapedShow.episodes.map((ep, idx) => ({
            id: `sp_ep_${ep.id}_${idx}`,
            title: ep.title,
            artist: scrapedShow.title,
            album: scrapedShow.title,
            duration: 210,
            coverUrl: scrapedShow.coverUrl || coverUrl,
            audioUrl: (ep.id === id && entity.audioPreview?.url) ? entity.audioPreview.url : 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/fb/3c/74/fb3c7480-781d-1830-3edd-fd15bdb23406/mzaf_17024654962565086082.plus.aac.p.m4a',
            source: 'spotify',
            spotifyId: ep.id,
            addedAt: new Date().toISOString(),
            genre: 'Podcast / Şiir'
          }));

          const thisIdx = allSeriesTracks.findIndex(t => t.spotifyId === id);
          if (thisIdx > 0) {
            const [item] = allSeriesTracks.splice(thisIdx, 1);
            allSeriesTracks.unshift(item);
          }
        }
      }

      return res.json({
        type: 'episode',
        id,
        title: listTitle,
        author,
        coverUrl,
        tracks: allSeriesTracks,
        singleTrack,
        seriesEpisodes: allSeriesTracks,
        parentShow: parentShowInfo
      });
    }

    const rawTracks = entity.trackList || (type === 'track' ? [entity] : []);
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
