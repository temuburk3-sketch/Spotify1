export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const artistName = (req.query.artistName as string) || '';
  if (!artistName.trim()) {
    return res.json({ tracks: [] });
  }

  const cleanName = artistName.trim();
  const tracks: any[] = [];
  const seenIds = new Set<string>();

  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanName)}&entity=song&limit=50&country=TR`;
    const itRes = await fetch(itunesUrl);
    if (itRes.ok) {
      const itData = await itRes.json();
      if (itData.results && Array.isArray(itData.results)) {
        for (const item of itData.results) {
          if (!item.trackName) continue;
          const id = `itunes_${item.trackId}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            const cover = item.artworkUrl100
              ? item.artworkUrl100.replace('100x100bb', '600x600bb')
              : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600';

            tracks.push({
              id,
              title: item.trackName,
              artist: item.artistName || cleanName,
              album: item.collectionName || item.trackName,
              duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 180,
              coverUrl: cover,
              audioUrl: item.previewUrl || '',
              genre: item.primaryGenreName || 'Pop',
              source: 'stream',
              isOriginal: true,
              popularity: 95,
              addedAt: new Date().toISOString()
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn('Vercel API artist top tracks error:', e);
  }

  return res.json({ tracks });
}
