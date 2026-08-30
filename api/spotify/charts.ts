export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const chartId = (req.query.chart as string) || 'top50_tr';
  const searchTerm = chartId === 'top50_global' ? 'Top Hits' : 'Türkçe Pop Hit';

  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=song&limit=50&country=TR`;
    const itRes = await fetch(itunesUrl);
    if (itRes.ok) {
      const itData = await itRes.json();
      if (itData.results && Array.isArray(itData.results)) {
        const tracks = itData.results.map((item: any, idx: number) => ({
          id: `chart_${item.trackId}`,
          title: item.trackName,
          artist: item.artistName,
          album: item.collectionName || item.trackName,
          duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 180,
          coverUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600',
          audioUrl: item.previewUrl || '',
          genre: item.primaryGenreName || 'Pop',
          source: 'stream',
          isOriginal: true,
          chartRank: idx + 1,
          popularity: 100 - idx,
          addedAt: new Date().toISOString()
        }));

        return res.json({
          title: chartId === 'top50_global' ? 'Spotify Global Top 50' : 'Spotify Türkiye Top 50',
          description: 'En çok dinlenen listelerin zirvesindeki hit parçalar.',
          tracks
        });
      }
    }
  } catch (e) {
    console.warn('Vercel API charts error:', e);
  }

  return res.json({ title: 'Top 50', description: 'Listeler', tracks: [] });
}
