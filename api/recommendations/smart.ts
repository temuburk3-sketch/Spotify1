export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const body = req.body || {};
  const history = Array.isArray(body.history) ? body.history : [];
  const topGenres = Array.isArray(body.topGenres) ? body.topGenres : [];
  const topArtists = Array.isArray(body.topArtists) ? body.topArtists : [];
  const playlistTracks = Array.isArray(body.playlistTracks) ? body.playlistTracks : [];
  const count = body.count || 12;

  // Extract all existing titles & artists to avoid giving what the user already has
  const existingTracks = new Set<string>();
  for (const t of [...history, ...playlistTracks]) {
    if (t.title) existingTracks.add(t.title.toLowerCase().trim());
  }

  // 1. Analyze dominant genres & artists
  let searchSeeds: string[] = [];

  if (playlistTracks.length > 0) {
    // Determine dominant genre and artists in the target playlist
    const artistCounts: Record<string, number> = {};
    const genreCounts: Record<string, number> = {};

    for (const t of playlistTracks) {
      if (t.artist) {
        artistCounts[t.artist] = (artistCounts[t.artist] || 0) + 1;
      }
      if (t.genre) {
        genreCounts[t.genre] = (genreCounts[t.genre] || 0) + 1;
      }
    }

    const sortedArtists = Object.entries(artistCounts).sort((a, b) => b[1] - a[1]).map(e => e[0]);
    const sortedGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).map(e => e[0]);

    searchSeeds = [...sortedArtists.slice(0, 3), ...sortedGenres.slice(0, 2)];
  } else if (topArtists.length > 0 || topGenres.length > 0) {
    searchSeeds = [...topArtists.slice(0, 3), ...topGenres.slice(0, 2)];
  }

  if (searchSeeds.length === 0) {
    searchSeeds = ['Türkçe Pop 2024', 'Duman', 'Mabel Matiz', 'Müslüm Gürses', 'Ezhel'];
  }

  const recommendations: any[] = [];
  const seenIds = new Set<string>();

  for (const seed of searchSeeds) {
    try {
      const itUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(seed)}&entity=song&limit=10&country=TR`;
      const itRes = await fetch(itUrl);
      if (itRes.ok) {
        const data = await itRes.json();
        if (data.results && Array.isArray(data.results)) {
          for (const item of data.results) {
            if (!item.trackName || !item.artistName) continue;
            const normTitle = item.trackName.toLowerCase().trim();
            if (existingTracks.has(normTitle)) continue;

            const id = `itunes_${item.trackId}`;
            if (!seenIds.has(id)) {
              seenIds.add(id);
              recommendations.push({
                id,
                title: item.trackName,
                artist: item.artistName,
                album: item.collectionName || item.trackName,
                duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 180,
                coverUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600',
                audioUrl: item.previewUrl || '',
                genre: item.primaryGenreName || 'Pop',
                source: 'stream',
                isOriginal: true,
                recommendationReason: `${seed} dinlemeleriniz ve zevk profilinizle eşleşen öneri`,
                matchScore: Math.floor(90 + Math.random() * 10),
                addedAt: new Date().toISOString()
              });
            }
          }
        }
      }
    } catch {}
  }

  // Shuffle for variety
  for (let i = recommendations.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [recommendations[i], recommendations[j]] = [recommendations[j], recommendations[i]];
  }

  return res.json({
    recommendations: recommendations.slice(0, count)
  });
}
