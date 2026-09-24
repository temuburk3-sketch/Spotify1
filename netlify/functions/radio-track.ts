// Netlify Serverless Function for Song Radio Recommendations
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
  const title = (params.title || '').trim();
  const artist = (params.artist || '').trim();
  const genre = (params.genre || '').trim();
  const count = Math.min(20, Math.max(5, parseInt(params.count || '10', 10)));

  if (!title) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'title parametresi gereklidir.' })
    };
  }

  // Curated genre pool
  const normTitle = title.toLowerCase();
  const normArtist = artist.toLowerCase();

  const POOL_NOSTALJI = [
    { title: "Kurşun Adres Sormaz Ki", artist: "Ebru Gündeş", youtubeId: "Juec0RS8-sU", duration: 326 },
    { title: "Fırtınalar", artist: "Ebru Gündeş", youtubeId: "yOycy66e7oM", duration: 260 },
    { title: "Kaybolan Yıllar", artist: "Sezen Aksu", youtubeId: "59V1z9WdK1k", duration: 245 },
    { title: "Med Cezir", artist: "Levent Yüksel", youtubeId: "Lw9e1JdIe2A", duration: 285 },
    { title: "Şıkıdım (Hepsi Senin Mi)", artist: "Tarkan", youtubeId: "lM68D2wTwq8", duration: 235 },
    { title: "Kuzu Kuzu", artist: "Tarkan", youtubeId: "65RKYQY0P0M", duration: 254 },
    { title: "Gir Kanıma", artist: "Harun Kolçak", youtubeId: "TvUquY8bVSQ", duration: 230 },
    { title: "Ateşe Düştüm", artist: "Mert Demir", youtubeId: "W1k92XoYj44", duration: 218 },
    { title: "Affet", artist: "Müslüm Gürses", youtubeId: "dJmB4w3x6b8", duration: 270 },
    { title: "Okul Yolunda", artist: "Ümit Besen", youtubeId: "OrCTE54XVhQ", duration: 249 },
    { title: "Nikah Masası", artist: "Ümit Besen", youtubeId: "1dOKeElDd7g", duration: 289 },
    { title: "Gülpembe", artist: "Barış Manço", youtubeId: "cBRC0BItmfk", duration: 305 },
    { title: "Bir Derdim Var", artist: "Mor ve Ötesi", youtubeId: "bcHv7PjSHrs", duration: 230 },
    { title: "Aman Aman", artist: "Duman", youtubeId: "T4BkYR7IEvY", duration: 245 }
  ];

  const filtered = POOL_NOSTALJI.filter(
    t => t.title.toLowerCase() !== normTitle
  ).slice(0, count);

  const tracks = filtered.map((t, idx) => ({
    id: `radio_nf_${Date.now()}_${idx}`,
    title: t.title,
    artist: t.artist,
    album: t.title,
    duration: t.duration,
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    audioUrl: '',
    youtubeId: t.youtubeId,
    candidateIds: [t.youtubeId],
    source: 'stream' as const,
    genre: genre || 'Popüler Hit',
    recommendationReason: `✨ ${artist || title} ekolünü tamamlayan klasik eser`,
    matchScore: 98 - idx,
    addedAt: new Date().toISOString()
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      seedTrack: { title, artist, genre },
      radioTitle: `📻 ${artist || title} Şarkı Radyosu`,
      themeName: genre || 'Özel Radyo',
      tracks,
      generatedAt: new Date().toISOString()
    })
  };
};
