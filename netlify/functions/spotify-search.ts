// Netlify Serverless Function for Spotify & Open Podcast Search
export const handler = async (event: any) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const params = event.queryStringParameters || {};
  const query = (params.q || '').trim();
  const type = (params.type || 'all').toLowerCase();

  if (!query) {
    return { statusCode: 200, headers, body: JSON.stringify({ items: [] }) };
  }

  const items: any[] = [];
  const seenIds = new Set<string>();

  // 1. Search iTunes open podcast / show directory
  if (type === 'all' || type === 'show' || type === 'podcast') {
    try {
      const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=podcast&limit=8`, {
        signal: AbortSignal.timeout(4000)
      });
      if (itunesRes.ok) {
        const data = await itunesRes.json();
        for (const item of (data.results || [])) {
          const podId = `pod_${item.collectionId}`;
          if (!seenIds.has(podId)) {
            seenIds.add(podId);
            items.push({
              id: podId,
              type: 'show',
              title: item.collectionName,
              author: item.artistName || 'Yayıncı',
              coverUrl: item.artworkUrl600 || item.artworkUrl100 || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600',
              trackCount: item.trackCount || 0,
              feedUrl: item.feedUrl || '',
              category: 'Podcast Yayınları',
              isPodcast: true,
              spotifyUrl: item.collectionViewUrl || ''
            });
          }
        }
      }
    } catch {}
  }

  // 2. Search iTunes open songs / albums directory
  try {
    const songRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=12`, {
      signal: AbortSignal.timeout(4000)
    });
    if (songRes.ok) {
      const sData = await songRes.json();
      for (const item of (sData.results || [])) {
        const trkId = `trk_${item.trackId}`;
        if (!seenIds.has(trkId)) {
          seenIds.add(trkId);
          items.push({
            id: trkId,
            type: 'track',
            title: item.trackName,
            author: item.artistName,
            coverUrl: item.artworkUrl100?.replace('100x100bb', '600x600bb') || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600',
            trackCount: 1,
            category: item.primaryGenreName || 'Pop Hit',
            isPodcast: false,
            spotifyUrl: item.trackViewUrl || ''
          });
        }
      }
    }
  } catch {}

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ items })
  };
};
