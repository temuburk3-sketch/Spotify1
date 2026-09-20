// Netlify Serverless Function for Audio Full-Source YouTube Resolution
export const handler = async (event: any) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const params = event.queryStringParameters || {};
  const title = (params.title || '').trim();
  const artist = (params.artist || '').trim();
  const excludeId = (params.excludeId || '').trim();

  if (!title) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Title required' })
    };
  }

  const cleanTitle = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
  const cleanArtist = artist.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();

  const queries = [
    `${cleanTitle} ${cleanArtist} Official Audio`,
    `${cleanTitle} ${cleanArtist} Topic`,
    `${cleanTitle} ${cleanArtist}`
  ];

  const candidateIds: string[] = [];
  let primaryId: string | null = null;
  let detectedDuration = 210;

  const addCandidate = (id: string, dur?: number) => {
    if (id && id.length === 11 && id !== excludeId && !candidateIds.includes(id)) {
      candidateIds.push(id);
      if (!primaryId) {
        primaryId = id;
        if (dur && dur > 30) detectedDuration = dur;
      }
    }
  };

  // Strategy A: YouTube InnerTube API
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
        const itData: any = await itRes.json();
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

              if (durSecs >= 35 && durSecs <= 900) {
                addCandidate(v.videoId, durSecs);
              }
            }
          }
        }
      }
    } catch {}
  }

  // Strategy B: Invidious Open Public Instances Fallback
  if (!primaryId) {
    const invInstances = [
      'https://inv.tux.pizza',
      'https://invidious.nerdvpn.de',
      'https://vid.puffyan.us'
    ];
    for (const inst of invInstances) {
      if (primaryId) break;
      try {
        const res = await fetch(`${inst}/api/v1/search?q=${encodeURIComponent(queries[0])}&type=video`, {
          signal: AbortSignal.timeout(3000)
        });
        if (res.ok) {
          const items: any = await res.json();
          if (Array.isArray(items)) {
            for (const item of items) {
              if (item.videoId && item.lengthSeconds && item.lengthSeconds >= 35) {
                addCandidate(item.videoId, item.lengthSeconds);
              }
            }
          }
        }
      } catch {}
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      youtubeId: primaryId,
      duration: detectedDuration,
      candidateIds: candidateIds.length > 0 ? candidateIds : (primaryId ? [primaryId] : []),
      title: cleanTitle,
      artist: cleanArtist
    })
  };
};
