export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = (req.query.q as string) || '';
  const cleanQuery = query.trim().toLowerCase();

  const curatedPlaylists = [
    {
      id: 'pl_tr_pop',
      name: 'Türkçe Pop 2024 & Hit Parçalar',
      description: 'Mert Demir, Mabel Matiz, Semicenk, Simge ve en çok dinlenen Türkçe Pop hitleri.',
      coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/43/39/bb/4339bbf7-d2c3-22ed-90e7-9a14416780c8/196922638558_Cover.jpg/600x600bb.jpg',
      trackCount: 45,
      author: 'Spotify & SoundPulse',
      source: 'spotify'
    },
    {
      id: 'pl_arabesk_damar',
      name: 'Arabesk Efsaneleri & Damar Şarkılar',
      description: 'Müslüm Gürses, Bergen, Ferdi Tayfur, Azer Bülbül ve unutulmaz damar parçalar.',
      coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music118/v4/bc/f5/a3/bcf5a3c2-dcfb-5542-a4f6-8c4d52f6bfa7/8691531003426.jpg/600x600bb.jpg',
      trackCount: 50,
      author: 'Spotify & SoundPulse',
      source: 'spotify'
    },
    {
      id: 'pl_tr_rock',
      name: 'Türkçe Rock & Anadolu Klasikleri',
      description: 'Duman, Mor ve Ötesi, Barış Manço, Şebnem Ferah, Teoman ve efsane rock marşları.',
      coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/ec/3b/b7/ec3bb7c2-d352-7b27-2e1d-85472851eaee/8697407051189.jpg/600x600bb.jpg',
      trackCount: 40,
      author: 'Spotify & SoundPulse',
      source: 'spotify'
    },
    {
      id: 'pl_tr_rap',
      name: 'Türkçe Rap & Trap Ateşi',
      description: 'BLOK3, Ezhel, Ceza, Sagopa Kajmer, UZI ve en sert rap parçaları.',
      coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/91/97/34/919734e3-3b10-67c4-05e8-f9b1bc108154/cover.jpg/600x600bb.jpg',
      trackCount: 35,
      author: 'Spotify & SoundPulse',
      source: 'spotify'
    }
  ];

  const matched = cleanQuery
    ? curatedPlaylists.filter(p => p.name.toLowerCase().includes(cleanQuery) || p.description.toLowerCase().includes(cleanQuery))
    : curatedPlaylists;

  return res.json({ playlists: matched });
}
