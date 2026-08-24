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

  try {
    const queries = [
      `${cleanTitle} ${cleanArtist} Official Audio`,
      `${cleanTitle} ${cleanArtist} Topic`,
      `${cleanTitle} ${cleanArtist}`
    ];

    for (const query of queries) {
      const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`;
      const ytRes = await fetch(ytSearchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
          "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7"
        }
      });
      const html = await ytRes.text();

      const jsonMatch = html.match(/var ytInitialData = ({.*?});<\/script>/s) || html.match(/window\["ytInitialData"\] = ({.*?});<\/script>/s);
      if (jsonMatch) {
        try {
          const ytData = JSON.parse(jsonMatch[1]);
          const contents = ytData?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;
          if (Array.isArray(contents)) {
            for (const item of contents) {
              const video = item.videoRenderer;
              if (video && video.videoId) {
                const durText = video.lengthText?.simpleText || "";
                const parts = durText.split(':').map(Number);
                let durSecs = 200;
                if (parts.length === 2) durSecs = parts[0] * 60 + parts[1];
                else if (parts.length === 3) durSecs = parts[0] * 3600 + parts[1] * 60 + parts[2];

                if (durSecs >= 40 && durSecs <= 900) {
                  return res.json({
                    youtubeId: video.videoId,
                    duration: durSecs,
                    title: cleanTitle,
                    artist: cleanArtist
                  });
                }
              }
            }
          }
        } catch {}
      }

      const videoIdMatches = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)];
      for (const m of videoIdMatches) {
        if (m[1] && m[1].length === 11) {
          return res.json({
            youtubeId: m[1],
            duration: 210,
            title: cleanTitle,
            artist: cleanArtist
          });
        }
      }
    }

    return res.json({ youtubeId: null });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Error resolving audio' });
  }
}
