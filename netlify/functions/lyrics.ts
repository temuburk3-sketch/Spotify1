// Netlify Serverless Function for Lyrics
export const handler = async (event: any) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  let title = '';
  let artist = '';
  let duration = 0;

  if (event.httpMethod === 'POST' && event.body) {
    try {
      const parsed = JSON.parse(event.body);
      title = parsed.title || '';
      artist = parsed.artist || '';
      duration = parsed.duration || 0;
    } catch {}
  } else if (event.queryStringParameters) {
    title = event.queryStringParameters.title || '';
    artist = event.queryStringParameters.artist || '';
    duration = Number(event.queryStringParameters.duration) || 0;
  }

  // Strategy A: lrclib.net open public API (CORS friendly, synchronized lyrics)
  try {
    const lrcUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`;
    const lrcRes = await fetch(lrcUrl, {
      headers: { 'User-Agent': 'SoundPulse Web Player (Netlify)' },
      signal: AbortSignal.timeout(3500)
    });
    if (lrcRes.ok) {
      const data: any = await lrcRes.json();
      if (data.syncedLyrics || data.plainLyrics) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            syncedLyrics: data.syncedLyrics || null,
            plainLyrics: data.plainLyrics || '',
            source: 'lrclib'
          })
        };
      }
    }
  } catch {}

  // Return graceful fallback so UI never stays stuck
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      syncedLyrics: null,
      plainLyrics: `${artist} - ${title}\n(Bu şarkı için canlı söz akışı hazırlanıyor...)`,
      source: 'fallback'
    })
  };
};
