import { Playlist } from '../types';

export const DEFAULT_PLAYLISTS: Playlist[] = [
  {
    id: 'pl_turkce_hitler',
    name: 'Türkçe Pop & Akustik Hitleri',
    description: 'En sevilen Türkçe pop, akustik ve alternatif hitler. Kesintisiz tam sürüm şarkılar, sınırsız atlama ve internetsiz dinleme özelliğiyle.',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/cd/6a/fb/cd6afb23-3442-e7ab-3b39-46f458bcad40/196922249655_Cover.jpg/600x600bb.jpg',
    colorTheme: 'from-emerald-900 to-slate-950',
    createdAt: '2026-01-10T12:00:00Z',
    updatedAt: '2026-08-20T15:30:00Z',
    isCollaborative: true,
    roomCode: '782941',
    collaborators: [
      {
        id: 'u_burak',
        name: 'Burak (Sen)',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: 'owner',
        isOnline: true,
        lastActive: 'Şimdi'
      },
      {
        id: 'u_zeynep',
        name: 'Zeynep',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        role: 'editor',
        isOnline: true,
        lastActive: '2 dk önce'
      },
      {
        id: 'u_can',
        name: 'Can',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        role: 'editor',
        isOnline: false,
        lastActive: '1 saat önce'
      }
    ],
    tracks: [
      {
        id: 'trk_1',
        title: 'Antidepresan',
        artist: 'Mert Demir, Mabel Matiz',
        album: 'Antidepresan - Single',
        duration: 243,
        coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/cd/6a/fb/cd6afb23-3442-e7ab-3b39-46f458bcad40/196922249655_Cover.jpg/600x600bb.jpg',
        audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/fb/3c/74/fb3c7480-781d-1830-3edd-fd15bdb23406/mzaf_17024654962565086082.plus.aac.p.m4a',
        youtubeId: 'eQZUgr5sw90',
        startOffset: 0,
        source: 'stream',
        genre: 'Türkçe Pop',
        addedAt: '2026-08-15T10:00:00Z',
        upvotes: 18,
        timedLyrics: [
          { time: 0, text: '🎵 (Gitar & Ritim Girişi)' },
          { time: 4, text: 'Kafamda bir sürü soru, cevapsız hepsi' },
          { time: 9, text: 'Bir yanım kaçmak ister, bir yanım bekler seni' },
          { time: 14, text: 'Gitme burdan sen olmadan ben yaşayamam' },
          { time: 20, text: 'Gözlerimi kapatsam da unutamam' },
          { time: 25, text: 'Bana bir antidepresan gibi geldin sevgilim' },
          { time: 30, text: 'Tüm dertleri unutturdu o tatlı gülüşün' }
        ]
      },
      {
        id: 'trk_2',
        title: 'Bi’ Tek Ben Anlarım',
        artist: 'KÖFN',
        album: 'Bi’ Tek Ben Anlarım',
        duration: 197,
        coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/49/0b/97/490b976f-3322-3aec-eacc-e3876727a112/cover.jpg/600x600bb.jpg',
        audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview116/v4/ae/9d/83/ae9d833e-c551-a08e-f9f3-1cb68138d233/mzaf_2262890875392296175.plus.aac.p.m4a',
        youtubeId: 'PuFJt3d1QUU',
        startOffset: 0,
        source: 'stream',
        genre: 'Synth Pop',
        addedAt: '2026-08-16T11:00:00Z',
        upvotes: 14,
        timedLyrics: [
          { time: 0, text: '🎹 Synth melodisi başlıyor...' },
          { time: 5, text: 'Teninin kokusu sinmiş yastığıma' },
          { time: 10, text: 'Hala adın yankılanır bu boş odada' },
          { time: 16, text: 'Bi’ tek ben anlarım senin halinden' },
          { time: 22, text: 'Dökülürken kelimeler o güzel dilinden' },
          { time: 28, text: 'Bırak aksın gözyaşları, temizlesin hüznü' }
        ]
      },
      {
        id: 'trk_3',
        title: 'Gülpembe',
        artist: 'Barış Manço',
        album: 'Hal Hal & Sözüm Meclisten Dışarı',
        duration: 312,
        coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/96/b5/6f/96b56f34-4bb9-3aa5-add2-5a2504e74562/cover.jpg/600x600bb.jpg',
        audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/15/84/08/15840844-8e98-e477-10dd-c2a82e30b2a3/mzaf_17204737277130849361.plus.aac.p.m4a',
        youtubeId: 'zd8IFDgQCUc',
        startOffset: 0,
        source: 'stream',
        genre: 'Anadolu Rock',
        addedAt: '2026-08-17T09:30:00Z',
        upvotes: 25,
        timedLyrics: [
          { time: 0, text: '🎸 Efsanevi piyano ve gitar girişi...' },
          { time: 7, text: 'Sen gülünce güller açar Gülpembe' },
          { time: 15, text: 'Bülbüller seni dinler dertlenir de' },
          { time: 22, text: 'Gözlerimde yaşlar diner Gülpembe' },
          { time: 28, text: 'Güz yağmurlarıyla bir gün göçtün gittin' }
        ]
      },
      {
        id: 'trk_4',
        title: 'Ateşe Düştüm',
        artist: 'Mert Demir',
        album: 'Ateşe Düştüm - Single',
        duration: 231,
        coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/43/39/bb/4339bbf7-d2c3-22ed-90e7-9a14416780c8/196922638558_Cover.jpg/600x600bb.jpg',
        audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview126/v4/3c/a3/d1/3ca3d19c-d799-12af-0019-fd694b91812a/mzaf_11591350407176047081.plus.aac.p.m4a',
        youtubeId: 'RQmXet6kZ-Y',
        startOffset: 0,
        source: 'stream',
        genre: 'Akustik / Soul',
        addedAt: '2026-08-18T14:15:00Z',
        upvotes: 11,
        timedLyrics: [
          { time: 0, text: '🎸 Akustik ritim ve nefes...' },
          { time: 6, text: 'Ateşe düştüm yanıyorum' },
          { time: 12, text: 'Göz göre göre kanıyorum' },
          { time: 19, text: 'Kurtar beni bu yangından' },
          { time: 26, text: 'Bıktım artık bu hicrandan' }
        ]
      },
      {
        id: 'trk_5',
        title: 'Blinding Lights',
        artist: 'The Weeknd',
        album: 'After Hours',
        duration: 204,
        coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/a6/6e/bf/a66ebf79-5008-8948-b352-a790fc87446b/19UM1IM04638.rgb.jpg/600x600bb.jpg',
        audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/17/b4/8f/17b48f9a-0b93-6bb8-fe1d-3a16623c2cfb/mzaf_9560252727299052414.plus.aac.p.m4a',
        youtubeId: 'fHI8X4OXluQ',
        startOffset: 0,
        source: 'stream',
        genre: 'Synthwave / Pop',
        addedAt: '2026-08-19T10:00:00Z',
        upvotes: 30,
        timedLyrics: [
          { time: 0, text: '⚡ 80s Retro Synth Lead' },
          { time: 6, text: "I've been on my own for long enough" },
          { time: 12, text: 'Maybe you can show me how to love, maybe' },
          { time: 18, text: "I'm going through withdrawals" },
          { time: 24, text: "I said, ooh, I'm blinded by the lights!" }
        ]
      }
    ]
  },
  {
    id: 'pl_gece_surusu',
    name: 'Gece Sürüşü & Lo-Fi Beats',
    description: 'Boş caddeler, neon ışıklar ve derin baslar için özenle seçilmiş odaklanma listesi.',
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
    colorTheme: 'from-purple-950 to-indigo-950',
    createdAt: '2026-02-14T18:00:00Z',
    updatedAt: '2026-08-21T21:00:00Z',
    isCollaborative: false,
    tracks: [
      {
        id: 'trk_lofi_1',
        title: 'Snowman (Lo-Fi Study)',
        artist: 'WYS',
        album: '1 A.M Study Session',
        duration: 255,
        coverUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80',
        audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview116/v4/ae/9d/83/ae9d833e-c551-a08e-f9f3-1cb68138d233/mzaf_2262890875392296175.plus.aac.p.m4a',
        youtubeId: '5qap5aO4i9A',
        startOffset: 0,
        source: 'stream',
        genre: 'Lo-Fi',
        addedAt: '2026-08-01T10:00:00Z',
        upvotes: 14
      },
      {
        id: 'trk_lofi_2',
        title: 'Nightcall (Synthwave Drive)',
        artist: 'Kavinsky',
        album: 'Drive Soundtrack',
        duration: 257,
        coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
        audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/17/b4/8f/17b48f9a-0b93-6bb8-fe1d-3a16623c2cfb/mzaf_9560252727299052414.plus.aac.p.m4a',
        youtubeId: 'MV_3Dpw-BRY',
        startOffset: 0,
        source: 'stream',
        genre: 'Synthwave',
        addedAt: '2026-08-02T12:00:00Z',
        upvotes: 21
      },
      {
        id: 'trk_lofi_3',
        title: 'Kingdom in Blue',
        artist: 'Kupla',
        album: 'Mind Flow & Calm',
        duration: 158,
        coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
        audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview126/v4/3c/a3/d1/3ca3d19c-d799-12af-0019-fd694b91812a/mzaf_11591350407176047081.plus.aac.p.m4a',
        youtubeId: 'GkX3bVf6eM0',
        startOffset: 0,
        source: 'stream',
        genre: 'Ambient Lo-Fi',
        addedAt: '2026-08-03T15:00:00Z',
        upvotes: 5
      }
    ]
  },
  {
    id: 'pl_gym_workout',
    name: 'Enerji & Motivasyon (Gym Mode)',
    description: 'Sıfır duraksama, yüksek BPM ve maksimum tempo. Reklamsız tam motivasyon.',
    coverUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80',
    colorTheme: 'from-red-950 to-neutral-950',
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-08-19T07:45:00Z',
    isCollaborative: true,
    roomCode: '319582',
    collaborators: [
      {
        id: 'u_burak',
        name: 'Burak (Sen)',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: 'owner',
        isOnline: true,
        lastActive: 'Şimdi'
      }
    ],
    tracks: [
      {
        id: 'trk_gym_1',
        title: 'Fight Back (Workout Power)',
        artist: 'NEFFEX',
        album: 'Beast Mode EDM',
        duration: 197,
        coverUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80',
        audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/fb/3c/74/fb3c7480-781d-1830-3edd-fd15bdb23406/mzaf_17024654962565086082.plus.aac.p.m4a',
        youtubeId: 'CYDP_8UTAus',
        startOffset: 0,
        source: 'stream',
        genre: 'EDM / Breakbeat',
        addedAt: '2026-08-10T08:00:00Z',
        upvotes: 11
      },
      {
        id: 'trk_gym_2',
        title: 'Legend (Hardstyle Motivation)',
        artist: 'Tevvez',
        album: 'Velocity Core',
        duration: 189,
        coverUrl: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600&auto=format&fit=crop&q=80',
        audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/15/84/08/15840844-8e98-e477-10dd-c2a82e30b2a3/mzaf_17204737277130849361.plus.aac.p.m4a',
        youtubeId: '5OZ-JOSWx1Q',
        startOffset: 0,
        source: 'stream',
        genre: 'Electronic',
        addedAt: '2026-08-11T09:10:00Z',
        upvotes: 9
      }
    ]
  }
];
