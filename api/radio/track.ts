export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const queryArtist = (req.query.artist as string) || (req.body?.artist as string) || '';
  const queryTitle = (req.query.title as string) || (req.body?.title as string) || '';
  const queryGenre = (req.query.genre as string) || (req.body?.genre as string) || '';
  const excludeIds = new Set<string>(
    Array.isArray(req.body?.excludeIds)
      ? req.body.excludeIds
      : req.query.excludeIds ? (req.query.excludeIds as string).split(',') : []
  );

  const cleanArtist = queryArtist.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
  const cleanTitle = queryTitle.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();

  // Related artist graph
  const artistGraph: Record<string, string[]> = {
    'müslüm gürses': ['Ferdi Tayfur', 'Bergen', 'Azer Bülbül', 'Cengiz Kurtoğlu', 'Orhan Gencebay', 'Ebru Gündeş'],
    'ferdi tayfur': ['Müslüm Gürses', 'Bergen', 'Azer Bülbül', 'Cengiz Kurtoğlu', 'Orhan Gencebay', 'İbrahim Tatlıses'],
    'bergen': ['Müslüm Gürses', 'Ferdi Tayfur', 'Güllü', 'Kibariye', 'Cengiz Kurtoğlu'],
    'azer bülbül': ['Müslüm Gürses', 'Ferdi Tayfur', 'Hakan Taşıyan', 'Bergen', 'Ahmet Kaya'],
    'cengiz kurtoğlu': ['Ümit Besen', 'Müslüm Gürses', 'Ferdi Tayfur', 'Hakan Altun', 'Coşkun Sabah'],
    'duman': ['Mor ve Ötesi', 'Şebnem Ferah', 'Teoman', 'Adamlar', 'Madrigal', 'Yüzyüzeyken Konuşuruz', 'Athena'],
    'mor ve ötesi': ['Duman', 'Şebnem Ferah', 'Teoman', 'Manga', 'Gripin', 'Pentagram'],
    'şebnem ferah': ['Mor ve Ötesi', 'Duman', 'Teoman', 'Özlem Tekin', 'Ogün Sanlısoy', 'Pentagram'],
    'teoman': ['Duman', 'Mor ve Ötesi', 'Şebnem Ferah', 'Madrigal', 'Kaan Tangöze', 'Pinhani'],
    'manga': ['Mor ve Ötesi', 'Duman', 'Gripin', 'Athena', 'Pentagram'],
    'barış manço': ['Cem Karaca', 'Erkin Koray', 'Fikret Kızılok', 'Moğollar', 'Edip Akbayram'],
    'cem karaca': ['Barış Manço', 'Erkin Koray', 'Moğollar', 'Selda Bağcan', 'Edip Akbayram'],
    'ceza': ['Sagopa Kajmer', 'Ezhel', 'Şanışer', 'Contra', 'No.1', 'Gazapizm'],
    'sagopa kajmer': ['Ceza', 'Kolera', 'Şanışer', 'Gazapizm', 'Defkhan', 'No.1'],
    'ezhel': ['BLOK3', 'UZI', 'Motive', 'Ceza', 'Murda', 'Cakal'],
    'uzi': ['Motive', 'BLOK3', 'Cakal', 'Reckol', 'Lvbel C5', 'Ezhel'],
    'motive': ['UZI', 'BLOK3', 'Cakal', 'Ezhel', 'Bebeto', 'Era7capone'],
    'mert demir': ['Mabel Matiz', 'Semicenk', 'Simge', 'KÖFN', 'Emir Can İğrek', 'Zeynep Bastık'],
    'mabel matiz': ['Mert Demir', 'Semicenk', 'KÖFN', 'Göksel', 'Sıla', 'Ceylan Ertem'],
    'semicenk': ['Mert Demir', 'Doğu Swag', 'Rast', 'Burak Bulut', 'Kurtuluş Kuş', 'Simge'],
    'simge': ['Mert Demir', 'Edis', 'Merve Özbey', 'İrem Derici', 'Zeynep Bastık', 'Hadise'],
    'tarkan': ['Kenan Doğulu', 'Mustafa Sandal', 'Murat Boz', 'Edis', 'Yalın', 'Burak Kut'],
    'sezen aksu': ['Yıldız Tilbe', 'Sıla', 'Zuhal Olcay', 'Leman Sam', 'Nükhet Duru', 'Sertab Erener'],
    'the weeknd': ['Daft Punk', 'Kavinsky', 'Bruno Mars', 'Post Malone', 'Drake', 'Dua Lipa']
  };

  const lowerArtist = cleanArtist.toLowerCase();
  let relatedArtists: string[] = [];
  for (const [key, list] of Object.entries(artistGraph)) {
    if (lowerArtist.includes(key) || key.includes(lowerArtist)) {
      relatedArtists = list;
      break;
    }
  }

  if (relatedArtists.length === 0) {
    if (queryGenre.toLowerCase().includes('rock')) {
      relatedArtists = ['Duman', 'Mor ve Ötesi', 'Teoman', 'Adamlar', 'Madrigal'];
    } else if (queryGenre.toLowerCase().includes('arabesk') || queryGenre.toLowerCase().includes('damar')) {
      relatedArtists = ['Müslüm Gürses', 'Ferdi Tayfur', 'Bergen', 'Azer Bülbül', 'Cengiz Kurtoğlu'];
    } else if (queryGenre.toLowerCase().includes('rap') || queryGenre.toLowerCase().includes('hip')) {
      relatedArtists = ['Ezhel', 'Ceza', 'Sagopa Kajmer', 'UZI', 'Motive', 'BLOK3'];
    } else {
      relatedArtists = [cleanArtist || 'Türkçe Hit', 'Mert Demir', 'Mabel Matiz', 'Semicenk', 'Simge'];
    }
  }

  const results: any[] = [];
  const seenIds = new Set<string>();

  // Fetch top tracks for seed artist and related artists
  const searchTargets = [cleanArtist, ...relatedArtists.slice(0, 4)].filter(Boolean);

  for (const artistName of searchTargets) {
    try {
      const itUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=song&limit=8&country=TR`;
      const res = await fetch(itUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.results && Array.isArray(data.results)) {
          for (const item of data.results) {
            if (!item.trackName || !item.artistName) continue;
            const id = `itunes_${item.trackId}`;
            if (!seenIds.has(id) && !excludeIds.has(id) && !item.trackName.toLowerCase().includes(cleanTitle.toLowerCase())) {
              seenIds.add(id);
              results.push({
                id,
                title: item.trackName,
                artist: item.artistName,
                album: item.collectionName || item.trackName,
                duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 180,
                coverUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600',
                audioUrl: item.previewUrl || '',
                genre: item.primaryGenreName || queryGenre || 'Pop',
                source: 'stream',
                isOriginal: true,
                recommendationReason: `${cleanArtist} tarzı radyo parçası`,
                matchScore: Math.floor(88 + Math.random() * 11),
                addedAt: new Date().toISOString()
              });
            }
          }
        }
      }
    } catch {}
  }

  // Shuffle array for natural radio feel
  for (let i = results.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [results[i], results[j]] = [results[j], results[i]];
  }

  return res.json({
    radioTitle: `${cleanTitle ? `"${cleanTitle}" • ` : ''}${cleanArtist || 'Sanatçı'} Radyosu`,
    tracks: results.slice(0, 25)
  });
}
