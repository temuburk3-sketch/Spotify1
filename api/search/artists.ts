export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = (req.query.q as string) || '';
  if (!query.trim()) {
    return res.json({ artists: [] });
  }

  const cleanQuery = query.trim();
  const artists: any[] = [];
  const seenNames = new Set<string>();

  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&entity=song&limit=30&country=TR`;
    const itRes = await fetch(itunesUrl);
    if (itRes.ok) {
      const itData = await itRes.json();
      if (itData.results && Array.isArray(itData.results)) {
        for (const item of itData.results) {
          if (!item.artistName) continue;
          const norm = item.artistName.toLowerCase().trim();
          if (!seenNames.has(norm)) {
            seenNames.add(norm);
            const cover = item.artworkUrl100
              ? item.artworkUrl100.replace('100x100bb', '600x600bb')
              : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600';

            artists.push({
              id: `art_${item.artistId || Math.random().toString(36).substring(7)}`,
              name: item.artistName,
              picture: cover,
              fans: 'Sanatçı • Popüler Parçalar',
              genres: [item.primaryGenreName || 'Pop'],
              popularity: 92
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn('Vercel API artist search error:', e);
  }

  return res.json({ artists });
}
