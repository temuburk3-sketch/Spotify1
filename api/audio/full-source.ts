// In-memory cache for hot serverless instances on Vercel
const memCache = new Map<string, { youtubeId: string; duration: number; candidateIds: string[] }>();

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const title = (req.query.title as string) || '';
  const artist = (req.query.artist as string) || '';
  const excludeId = (req.query.excludeId as string) || '';

  if (!title) {
    return res.status(400).json({ error: 'Title required' });
  }

  const cleanTitle = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
  const cleanArtist = artist.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
  const cacheKey = `${cleanTitle.toLowerCase()}___${cleanArtist.toLowerCase()}${excludeId ? `___ex_${excludeId}` : ''}`;

  // 1. Check in-memory serverless cache
  if (memCache.has(cacheKey)) {
    const cached = memCache.get(cacheKey)!;
    res.setHeader('Cache-Control', 'public, s-maxage=604800, stale-while-revalidate=86400');
    return res.json({
      ...cached,
      title: cleanTitle,
      artist: cleanArtist,
      fromCache: true
    });
  }

  const queries = [
    `${cleanTitle} ${cleanArtist} Official Audio`,
    `${cleanTitle} ${cleanArtist} Topic`,
    `${cleanTitle} ${cleanArtist}`
  ];

  const candidateIds: string[] = [];
  let primaryId: string | null = null;
  let detectedDuration = 210;

  // Helper to add candidate
  const addCandidate = (id: string, dur?: number) => {
    if (id && id.length === 11 && id !== excludeId && !candidateIds.includes(id)) {
      candidateIds.push(id);
      if (!primaryId) {
        primaryId = id;
        if (dur && dur > 30) detectedDuration = dur;
      }
    }
  };

  // 2. Strategy A: YouTube InnerTube API (JSON-based, robust against datacenter IP blocks & no consent popups)
  for (const query of queries) {
    if (primaryId && candidateIds.length >= 3) break;
    try {
      const itRes = await fetch("https://www.youtube.com/youtubei/v1/search?prettyPrint=false", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "X-YouTube-Client-Name": "1",
          "X-YouTube-Client-Version": "2.20240501.00.00",
          "Origin": "https://www.youtube.com"
        },
        body: JSON.stringify({
          context: {
            client: {
              hl: "tr",
              gl: "TR",
              clientName: "WEB",
              clientVersion: "2.20240501.00.00"
            }
          },
          query: query.trim()
        }),
        signal: AbortSignal.timeout(4500)
      });

      if (itRes.ok) {
        const itData = await itRes.json();
        const section = itData?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;
        if (Array.isArray(section)) {
          for (const item of section) {
            const v = item.videoRenderer;
            if (v && v.videoId) {
              const durText = v.lengthText?.simpleText || "";
              const parts = durText.split(':').map(Number);
              let durSecs = 210;
              if (parts.length === 2) durSecs = parts[0] * 60 + parts[1];
              else if (parts.length === 3) durSecs = parts[0] * 3600 + parts[1] * 60 + parts[2];

              // Normal song length filter: 40s - 15m
              if (durSecs >= 40 && durSecs <= 900) {
                addCandidate(v.videoId, durSecs);
              }
            }
          }
        }
      }
    } catch {}
  }

  // 3. Strategy B: YouTube HTML search with anti-consent cookies (if InnerTube didn't return candidates)
  if (!primaryId) {
    for (const query of queries) {
      if (primaryId) break;
      try {
        const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`;
        const ytRes = await fetch(ytSearchUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
            "Cookie": "SOCS=CAESEwgDEgk2NDU4Mzc3Mzg; CONSENT=YES+cb.20230531-04-p0.en+FX+999; PREF=tz=Europe.Istanbul&hl=tr&gl=TR&f6=40000000; GPS=1"
          },
          signal: AbortSignal.timeout(4000)
        });

        if (ytRes.ok) {
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
                      addCandidate(video.videoId, durSecs);
                    }
                  }
                }
              }
            } catch {}
          }

          if (!primaryId) {
            const videoIdMatches = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)];
            for (const m of videoIdMatches) {
              addCandidate(m[1], 210);
            }
          }
        }
      } catch {}
    }
  }

  if (primaryId) {
    const payload = {
      youtubeId: primaryId,
      duration: detectedDuration,
      candidateIds: candidateIds.slice(0, 5)
    };

    // Cache in memory
    memCache.set(cacheKey, payload);
    if (memCache.size > 1000) {
      const first = memCache.keys().next().value;
      if (first) memCache.delete(first);
    }

    // Set Edge Cache header for Vercel CDN (7 days cache on edge!)
    res.setHeader('Cache-Control', 'public, s-maxage=604800, stale-while-revalidate=86400');
    return res.json({
      ...payload,
      title: cleanTitle,
      artist: cleanArtist
    });
  }

  return res.json({ youtubeId: null, candidateIds: [] });
}
