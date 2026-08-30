export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const title = (req.query.title as string) || '';
  const artist = (req.query.artist as string) || '';

  if (!title) {
    return res.status(400).json({ error: 'Title required' });
  }

  const cleanTitle = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
  const cleanArtist = artist.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
  const query = `${cleanTitle} ${cleanArtist}`.trim();

  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1&country=TR`;
    const itRes = await fetch(itunesUrl);
    if (itRes.ok) {
      const data = await itRes.json();
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        return res.json({
          previewUrl: item.previewUrl,
          coverUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : undefined,
          duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 180,
          album: item.collectionName,
          artist: item.artistName
        });
      }
    }
  } catch (e) {
    console.warn('Vercel API audio match error:', e);
  }

  return res.json({ error: 'Not found' });
}
