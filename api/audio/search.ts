export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = (req.query.q as string) || '';
  if (!query.trim()) {
    return res.json({ results: [] });
  }

  const cleanQuery = query.trim();
  const results: any[] = [];
  const seenIds = new Set<string>();

  try {
    // 1. Query iTunes Turkey
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&entity=song&limit=50&country=TR`;
    const itRes = await fetch(itunesUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      }
    });

    if (itRes.ok) {
      const itData = await itRes.json();
      if (itData.results && Array.isArray(itData.results)) {
        for (const item of itData.results) {
          if (!item.trackName || !item.artistName) continue;
          const id = `itunes_${item.trackId}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            const cover = item.artworkUrl100
              ? item.artworkUrl100.replace('100x100bb', '600x600bb')
              : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600';

            results.push({
              id,
              title: item.trackName,
              artist: item.artistName,
              album: item.collectionName || item.trackName,
              duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 180,
              coverUrl: cover,
              audioUrl: item.previewUrl || '',
              genre: item.primaryGenreName || 'Pop',
              source: 'stream',
              isOriginal: true,
              popularity: 90,
              addedAt: new Date().toISOString()
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn('Vercel API iTunes search error:', e);
  }

  // 2. Query Audius
  if (results.length < 10) {
    try {
      const audiusUrl = `https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(cleanQuery)}&app_name=SOUNDPULSE`;
      const aRes = await fetch(audiusUrl);
      if (aRes.ok) {
        const aData = await aRes.json();
        if (aData.data && Array.isArray(aData.data)) {
          for (const item of aData.data.slice(0, 15)) {
            const id = `aud_${item.id}`;
            if (!seenIds.has(id)) {
              seenIds.add(id);
              results.push({
                id,
                title: item.title,
                artist: item.user?.name || 'Sanatçı',
                album: item.genre || 'Audius Stream',
                duration: item.duration || 200,
                coverUrl: item.artwork?.['480x480'] || item.artwork?.['150x150'] || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600',
                audioUrl: `https://discoveryprovider.audius.co/v1/tracks/${item.id}/stream?app_name=SOUNDPULSE`,
                genre: item.genre || 'Music',
                source: 'stream',
                isOriginal: true,
                popularity: 80,
                addedAt: new Date().toISOString()
              });
            }
          }
        }
      }
    } catch {}
  }

  return res.json({ results });
}
