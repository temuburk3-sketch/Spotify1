import { Track, Playlist, ListeningHistoryItem, ListeningHabitsSummary, SmartRecommendationOptions } from '../types';
import { searchUniversalTracks } from './universalSearchService';
import { POPULAR_ORIGINAL_HITS } from '../data/popularOriginalTracks';

const HISTORY_KEY = 'soundpulse_listening_history';
const PIN_KEY = 'soundpulse_user_pin';
const LOCK_STATE_KEY = 'soundpulse_is_locked';
const ENDLESS_AUTOPLAY_KEY = 'soundpulse_endless_autoplay';
const SMART_SHUFFLE_KEY = 'soundpulse_smart_shuffle_enabled';

export type MusicThemeCategory =
  | 'turkce_nostalji_taverna'
  | 'turkce_90lar_pop'
  | 'arabesk_damar'
  | 'turkce_rock'
  | 'turkce_rap'
  | 'turkce_pop'
  | 'synthwave_retro'
  | 'lofi_chill'
  | 'workout_edm'
  | 'global_pop'
  | 'general';

export interface ThematicClassification {
  category: MusicThemeCategory;
  displayName: string;
  badge: string;
  color: string;
}

// ----------------------------------------------------
// Related Artists Graph (Spotify-style Peer Mapping)
// ----------------------------------------------------
export const ARTIST_SIMILARITY_GRAPH: Record<string, string[]> = {
  // 70'ler & 80'ler Nostalji, Taverna & Klasik Şanson (Spotify Piyanist Ekosistemi)
  'ferdi özbeğen': [
    'Asu Maralman',
    'Esmeray',
    'Ayla Dikmen',
    'Tanju Okan',
    'Nilüfer',
    'Tülay Özer',
    'Selami Şahin',
    'Cengiz Kurtoğlu',
    'Ümit Besen',
    'Neşe Karaböcek',
    'Gülden Karaböcek',
    'Dario Moreno',
    'Semiramis Pekkan',
    'Zeki Müren',
    'Ayten Alpman',
    'Erol Evgin',
    'İlhan Şeşen',
    'Nazan Öncel',
    'Ahmet Kaya',
    'Pilli Bebek',
    'Mehmet Güreli'
  ],
  'tanju okan': [
    'Ferdi Özbeğen',
    'Dario Moreno',
    'Ayten Alpman',
    'Erol Evgin',
    'Nilüfer',
    'Esmeray',
    'Ayla Dikmen',
    'Zeki Müren',
    'İlhan Şeşen'
  ],
  'asu maralman': [
    'Ferdi Özbeğen',
    'Esmeray',
    'Ayla Dikmen',
    'Tülay Özer',
    'Semiramis Pekkan',
    'Tanju Okan',
    'Nilüfer'
  ],
  'esmeray': [
    'Ferdi Özbeğen',
    'Ayla Dikmen',
    'Asu Maralman',
    'Tülay Özer',
    'Nilüfer',
    'Semiramis Pekkan',
    'Tanju Okan'
  ],
  'ayla dikmen': [
    'Ferdi Özbeğen',
    'Esmeray',
    'Asu Maralman',
    'Tülay Özer',
    'Semiramis Pekkan',
    'Tanju Okan',
    'Nilüfer'
  ],
  'tülay özer': [
    'Ferdi Özbeğen',
    'Esmeray',
    'Ayla Dikmen',
    'Nilüfer',
    'Asu Maralman',
    'Gülden Karaböcek',
    'Selami Şahin'
  ],
  'selami şahin': [
    'Ferdi Özbeğen',
    'Ümit Besen',
    'Cengiz Kurtoğlu',
    'Zeki Müren',
    'Coşkun Sabah',
    'Arif Susam'
  ],
  'cengiz kurtoğlu': [
    'Ümit Besen',
    'Ferdi Özbeğen',
    'Arif Susam',
    'Nejat Alp',
    'Selami Şahin',
    'Coşkun Sabah',
    'Hakan Altun'
  ],
  'ümit besen': [
    'Cengiz Kurtoğlu',
    'Ferdi Özbeğen',
    'Arif Susam',
    'Nejat Alp',
    'Selami Şahin',
    'Coşkun Sabah'
  ],
  'neşe karaböcek': [
    'Gülden Karaböcek',
    'Ferdi Özbeğen',
    'Gönül Akkor',
    'Zeki Müren',
    'Müzeyyen Senar'
  ],
  'gülden karaböcek': [
    'Neşe Karaböcek',
    'Ferdi Özbeğen',
    'Tülay Özer',
    'Esmeray',
    'Selami Şahin'
  ],
  'dario moreno': [
    'Ferdi Özbeğen',
    'Tanju Okan',
    'Ayten Alpman',
    'Semiramis Pekkan',
    'Erol Evgin'
  ],
  'semiramis pekkan': [
    'Ferdi Özbeğen',
    'Ayla Dikmen',
    'Esmeray',
    'Tanju Okan',
    'Dario Moreno',
    'Nilüfer'
  ],
  'zeki müren': [
    'Ferdi Özbeğen',
    'Müzeyyen Senar',
    'Tanju Okan',
    'Selami Şahin',
    'Emel Sayın',
    'Gönül Yazar'
  ],
  'ayten alpman': [
    'Tanju Okan',
    'Ferdi Özbeğen',
    'Erol Evgin',
    'İlhan Şeşen',
    'Nilüfer'
  ],
  'erol evgin': [
    'Ferdi Özbeğen',
    'Tanju Okan',
    'Nilüfer',
    'Ayten Alpman',
    'Kayahan',
    'İlhan Şeşen'
  ],
  'ilhan şeşen': [
    'Ferdi Özbeğen',
    'Fikret Kızılok',
    'Tanju Okan',
    'Bülent Ortaçgil',
    'Yeni Türkü',
    'Ezginin Günlüğü'
  ],

  // 90'lar Altın Çağ Türkçe Pop (Kurşun Adres Sormaz Ki -> Kaybolan Yıllar Akışı)
  'kenan doğulu': [
    'Sezen Aksu',
    'Levent Yüksel',
    'Sertab Erener',
    'Harun Kolçak',
    'Aşkın Nur Yengi',
    'Bendeniz',
    'Yaşar',
    'Candan Erçetin',
    'Nilüfer',
    'Mirkelam',
    'Fatih Erkoç',
    'Çelik',
    'Tarkan'
  ],
  'sezen aksu': [
    'Levent Yüksel',
    'Sertab Erener',
    'Kenan Doğulu',
    'Harun Kolçak',
    'Aşkın Nur Yengi',
    'Nilüfer',
    'Candan Erçetin',
    'Bendeniz',
    'Yaşar',
    'Zuhal Olcay',
    'Leman Sam'
  ],
  'levent yüksel': [
    'Sezen Aksu',
    'Sertab Erener',
    'Kenan Doğulu',
    'Harun Kolçak',
    'Aşkın Nur Yengi',
    'Yaşar',
    'Mirkelam',
    'Fatih Erkoç'
  ],
  'sertab erener': [
    'Sezen Aksu',
    'Levent Yüksel',
    'Kenan Doğulu',
    'Harun Kolçak',
    'Aşkın Nur Yengi',
    'Nilüfer',
    'Şebnem Ferah'
  ],
  'harun kolçak': [
    'Aşkın Nur Yengi',
    'Kenan Doğulu',
    'Levent Yüksel',
    'Sezen Aksu',
    'Bendeniz',
    'Çelik',
    'Sertab Erener'
  ],
  'aşkın nur yengi': [
    'Sezen Aksu',
    'Sertab Erener',
    'Levent Yüksel',
    'Harun Kolçak',
    'Kenan Doğulu',
    'Nilüfer',
    'Zerrin Özer'
  ],
  'bendeniz': [
    'Harun Kolçak',
    'Kenan Doğulu',
    'Aşkın Nur Yengi',
    'Yaşar',
    'Çelik',
    'Burak Kut'
  ],
  'yaşar': [
    'Levent Yüksel',
    'Kenan Doğulu',
    'Bendeniz',
    'Harun Kolçak',
    'Ferda Anıl Yarkın',
    'Ege'
  ],
  'candan erçetin': [
    'Sezen Aksu',
    'Göksel',
    'Zuhal Olcay',
    'Leman Sam',
    'Yeni Türkü',
    'Ezginin Günlüğü',
    'Nilüfer'
  ],
  'nilüfer': [
    'Sezen Aksu',
    'Kayahan',
    'Ajda Pekkan',
    'Kenan Doğulu',
    'Aşkın Nur Yengi',
    'Ferdi Özbeğen',
    'Nükhet Duru'
  ],
  'mirkelam': [
    'Kenan Doğulu',
    'Levent Yüksel',
    'Çelik',
    'Burak Kut',
    'Mustafa Sandal'
  ],
  'çelik': [
    'Kenan Doğulu',
    'Harun Kolçak',
    'Bendeniz',
    'Mirkelam',
    'Burak Kut',
    'Mustafa Sandal'
  ],

  // Arabesk & Damar
  'müslüm gürses': ['Ferdi Tayfur', 'Bergen', 'Azer Bülbül', 'Cengiz Kurtoğlu', 'Orhan Gencebay', 'Ebru Gündeş', 'Ahmet Kaya'],
  'ferdi tayfur': ['Müslüm Gürses', 'Bergen', 'Azer Bülbül', 'Cengiz Kurtoğlu', 'Orhan Gencebay', 'İbrahim Tatlıses'],
  'bergen': ['Müslüm Gürses', 'Ferdi Tayfur', 'Güllü', 'Kibariye', 'Cengiz Kurtoğlu', 'Ebru Gündeş'],
  'azer bülbül': ['Müslüm Gürses', 'Ferdi Tayfur', 'Hakan Taşıyan', 'Bergen', 'Ahmet Kaya', 'Güllü'],
  'ibrahim tatlıses': ['Müslüm Gürses', 'Ferdi Tayfur', 'Mahsun Kırmızıgül', 'Ebru Gündeş', 'Sibel Can'],
  'ahmet kaya': ['Müslüm Gürses', 'Selda Bağcan', 'Edip Akbayram', 'Grup Yorum', 'Cevdet Bağca', 'Deniz Koyuncu'],
  'ebru gündeş': ['Sibel Can', 'Yıldız Tilbe', 'Müslüm Gürses', 'Gülben Ergen', 'Zara', 'Linet'],
  'yıldız tilbe': ['Sezen Aksu', 'Sıla', 'Müslüm Gürses', 'Ebru Gündeş', 'Ceylan Ertem', 'Hakan Altun'],
  'hakan altun': ['Cengiz Kurtoğlu', 'Yıldız Tilbe', 'Ümit Besen', 'Serdar Ortaç', 'Baha'],

  // Türkçe Rock & Anadolu Rock
  'duman': ['Mor ve Ötesi', 'Şebnem Ferah', 'Teoman', 'Adamlar', 'Madrigal', 'Yüzyüzeyken Konuşuruz', 'Athena', 'Kaan Tangöze'],
  'mor ve ötesi': ['Duman', 'Şebnem Ferah', 'Teoman', 'Manga', 'Gripin', 'Pentagram', 'Redd'],
  'şebnem ferah': ['Mor ve Ötesi', 'Duman', 'Teoman', 'Özlem Tekin', 'Ogün Sanlısoy', 'Pentagram'],
  'teoman': ['Duman', 'Mor ve Ötesi', 'Şebnem Ferah', 'Madrigal', 'Kaan Tangöze', 'Pinhani', 'Haluk Levent'],
  'manga': ['Mor ve Ötesi', 'Duman', 'Gripin', 'Athena', 'Pentagram', 'Model'],
  'barış manço': ['Cem Karaca', 'Erkin Koray', 'Fikret Kızılok', 'Moğollar', 'Edip Akbayram', 'İlhan İrem'],
  'cem karaca': ['Barış Manço', 'Erkin Koray', 'Moğollar', 'Selda Bağcan', 'Edip Akbayram'],
  'erkin koray': ['Barış Manço', 'Cem Karaca', 'Moğollar', 'Fikret Kızılok', '3 Hürel'],
  'adamlar': ['Yüzyüzeyken Konuşuruz', 'Dolu Kadehi Ters Tut', 'Madrigal', 'Büyük Ev Ablukada', 'Yaşlı Amca', 'Son Feci Bisiklet'],
  'yüzyüzeyken konuşuruz': ['Adamlar', 'Dolu Kadehi Ters Tut', 'Madrigal', 'Son Feci Bisiklet', 'Yaşlı Amca', 'DKTT'],
  'madrigal': ['Adamlar', 'Yüzyüzeyken Konuşuruz', 'Dolu Kadehi Ters Tut', 'Dedublüman', 'KÖFN', 'Pinhani'],
  'pinhani': ['Madrigal', 'Mor ve Ötesi', 'Duman', 'Yüksek Sadakat', 'Gripin', 'Zakkum'],
  'dedublüman': ['Madrigal', 'Yüzyüzeyken Konuşuruz', 'Adamlar', 'Pinhani', 'Mavzer Tabancası'],
  'dolu kadehi ters tut': ['Adamlar', 'Yüzyüzeyken Konuşuruz', 'Madrigal', 'Büyük Ev Ablukada', 'Yaşlı Amca'],
  'yaşlı amca': ['Adamlar', 'Yüzyüzeyken Konuşuruz', 'Son Feci Bisiklet', 'Dolu Kadehi Ters Tut', 'Madrigal'],

  // Türkçe Rap & Hip-Hop
  'ceza': ['Sagopa Kajmer', 'Ezhel', 'Şanışer', 'Contra', 'No.1', 'Gazapizm', 'Allame', 'Jokzilla'],
  'sagopa kajmer': ['Ceza', 'Kolera', 'Şanışer', 'Gazapizm', 'Defkhan', 'No.1', 'Dr. Fuchs'],
  'ezhel': ['BLOK3', 'UZI', 'Motive', 'Ceza', 'Murda', 'Cakal', 'Reckol', 'Lvbel C5'],
  'uzi': ['Motive', 'BLOK3', 'Cakal', 'Reckol', 'Lvbel C5', 'Ezhel', 'Heijan', 'Muti'],
  'motive': ['UZI', 'BLOK3', 'Cakal', 'Ezhel', 'Bebeto', 'Era7capone', 'Ati242'],
  'blok3': ['UZI', 'Motive', 'Cakal', 'Lvbel C5', 'Reckol', 'Ezhel'],
  'şanışer': ['Sokrat ST', 'Ceza', 'Sagopa Kajmer', 'Contra', 'Gazapizm', 'Sehabe'],
  'gazapizm': ['Ceza', 'Sagopa Kajmer', 'No.1', 'Cash Flow', 'Anıl Piyancı'],
  'ati242': ['Motive', 'UZI', 'Batuflex', 'Lvbel C5', 'Ezhel'],
  'cakal': ['Reckol', 'UZI', 'BLOK3', 'Lvbel C5', 'Motive'],

  // 2020'ler Modern Türkçe Pop & Alternatif (Mabel Matiz, Mert Demir, KÖFN vb.)
  'mert demir': ['Mabel Matiz', 'Semicenk', 'Simge', 'KÖFN', 'Emir Can İğrek', 'Zeynep Bastık', 'Melike Şahin'],
  'mabel matiz': ['Mert Demir', 'Semicenk', 'KÖFN', 'Göksel', 'Sıla', 'Ceylan Ertem', 'Melike Şahin', 'Edis'],
  'semicenk': ['Mert Demir', 'Doğu Swag', 'Rast', 'Burak Bulut', 'Kurtuluş Kuş', 'Simge', 'Reynmen'],
  'simge': ['Mert Demir', 'Edis', 'Merve Özbey', 'İrem Derici', 'Zeynep Bastık', 'Hadise', 'Derya Uluğ'],
  'tarkan': ['Kenan Doğulu', 'Mustafa Sandal', 'Murat Boz', 'Edis', 'Yalın', 'Burak Kut'],
  'sıla': ['Sezen Aksu', 'Mabel Matiz', 'Göksel', 'Sertab Erener', 'Ceylan Ertem', 'Simge', 'Yıldız Tilbe'],
  'göksel': ['Mabel Matiz', 'Sıla', 'Nilüfer', 'Sezen Aksu', 'Candan Erçetin', 'Zuhal Olcay', 'Nükhet Duru'],
  'kayahan': ['Nilüfer', 'Sezen Aksu', 'Fikret Kızılok', 'Barış Manço', 'İlhan İrem'],
  'edis': ['Tarkan', 'Mert Demir', 'Simge', 'Zeynep Bastık', 'Murat Boz', 'Gülşen'],
  'emir can iğrek': ['Mert Demir', 'Mabel Matiz', 'KÖFN', 'Dedublüman', 'Madrigal', 'Pinhani'],
  'melike şahin': ['Mabel Matiz', 'Mert Demir', 'Ceylan Ertem', 'Gaye Su Akyol', 'Evrencan Gündüz'],
  'zeynep bastık': ['Mert Demir', 'Edis', 'Simge', 'Emir Can İğrek', 'Anıl Piyancı', 'KÖFN'],
  'köfn': ['Mert Demir', 'Mabel Matiz', 'Simge', 'Dedublüman', 'Madrigal', 'Emir Can İğrek'],

  // Global Hits & Synthwave
  'the weeknd': ['Daft Punk', 'Kavinsky', 'Bruno Mars', 'Post Malone', 'Drake', 'Dua Lipa', 'SZA'],
  'skepta': ['Che Ecru', 'Drake', 'Stormzy', 'Dave', 'Central Cee', 'The Weeknd', 'Travis Scott', 'B-Young'],
  'che ecru': ['Skepta', 'Brent Faiyaz', 'PARTYNEXTDOOR', 'Bryson Tiller', 'SZA', 'The Weeknd', 'Steve Lacy'],
  'sza': ['Summer Walker', 'Jhené Aiko', 'Kehlani', 'Billie Eilish', 'Frank Ocean', 'Steve Lacy', 'Dua Lipa'],
  'sabrina carpenter': ['Olivia Rodrigo', 'Chappell Roan', 'Dua Lipa', 'Taylor Swift', 'Gracie Abrams', 'Ariana Grande'],
  'olivia rodrigo': ['Sabrina Carpenter', 'Billie Eilish', 'Taylor Swift', 'Conan Gray', 'Chappell Roan', 'Lorde'],
  'harry styles': ['Niall Horan', 'Shawn Mendes', 'Louis Tomlinson', 'The Weeknd', 'Bruno Mars', 'Dua Lipa'],
  'post malone': ['The Weeknd', 'Swae Lee', 'Khalid', 'Juice WRLD', 'Drake', 'Bruno Mars', 'Harry Styles'],
  'drake': ['The Weeknd', 'Travis Scott', 'Post Malone', 'Kendrick Lamar', '21 Savage', 'PARTYNEXTDOOR', 'Skepta'],
  'steve lacy': ['Frank Ocean', 'Tyler, The Creator', 'Brent Faiyaz', 'Childish Gambino', 'SZA', 'Dominic Fike'],
  'bruno mars': ['Anderson .Paak', 'Silk Sonic', 'The Weeknd', 'Mark Ronson', 'Charlie Puth', 'Harry Styles'],
  'daft punk': ['The Weeknd', 'Kavinsky', 'Justice', 'Gorillaz', 'Empire of the Sun', 'M83'],
  'kavinsky': ['The Weeknd', 'Daft Punk', 'Lazerhawk', 'Carpenter Brut', 'Perturbator', 'Miami Nights 1984'],
  'dua lipa': ['The Weeknd', 'Taylor Swift', 'Billie Eilish', 'Ariana Grande', 'Olivia Rodrigo', 'Sabrina Carpenter'],
  'billie eilish': ['Lana Del Rey', 'Olivia Rodrigo', 'Finneas', 'Lorde', 'Dua Lipa', 'The Weeknd', 'SZA'],
  'coldplay': ['Imagine Dragons', 'OneRepublic', 'The Script', 'Keane', 'Snow Patrol', 'Maroon 5'],
  'imagine dragons': ['Coldplay', 'OneRepublic', 'Fall Out Boy', 'Twenty One Pilots', 'The Killers']
};

export function getRelatedArtists(artistName: string): string[] {
  if (!artistName) return [];
  const lower = artistName.toLowerCase().trim();
  for (const [key, related] of Object.entries(ARTIST_SIMILARITY_GRAPH)) {
    if (lower.includes(key) || key.includes(lower)) {
      return related;
    }
  }
  return [];
}

/**
 * Robust cleaner that strips YouTube artifacts, channel handles, and downloader prefixes:
 * - @Romantikmusik, @channel
 * - y2mate.com, snaptube, ssyoutube
 * - (Official Video), [Lyrics], 4K, HD, etc.
 * - Uploader spam: "Bunlar firavun...", "dinle", etc.
 */
export function sanitizeTrackTitleAndArtist(rawTitle: string, rawArtist: string): { title: string; artist: string } {
  let title = (rawTitle || '').trim();
  let artist = (rawArtist || '').trim();

  // 1. Remove downloader stamps
  title = title.replace(/^(?:y2mate(?:\.com)?|snaptube|ssyoutube|mp3clan|tubidy)\s*[-_:]*\s*/gi, '');
  title = title.replace(/\s*[-_:]*\s*(?:y2mate(?:\.com)?|snaptube|ssyoutube|mp3clan)\s*$/gi, '');
  artist = artist.replace(/^(?:y2mate(?:\.com)?|snaptube|ssyoutube|mp3clan|tubidy)\s*[-_:]*\s*/gi, '');

  // 2. Strip social/channel handles like @Romantikmusik
  title = title.replace(/@[\w\.\-]+(?:\s*[-_:]*\s*|\b)/gi, '');
  artist = artist.replace(/@[\w\.\-]+(?:\s*[-_:]*\s*|\b)/gi, '');

  // 3. Detect if artist is clearly a YouTube channel name or junk uploader
  const isJunkArtist =
    !artist ||
    /^(?:sanatçı|artist|unknown|youtube|spotify|vevo|official|music|records|audio|levent ayyıldız|bunlar firavun|y2mate)/i.test(artist) ||
    artist.length > 35;

  // If title has "Artist - Song" or "Artist - Song - Comment", extract real artist and song
  if (title.includes(' - ')) {
    const parts = title.split(' - ').map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      if (isJunkArtist) {
        artist = parts[0];
        title = parts[1];
      } else if (parts[0].toLowerCase().includes(artist.toLowerCase())) {
        title = parts.slice(1).join(' - ');
      }
    }
  }

  // 4. Also handle "Artist.Song" concatenated format
  if (title.includes('.') && isJunkArtist) {
    const dotParts = title.split('.').map(p => p.trim()).filter(Boolean);
    if (dotParts.length >= 2 && dotParts[0].length >= 3 && dotParts[0].length <= 25) {
      artist = dotParts[0];
      title = dotParts.slice(1).join(' ');
    }
  }

  // 5. Strip YouTube tags, brackets, and phrases
  title = title
    .replace(/\s*[\(\[](?:feat\.|ft\.|with|official|resmi|lyric|lyrics|video|klip|audio|remastered|remaster|live|canlı|akustik|acoustic|deluxe|bonus|edit|radio edit|hd|4k|hq|sözleriyle|orijinal|kayıt|plak).*?[\)\]]/gi, '')
    .replace(/\s*-\s*(?:Single|Live|Remastered|Remaster|Acoustic|Bonus Track|Original Mix|Edit|Radio Edit|Instrumental|Karaoke|Official).*$/i, '')
    .replace(/\s*[-_:]+\s*(?:bunlar firavun|dinle|full albüm|kesintisiz|albüm).*$/gi, '')
    .replace(/\.(?:mp3|mp4|m4a|wav|flac|ogg)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  artist = artist
    .replace(/\s*[\(\[](?:feat\.|ft\.|with|official|records|topic).*?[\)\]]/gi, '')
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!title) title = rawTitle.trim();
  if (!artist) artist = rawArtist.trim() || 'Sanatçı';

  return { title, artist };
}

/**
 * Returns a normalized canonical key for a track to prevent exact and near duplicate songs.
 * Strips punctuation, Turkish diacritics, and spaces.
 * e.g. "Gündüzüm Seninle" -> "gunduzumseninle"
 */
export function getCanonicalSongKey(title: string, _artist?: string): string {
  return (title || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Spotify-Grade Artist Spacing & Anti-Monopoly Filter:
 * - Prevents any single artist from monopolizing the radio (seed artist max 3 across 15 tracks).
 * - Enforces spacing between appearances of the same artist (at least 3 intervening songs).
 * - Strictly forbids ANY consecutive songs by the same artist!
 * - Deduplicates songs using canonical song keys so no track is ever repeated.
 */
export function applyArtistDiversityFilter(
  tracks: Track[],
  seedArtist?: string,
  maxPerArtist: number = 2,
  minArtistSpacing: number = 3
): Track[] {
  if (!Array.isArray(tracks) || tracks.length <= 1) return tracks;

  const normalizedSeed = (seedArtist || '').toLowerCase().trim();
  const seenSongKeys = new Set<string>();
  const artistCounts = new Map<string, number>();
  const sanitizedList: Track[] = [];

  for (const track of tracks) {
    const { title: cleanTitle, artist: cleanArtist } = sanitizeTrackTitleAndArtist(track.title, track.artist);
    const songKey = getCanonicalSongKey(cleanTitle);

    // Block exact or near-duplicate songs
    if (seenSongKeys.has(songKey)) continue;

    const normArtist = cleanArtist.toLowerCase().trim();
    const isSeed = normalizedSeed && (normArtist.includes(normalizedSeed) || normalizedSeed.includes(normArtist));
    const currentCount = artistCounts.get(normArtist) || 0;
    const maxAllowed = isSeed ? 3 : maxPerArtist;

    if (currentCount < maxAllowed) {
      seenSongKeys.add(songKey);
      artistCounts.set(normArtist, currentCount + 1);
      sanitizedList.push({
        ...track,
        title: cleanTitle,
        artist: cleanArtist
      });
    }
  }

  // Spotify Spacing Placement:
  // Interleave tracks so no two consecutive tracks have the same artist,
  // and maintain minArtistSpacing wherever possible.
  const result: Track[] = [];
  const pool = [...sanitizedList];

  while (pool.length > 0) {
    const recentArtists = result.slice(-minArtistSpacing).map(t => (t.artist || '').toLowerCase().trim());
    const lastArtist = recentArtists[recentArtists.length - 1] || null;

    // Find candidate not matching any recent artist
    let candidateIdx = pool.findIndex(t => {
      const a = (t.artist || '').toLowerCase().trim();
      return !recentArtists.includes(a);
    });

    // Fallback: at least not matching immediate previous artist
    if (candidateIdx === -1) {
      candidateIdx = pool.findIndex(t => (t.artist || '').toLowerCase().trim() !== lastArtist);
    }

    if (candidateIdx === -1) {
      candidateIdx = 0;
    }

    result.push(pool.splice(candidateIdx, 1)[0]);
  }

  return result;
}

// ----------------------------------------------------
// 0. Thematic Music Taxonomy & Classification
// ----------------------------------------------------

export function detectTrackTheme(track: { title?: string; artist?: string; genre?: string; album?: string }): ThematicClassification {
  const text = `${track.title || ''} ${track.artist || ''} ${track.genre || ''} ${track.album || ''}`.toLowerCase();

  // 0. Global Pop, International R&B & Worldwide Hits (Skepta, Che Ecru, The Weeknd, Dua Lipa, Billie Eilish, SZA, Drake...)
  const globalArtists = [
    'skepta', 'che ecru', 'the weeknd', 'dua lipa', 'billie eilish', 'sza', 'sabrina carpenter',
    'olivia rodrigo', 'harry styles', 'bruno mars', 'post malone', 'drake', 'taylor swift',
    'kendrick lamar', 'travis scott', 'beyoncé', 'rihanna', 'ed sheeran', 'ariana grande',
    'justin bieber', 'adele', 'lana del rey', 'coldplay', 'imagine dragons', 'eminem',
    'kanye west', 'frank ocean', 'brent faiyaz', 'steve lacy', 'daniel caesar', 'joji',
    'ravyn lenae', 'b-young', 'central cee', 'stormzy', 'dave', 'burna boy', 'tems',
    'chris brown', 'usher', 'doja cat', 'cardi b', 'megan thee stallion', 'childish gambino',
    'tate mcrae', 'chappell roan', 'charlie puth', 'shawn mendes', 'sam smith', 'troye sivan'
  ];
  const hasTurkishLetters = /[çğıöşü]/i.test(`${track.title || ''} ${track.artist || ''}`);
  const isGlobalArtist = globalArtists.some(a => text.includes(a));
  const isEnglishKeywords = /\b(love|not|me|you|dont|cant|heart|night|girl|boy|baby|time|summer|dance|like|feel|never|kiss|sun|feather|espresso|taste|vampire|birds|blinding|lights|starboy|snooze|circles|stay|flowers|bad)\b/i.test(track.title || '');
  const isGlobalGenre = /global|international|r&b|hip\s*hop|pop\s*\/\s*r&b|synthpop|dance\s*pop|indie\s*pop/i.test(track.genre || '') && !/türkçe|turkish/i.test(track.genre || '');

  if ((isGlobalArtist || (isEnglishKeywords && !hasTurkishLetters) || (isGlobalGenre && !hasTurkishLetters)) && !text.includes('türkçe') && !text.includes('turkce')) {
    return {
      category: 'global_pop',
      displayName: 'Global Pop & International Hits',
      badge: '🌍 Global Hit Radyosu',
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/30'
    };
  }

  // 1. 70'ler & 80'ler Nostalji / Taverna & Piyanist (Ferdi Özbeğen, Tanju Okan, Asu Maralman...)
  if (
    text.includes('ferdi özbeğen') ||
    text.includes('ferdi ozbegen') ||
    text.includes('piyanist') ||
    text.includes('tanju okan') ||
    text.includes('asu maralman') ||
    text.includes('esmeray') ||
    text.includes('ayla dikmen') ||
    text.includes('tülay özer') ||
    text.includes('selami şahin') ||
    text.includes('ümit besen') ||
    text.includes('nejat alp') ||
    text.includes('arif susam') ||
    text.includes('coşkun sabah') ||
    text.includes('neşe karaböcek') ||
    text.includes('gülden karaböcek') ||
    text.includes('dario moreno') ||
    text.includes('semiramis pekkan') ||
    text.includes('ayten alpman') ||
    text.includes('erol evgin') ||
    text.includes('zeki müren') ||
    text.includes('müzeyyen senar') ||
    text.includes('ilhan şeşen') ||
    text.includes('arap şükrü') ||
    text.includes('funda') ||
    text.includes('elmira rahimova') ||
    text.includes('mehmet güreli') ||
    text.includes('pilli bebek') ||
    text.includes('nostalji') ||
    text.includes('şanson')
  ) {
    return {
      category: 'turkce_nostalji_taverna',
      displayName: "70'ler & 80'ler Nostalji / Taverna",
      badge: '🎹 Piyanist & Nostalji Radyosu',
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    };
  }

  // 2. 90'lar Altın Çağ Türkçe Pop Klasikleri (Kenan Doğulu, Levent Yüksel, Sezen Aksu 90lar...)
  if (
    text.includes('kenan doğulu') ||
    text.includes('kurşun adres sormaz') ||
    text.includes('kursun adres sormaz') ||
    text.includes('levent yüksel') ||
    text.includes('med cezir') ||
    text.includes('harun kolçak') ||
    text.includes('gir kanıma') ||
    text.includes('aşkın nur yengi') ||
    text.includes('yalancı bahar') ||
    text.includes('bendeniz') ||
    text.includes('gönül yorgunu') ||
    text.includes('yaşar') ||
    text.includes('kumralım') ||
    text.includes('mirkelam') ||
    text.includes('her gece') ||
    text.includes('candan erçetin') ||
    text.includes('fatih erkoç') ||
    text.includes('çelik') ||
    text.includes('hercai') ||
    text.includes('burak kut') ||
    text.includes('kaybolan yıllar') ||
    text.includes('90lar') ||
    text.includes('doksanlar') ||
    text.includes('yonca evcimik') ||
    text.includes('izel')
  ) {
    return {
      category: 'turkce_90lar_pop',
      displayName: "90'lar Altın Çağ Türkçe Pop",
      badge: "📻 90'lar Pop Radyosu",
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30'
    };
  }

  // 3. Arabesk / Damar / Fantezi
  if (
    text.includes('müslüm') ||
    text.includes('ferdi tayfur') ||
    text.includes('bergen') ||
    text.includes('azer bülbül') ||
    text.includes('cengiz kurtoğlu') ||
    text.includes('ibrahim tatlıses') ||
    text.includes('ebru gündeş') ||
    text.includes('ahmet kaya') ||
    text.includes('orhan gencebay') ||
    text.includes('yıldız tilbe') ||
    text.includes('hakan taşıyan') ||
    text.includes('kibariye') ||
    text.includes('güllü') ||
    text.includes('selahattin özdemir') ||
    text.includes('hakkı bulut') ||
    text.includes('neşet ertaş') ||
    text.includes('arabesk') ||
    text.includes('damar') ||
    text.includes('fantezi') ||
    text.includes('alaturka')
  ) {
    return {
      category: 'arabesk_damar',
      displayName: 'Arabesk & Damar',
      badge: '🥀 Arabesk Radyosu',
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    };
  }

  // 4. Türkçe Rock & Anadolu Rock
  if (
    text.includes('duman') ||
    text.includes('mor ve ötesi') ||
    text.includes('şebnem ferah') ||
    text.includes('teoman') ||
    text.includes('manga') ||
    text.includes('barış manço') ||
    text.includes('cem karaca') ||
    text.includes('erkin koray') ||
    text.includes('athena') ||
    text.includes('gripin') ||
    text.includes('haluk levent') ||
    text.includes('pentagram') ||
    text.includes('kurban') ||
    text.includes('pinhani') ||
    text.includes('madrigal') ||
    text.includes('yüzyüzeyken') ||
    text.includes('adamlar') ||
    text.includes('dolu kadehi') ||
    text.includes('rock') ||
    text.includes('anadolu rock') ||
    text.includes('metal')
  ) {
    return {
      category: 'turkce_rock',
      displayName: 'Türkçe & Anadolu Rock',
      badge: '🎸 Rock Radyosu',
      color: 'text-red-400 bg-red-500/10 border-red-500/30'
    };
  }

  // 5. Türkçe Rap & Hip-Hop
  if (
    text.includes('ezhel') ||
    text.includes('ceza') ||
    text.includes('sagopa') ||
    text.includes('uzi') ||
    text.includes('motive') ||
    text.includes('şanışer') ||
    text.includes('contra') ||
    text.includes('lvbel c5') ||
    text.includes('cakal') ||
    text.includes('sefo') ||
    text.includes('gazapizm') ||
    text.includes('no.1') ||
    text.includes('blok3') ||
    text.includes('era7capone') ||
    text.includes('rap') ||
    text.includes('hip-hop') ||
    text.includes('trap') ||
    text.includes('drill')
  ) {
    return {
      category: 'turkce_rap',
      displayName: 'Türkçe Rap & Trap',
      badge: '🎤 Rap Radyosu',
      color: 'text-violet-400 bg-violet-500/10 border-violet-500/30'
    };
  }

  // 6. Synthwave & 80s Retro
  if (
    text.includes('the weeknd') ||
    text.includes('kavinsky') ||
    text.includes('daft punk') ||
    text.includes('m83') ||
    text.includes('synthwave') ||
    text.includes('retrowave') ||
    text.includes('80s') ||
    text.includes('cyberpunk')
  ) {
    return {
      category: 'synthwave_retro',
      displayName: 'Synthwave & 80s Retro',
      badge: '⚡ Synthwave Radyosu',
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
    };
  }

  // 7. Lo-Fi & Chill
  if (
    text.includes('wys') ||
    text.includes('kupla') ||
    text.includes('lofi') ||
    text.includes('lo-fi') ||
    text.includes('study') ||
    text.includes('chill') ||
    text.includes('ambient')
  ) {
    return {
      category: 'lofi_chill',
      displayName: 'Lo-Fi & Chill Beats',
      badge: '☕ Lo-Fi Radyosu',
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    };
  }

  // 8. Workout EDM
  if (
    text.includes('neffex') ||
    text.includes('tevvez') ||
    text.includes('workout') ||
    text.includes('hardstyle') ||
    text.includes('edm') ||
    text.includes('gym') ||
    text.includes('electronic')
  ) {
    return {
      category: 'workout_edm',
      displayName: 'Workout & EDM Motivasyon',
      badge: '🔥 Workout Radyosu',
      color: 'text-orange-400 bg-orange-500/10 border-orange-500/30'
    };
  }

  // 9. 2020'ler Modern Türkçe Pop & Akustik (Mert Demir, Mabel Matiz, KÖFN vb.)
  if (
    text.includes('mert demir') ||
    text.includes('mabel matiz') ||
    text.includes('köfn') ||
    text.includes('tarkan') ||
    text.includes('sezen aksu') ||
    text.includes('simge') ||
    text.includes('edis') ||
    text.includes('zeynep bastık') ||
    text.includes('semicenk') ||
    text.includes('gülşen') ||
    text.includes('pop') ||
    text.includes('akustik')
  ) {
    return {
      category: 'turkce_pop',
      displayName: 'Türkçe Pop & Akustik',
      badge: '✨ Pop Radyosu',
      color: 'text-pink-400 bg-pink-500/10 border-pink-500/30'
    };
  }

  return {
    category: 'general',
    displayName: 'Özel Müzik Teması',
    badge: '📻 Şarkı Radyosu',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
  };
}

// ----------------------------------------------------
// 1. Listening History & Habits Logger
// ----------------------------------------------------

export function recordListeningEvent(track: Track, durationSeconds: number = 30, completed: boolean = false): void {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    let history: ListeningHistoryItem[] = raw ? JSON.parse(raw) : [];

    const newItem: ListeningHistoryItem = {
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      genre: track.genre || 'Pop',
      playedAt: new Date().toISOString(),
      durationSeconds: Math.round(durationSeconds),
      completed
    };

    history = [newItem, ...history.filter(h => !(h.title.toLowerCase() === track.title.toLowerCase() && h.artist.toLowerCase() === track.artist.toLowerCase()))].slice(0, 100);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (err) {
    console.warn('Failed to record listening event:', err);
  }
}

export function getListeningHistory(): ListeningHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getListeningHabitsSummary(): ListeningHabitsSummary {
  const history = getListeningHistory();
  
  if (history.length === 0) {
    return {
      totalPlays: 0,
      totalDurationSeconds: 0,
      topGenres: [
        { genre: 'Türkçe Pop', count: 1, percentage: 35 },
        { genre: 'Türkçe Rock', count: 1, percentage: 30 },
        { genre: 'Arabesk', count: 1, percentage: 20 },
        { genre: 'Türkçe Rap', count: 1, percentage: 15 }
      ],
      topArtists: [
        { artist: 'Mert Demir', count: 1 },
        { artist: 'Duman', count: 1 },
        { artist: 'Müslüm Gürses', count: 1 },
        { artist: 'Ceza', count: 1 }
      ],
      recentTracks: [],
      dominantVibe: 'Keşif Modu'
    };
  }

  let totalDuration = 0;
  const genreCounts: Record<string, number> = {};
  const artistCounts: Record<string, number> = {};

  history.forEach(item => {
    totalDuration += item.durationSeconds || 120;
    
    const genre = item.genre || 'Pop';
    genreCounts[genre] = (genreCounts[genre] || 0) + 1;

    const artist = item.artist || 'Sanatçı';
    artistCounts[artist] = (artistCounts[artist] || 0) + 1;
  });

  const totalPlays = history.length;

  const topGenres = Object.entries(genreCounts)
    .map(([genre, count]) => ({
      genre,
      count,
      percentage: Math.round((count / totalPlays) * 100)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topArtists = Object.entries(artistCounts)
    .map(([artist, count]) => ({ artist, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const recentTracks = history.slice(0, 5).map(h => ({
    title: h.title,
    artist: h.artist,
    playedAt: h.playedAt
  }));

  let dominantVibe = 'Dengeli & Çeşitli';
  if (topGenres.length > 0) {
    dominantVibe = `${topGenres[0].genre} & ${topArtists[0]?.artist || 'Hit'} Ağırlıklı`;
  }

  return {
    totalPlays,
    totalDurationSeconds: totalDuration,
    topGenres,
    topArtists,
    recentTracks,
    dominantVibe
  };
}

// ----------------------------------------------------
// 2. Thematic Song Radio Fetcher (Spotify-style)
// ----------------------------------------------------

export interface SongRadioResult {
  radioTitle: string;
  themeName: string;
  themeCategory: MusicThemeCategory;
  badge: string;
  tracks: Track[];
}

export async function fetchThematicSongRadio(
  seedTrack: Track,
  count: number = 15,
  excludeIds: string[] = []
): Promise<SongRadioResult> {
  const classification = detectTrackTheme(seedTrack);
  const excludeSet = new Set(excludeIds.map(id => id.toLowerCase().trim()));
  excludeSet.add(seedTrack.id.toLowerCase().trim());
  excludeSet.add(seedTrack.title.toLowerCase().trim());

  // 1. Try Server API first with both excludeIds and excludeTitles
  try {
    const res = await fetch('/api/radio/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: seedTrack.title,
        artist: seedTrack.artist,
        genre: seedTrack.genre || classification.displayName,
        count,
        excludeTitles: Array.from(excludeSet),
        excludeIds: Array.from(excludeSet)
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.tracks) && data.tracks.length > 0) {
        const freshServerTracks = data.tracks
          .map((t: Track) => {
            const { title: cleanTitle, artist: cleanArtist } = sanitizeTrackTitleAndArtist(t.title, t.artist);
            return { ...t, title: cleanTitle, artist: cleanArtist };
          })
          .filter(
            (t: Track) => !excludeSet.has(t.title.toLowerCase().trim()) && !excludeSet.has(t.id.toLowerCase().trim())
          );
        if (freshServerTracks.length >= Math.min(count, 4)) {
          const diversified = applyArtistDiversityFilter(freshServerTracks, seedTrack.artist, 2, 3);
          return {
            radioTitle: data.radioTitle || `📻 ${seedTrack.artist || seedTrack.title} Radyosu`,
            themeName: classification.displayName,
            themeCategory: classification.category,
            badge: classification.badge,
            tracks: diversified.slice(0, count)
          };
        }
      }
    }
  } catch (err) {
    console.warn('Song Radio online API failed, executing client-side related artist query:', err);
  }

  // 2. Client-side Curated Match from POPULAR_ORIGINAL_HITS
  const radioTracks: Track[] = [];
  const seenSongKeys = new Set<string>();
  const seedSongKey = getCanonicalSongKey(seedTrack.title);
  seenSongKeys.add(seedSongKey);

  // First, extract high-scoring peer tracks from curated POPULAR_ORIGINAL_HITS
  const curatedCandidates = POPULAR_ORIGINAL_HITS
    .map(popTrack => {
      const { title: cleanTitle, artist: cleanArtist } = sanitizeTrackTitleAndArtist(popTrack.title, popTrack.artist);
      const sanitized = { ...popTrack, title: cleanTitle, artist: cleanArtist };
      const affinity = scoreTrackAffinity(seedTrack, sanitized, false);
      return { track: sanitized, affinity };
    })
    .filter(item => {
      const sKey = getCanonicalSongKey(item.track.title);
      return (
        item.affinity.score > 35 &&
        !seenSongKeys.has(sKey) &&
        !excludeSet.has(item.track.id.toLowerCase().trim()) &&
        !excludeSet.has(item.track.title.toLowerCase().trim())
      );
    })
    // Spotify-style non-deterministic dynamic shuffling within high-affinity tiers (adds natural freshness)
    .sort((a, b) => {
      const scoreDiff = b.affinity.score - a.affinity.score;
      if (Math.abs(scoreDiff) < 15) {
        return Math.random() - 0.5;
      }
      return scoreDiff;
    });

  for (const item of curatedCandidates) {
    if (radioTracks.length >= count) break;
    const sKey = getCanonicalSongKey(item.track.title);
    seenSongKeys.add(sKey);
    radioTracks.push({
      ...item.track,
      isSmartRecommendation: true,
      recommendationReason: item.affinity.reason || `${classification.displayName} ekolüyle uyumlu`,
      matchScore: Math.min(99, Math.max(90, Math.round(item.affinity.score > 70 ? item.affinity.score : 94)))
    });
  }

  // 3. If more tracks are needed, query searchUniversalTracks with related peers
  if (radioTracks.length < count) {
    const related = getRelatedArtists(seedTrack.artist);
    const shuffledPeers = [...related].sort(() => Math.random() - 0.5);
    const searchQueries = [
      ...shuffledPeers.slice(0, 4),
      seedTrack.artist,
      classification.displayName
    ].filter(Boolean);

    for (const query of searchQueries) {
      if (radioTracks.length >= count) break;
      try {
        const found = await searchUniversalTracks(query);
        for (const t of found) {
          if (radioTracks.length >= count) break;
          const { title: cleanTitle, artist: cleanArtist } = sanitizeTrackTitleAndArtist(t.title, t.artist);
          const sKey = getCanonicalSongKey(cleanTitle);

          if (
            !seenSongKeys.has(sKey) &&
            !excludeSet.has(t.id.toLowerCase().trim()) &&
            !excludeSet.has(cleanTitle.toLowerCase().trim())
          ) {
            const cleanTrack = { ...t, title: cleanTitle, artist: cleanArtist };
            const affinity = scoreTrackAffinity(seedTrack, cleanTrack, false);
            if (affinity.score > 35) {
              seenSongKeys.add(sKey);
              radioTracks.push({
                ...cleanTrack,
                isSmartRecommendation: true,
                recommendationReason: affinity.reason || `${seedTrack.artist} tarzına uygun radyo akışı`,
                matchScore: Math.min(99, Math.max(90, Math.round(affinity.score > 70 ? affinity.score : 92)))
              });
            }
          }
        }
      } catch {}
    }
  }

  // Apply final diversity filter: caps artist frequency, enforces spacing, and prevents consecutive same-artist tracks
  const diversifiedTracks = applyArtistDiversityFilter(radioTracks, seedTrack.artist, 2, 3);

  return {
    radioTitle: `📻 ${seedTrack.artist || seedTrack.title} Radyosu`,
    themeName: classification.displayName,
    themeCategory: classification.category,
    badge: classification.badge,
    tracks: diversifiedTracks.slice(0, count)
  };
}

/**
 * Endless Radio Batch Replenisher:
 * Always guarantees fresh non-depleted tracks for continuous radio playback.
 */
export async function fetchEndlessRadioBatch(
  seedTrack: Track,
  playedTrackIds: string[],
  requestedCount: number = 12
): Promise<Track[]> {
  try {
    const res = await fetchThematicSongRadio(seedTrack, requestedCount, playedTrackIds);
    return res.tracks || [];
  } catch (err) {
    console.warn('fetchEndlessRadioBatch error:', err);
    return [];
  }
}

/**
 * Playlist Autoplay & Continuity Engine (Akıllı Liste Sonu Kesintisiz Devam):
 * Analyzes playlist musical DNA and fetches harmonious tracks so music never abruptly stops.
 */
export interface PlaylistAutoplayResult {
  continuationTitle: string;
  themeName: string;
  tracks: Track[];
}

export async function fetchPlaylistAutoplayTracks(
  playlistTracks: Track[],
  playlistTitle: string = 'Çalma Listesi',
  excludeIds: string[] = [],
  count: number = 15
): Promise<PlaylistAutoplayResult> {
  const excludeSet = new Set(excludeIds.map(id => id.toLowerCase().trim()));
  for (const t of playlistTracks) {
    if (t.id) excludeSet.add(t.id.toLowerCase().trim());
    if (t.title) excludeSet.add(t.title.toLowerCase().trim());
  }

  // 1. Analyze dominant theme and top artists from playlist
  const artistFreq = new Map<string, number>();
  const themeFreq = new Map<string, number>();
  let primaryTheme: ThematicClassification | null = null;

  for (const t of playlistTracks) {
    if (t.artist) {
      const a = t.artist.trim();
      artistFreq.set(a, (artistFreq.get(a) || 0) + 1);
    }
    const theme = detectTrackTheme(t);
    themeFreq.set(theme.displayName, (themeFreq.get(theme.displayName) || 0) + 1);
    if (!primaryTheme) primaryTheme = theme;
  }

  let maxThemeCount = 0;
  let dominantThemeName = primaryTheme?.displayName || 'Türkçe Pop';
  for (const [name, c] of themeFreq.entries()) {
    if (c > maxThemeCount) {
      maxThemeCount = c;
      dominantThemeName = name;
    }
  }

  const topArtists = Array.from(artistFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(e => e[0]);

  const lastTrack = playlistTracks[playlistTracks.length - 1] || playlistTracks[0];

  // 2. Try online /api/radio/playlist endpoint
  try {
    const res = await fetch('/api/radio/playlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playlistTitle,
        sampleArtists: topArtists,
        theme: dominantThemeName,
        seedTrack: lastTrack ? { title: lastTrack.title, artist: lastTrack.artist } : undefined,
        count,
        excludeTitles: Array.from(excludeSet),
        excludeIds: Array.from(excludeSet)
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.tracks) && data.tracks.length > 0) {
        const fresh = data.tracks.filter(
          (t: Track) => !excludeSet.has(t.title.toLowerCase().trim()) && !excludeSet.has(t.id.toLowerCase().trim())
        );
        const diversified = applyArtistDiversityFilter(fresh.length > 0 ? fresh : data.tracks, undefined, 2);
        if (diversified.length > 0) {
          return {
            continuationTitle: data.continuationTitle || `✨ "${playlistTitle}" ile Uyumlu Parçalar`,
            themeName: dominantThemeName,
            tracks: diversified.slice(0, count)
          };
        }
      }
    }
  } catch (err) {
    console.warn('Playlist autoplay online API failed, executing client-side continuity:', err);
  }

  // 3. Fallback: Run thematic radio seeded with the playlist's anchor track
  if (lastTrack) {
    const radioRes = await fetchThematicSongRadio(lastTrack, count, Array.from(excludeSet));
    return {
      continuationTitle: `✨ "${playlistTitle}" ile Uyumlu Parçalar`,
      themeName: dominantThemeName,
      tracks: radioRes.tracks
    };
  }

  return {
    continuationTitle: `✨ "${playlistTitle}" ile Uyumlu Parçalar`,
    themeName: dominantThemeName,
    tracks: []
  };
}

// ----------------------------------------------------
// 3. Smart Shuffle Mode Preference
// ----------------------------------------------------

export function getSmartShuffleEnabled(): boolean {
  try {
    const val = localStorage.getItem(SMART_SHUFFLE_KEY);
    return val !== null ? JSON.parse(val) : true;
  } catch {
    return true;
  }
}

export function setSmartShuffleEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SMART_SHUFFLE_KEY, JSON.stringify(enabled));
  } catch {}
}

// ----------------------------------------------------
// 4. Smart AI Recommendations Fetcher (Spotify-style)
// ----------------------------------------------------

export async function fetchSmartRecommendations(options: SmartRecommendationOptions = {}): Promise<Track[]> {
  const habits = getListeningHabitsSummary();
  const history = getListeningHistory();
  const playlistTracks = options.playlistTracks || [];
  const count = options.count || 12;

  // Build exclusion list
  const existingSet = new Set<string>();
  for (const t of [...history, ...playlistTracks]) {
    if (t.title) existingSet.add(t.title.toLowerCase().trim());
  }

  // 1. Try Server API
  try {
    const payload = {
      history: history.slice(0, 10),
      topGenres: habits.topGenres.map(g => g.genre),
      topArtists: habits.topArtists.map(a => a.artist),
      mood: options.mood || 'all',
      count,
      playlistTracks
    };

    const res = await fetch('/api/recommendations/smart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.recommendations) && data.recommendations.length > 0) {
        return data.recommendations;
      }
    }
  } catch (err) {
    console.warn('Smart recommendations server request failed, running client-side recommendation engine:', err);
  }

  // 2. Client-side Intelligent Recommendation Engine
  let searchSeeds: string[] = [];

  if (playlistTracks.length > 0) {
    // Playlist Context: Find dominant artists and genres in the playlist
    const artistCounts: Record<string, number> = {};
    const genreCounts: Record<string, number> = {};

    playlistTracks.forEach(t => {
      if (t.artist) artistCounts[t.artist] = (artistCounts[t.artist] || 0) + 1;
      if (t.genre) genreCounts[t.genre] = (genreCounts[t.genre] || 0) + 1;
    });

    const topPlaylistArtists = Object.entries(artistCounts).sort((a, b) => b[1] - a[1]).map(e => e[0]);
    const topPlaylistGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).map(e => e[0]);

    // Also get related artists for the top playlist artists
    const relatedPeers: string[] = [];
    topPlaylistArtists.slice(0, 3).forEach(art => {
      relatedPeers.push(...getRelatedArtists(art));
    });

    searchSeeds = [
      ...topPlaylistArtists.slice(0, 2),
      ...relatedPeers.slice(0, 3),
      ...topPlaylistGenres.slice(0, 2)
    ].filter(Boolean);
  } else if (options.mood && options.mood !== 'all') {
    // Mood-specific query
    const moodMap: Record<string, string[]> = {
      arabesk: ['Müslüm Gürses', 'Ferdi Tayfur', 'Bergen', 'Azer Bülbül', 'Cengiz Kurtoğlu'],
      turkish: ['Mert Demir', 'Mabel Matiz', 'Semicenk', 'Simge', 'Edis'],
      rock: ['Duman', 'Mor ve Ötesi', 'Şebnem Ferah', 'Teoman', 'Adamlar'],
      rap: ['Ezhel', 'Ceza', 'Sagopa Kajmer', 'UZI', 'Motive', 'BLOK3'],
      energetic: ['Workout Hits', 'Tevvez', 'Hardstyle', 'EDM Festival', 'Neffex'],
      chill: ['Lo-Fi Beats', 'Chillhop', 'Acoustic Pop', 'Study Beats'],
      driving: ['Synthwave', 'The Weeknd', 'Kavinsky', 'Nightcall', 'Retrowave']
    };
    searchSeeds = moodMap[options.mood] || ['Türkçe Pop'];
  } else {
    // Habits / Global recommendations
    searchSeeds = [
      ...habits.topArtists.slice(0, 2).map(a => a.artist),
      ...habits.topGenres.slice(0, 2).map(g => g.genre),
      'Mert Demir',
      'Duman',
      'Müslüm Gürses',
      'Ezhel'
    ].filter(Boolean);
  }

  const recommendations: Track[] = [];
  const seenIds = new Set<string>();

  for (const seed of searchSeeds) {
    if (recommendations.length >= count) break;
    try {
      const found = await searchUniversalTracks(seed);
      for (const t of found) {
        const normTitle = t.title.toLowerCase().trim();
        const normId = t.id.toLowerCase().trim();
        if (!seenIds.has(normId) && !existingSet.has(normTitle)) {
          seenIds.add(normId);
          recommendations.push({
            ...t,
            recommendationReason: `${seed} benzeri çalma listesi önerisi`,
            matchScore: Math.floor(91 + Math.random() * 8)
          });
        }
      }
    } catch {}
  }

  // Shuffle for fresh listening discovery
  for (let i = recommendations.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [recommendations[i], recommendations[j]] = [recommendations[j], recommendations[i]];
  }

  return recommendations.slice(0, count);
}

// ----------------------------------------------------
// 5. Spotify-Grade Track Affinity Scoring & Smart Shuffle
// ----------------------------------------------------

export interface ScoredTrackRecommendation {
  track: Track;
  score: number;
  reason: string;
  isPeerArtist: boolean;
  isSameGenre: boolean;
}

export function scoreTrackAffinity(
  currentTrack: Track,
  candidate: Track,
  playedRecently: boolean = false
): ScoredTrackRecommendation {
  const currentTheme = detectTrackTheme(currentTrack);
  const candidateTheme = detectTrackTheme(candidate);
  const relatedArtists = getRelatedArtists(currentTrack.artist).map(a => a.toLowerCase().trim());
  const candArtist = (candidate.artist || '').toLowerCase().trim();
  const currArtist = (currentTrack.artist || '').toLowerCase().trim();

  let score = 0;
  let reason = '';
  let isPeerArtist = false;
  let isSameGenre = false;

  // 1. Strict Theme / Genre Consistency (Spotify rule: avoid cross-genre jarring shifts)
  const isCurrentGlobal = currentTheme.category === 'global_pop';
  const isCandidateGlobal = candidateTheme.category === 'global_pop';
  const isTurkishRegional =
    candidateTheme.category === 'turkce_nostalji_taverna' ||
    candidateTheme.category === 'arabesk_damar' ||
    candidateTheme.category === 'turkce_90lar_pop' ||
    candidateTheme.category === 'turkce_pop' ||
    candidateTheme.category === 'turkce_rock';

  if (isCurrentGlobal && isTurkishRegional) {
    // Culture clash penalty: NEVER suggest Turkish nostalji/arabesk/pop for Global Pop seed!
    return {
      track: candidate,
      score: -1000,
      reason: 'Kültür ve müzik ekolü uyuşmazlığı (Global Pop vs Türkçe)',
      isPeerArtist: false,
      isSameGenre: false
    };
  }

  if (!isCurrentGlobal && currentTheme.category !== 'general' && isCandidateGlobal && (currentTheme.category === 'turkce_nostalji_taverna' || currentTheme.category === 'arabesk_damar')) {
    return {
      track: candidate,
      score: -1000,
      reason: 'Kültür ve müzik ekolü uyuşmazlığı',
      isPeerArtist: false,
      isSameGenre: false
    };
  }

  if (currentTheme.category === candidateTheme.category && currentTheme.category !== 'general') {
    score += 85;
    isSameGenre = true;
    reason = `${currentTheme.displayName} temasıyla kusursuz uyum`;
  } else if (
    (currentTheme.category === 'turkce_90lar_pop' && (candidateTheme.category === 'turkce_pop' || candidateTheme.category === 'turkce_rap' || candidateTheme.category === 'workout_edm')) ||
    (currentTheme.category === 'turkce_nostalji_taverna' && (candidateTheme.category === 'turkce_pop' || candidateTheme.category === 'turkce_rap' || candidateTheme.category === 'workout_edm')) ||
    (currentTheme.category === 'turkce_pop' && (candidateTheme.category === 'turkce_nostalji_taverna' || candidateTheme.category === 'arabesk_damar')) ||
    (currentTheme.category === 'arabesk_damar' && (candidateTheme.category === 'workout_edm' || candidateTheme.category === 'turkce_rap' || candidateTheme.category === 'synthwave_retro' || candidateTheme.category === 'turkce_pop')) ||
    (currentTheme.category === 'workout_edm' && candidateTheme.category === 'arabesk_damar') ||
    (currentTheme.category === 'lofi_chill' && candidateTheme.category === 'workout_edm') ||
    (currentTheme.category === 'turkce_rock' && candidateTheme.category === 'workout_edm')
  ) {
    // Severe penalty for jarring genre clashes!
    score -= 500;
  } else {
    // Neutral or broader acoustic harmony
    score += 15;
  }

  // 2. Artist Graph Compatibility (Spotify Peer Mapping)
  if (currArtist && candArtist && (currArtist === candArtist || candArtist.includes(currArtist) || currArtist.includes(candArtist))) {
    // Same artist: high affinity, but slightly reduced if just played to prevent artist loop fatigue
    score += playedRecently ? 20 : 60;
    reason = `${candidate.artist} imza sound ve melodik devamlılık`;
  } else if (relatedArtists.some(r => candArtist.includes(r) || r.includes(candArtist))) {
    score += 55;
    isPeerArtist = true;
    reason = `${currentTrack.artist} dinleyenler için benzer tarz (${candidate.artist})`;
  }

  // 3. Subgenre / Tag Match
  if (candidate.genre && currentTrack.genre && candidate.genre.toLowerCase() === currentTrack.genre.toLowerCase()) {
    score += 25;
    if (!reason) reason = `${candidate.genre} türünde uyumlu akış`;
  }

  // 4. Popularity & Quality Boost
  score += ((candidate.popularity || 70) / 100) * 15;

  // 5. Freshness Bonus (Unplayed tracks get priority)
  if (!playedRecently) {
    score += 20;
  }

  // 6. Natural soft variation (±3 pts) so playlist is not rigidly identical each run
  score += (Math.random() * 6) - 3;

  if (!reason) {
    reason = `Spotify Akıllı Akış: ${candidate.artist || 'Sanatçı'} uyumu`;
  }

  return {
    track: {
      ...candidate,
      recommendationReason: reason,
      matchScore: Math.min(99, Math.max(88, Math.round(score > 70 ? score : 88)))
    },
    score,
    reason,
    isPeerArtist,
    isSameGenre
  };
}

export function selectSmartThematicNextTrack(
  currentTrack: Track,
  pool: Track[],
  playedTrackIds: Set<string>,
  fallbackPool: Track[] = []
): Track | null {
  if (!currentTrack) return null;

  // Combine local playlist tracks with fallback library (e.g. popular original hits)
  const combined = [...pool, ...fallbackPool];
  const uniqueMap = new Map<string, Track>();
  combined.forEach(t => {
    if (t && t.id && t.id !== currentTrack.id) {
      uniqueMap.set(t.id, t);
    }
  });

  const candidates = Array.from(uniqueMap.values());
  if (candidates.length === 0) return null;

  // Score all candidates
  const scored = candidates
    .map(c => scoreTrackAffinity(currentTrack, c, playedTrackIds.has(c.id)))
    .filter(res => res.score > 35); // strictly filter out clashes and unsuited songs

  if (scored.length === 0) return null;

  scored.sort((a, b) => b.score - a.score);

  // Pick probabilistically from top 3 candidates (Spotify smooth discovery)
  const topSlice = scored.slice(0, Math.min(3, scored.length));
  const chosen = topSlice[Math.floor(Math.random() * topSlice.length)];

  return {
    ...chosen.track,
    isSmartRecommendation: true,
    recommendationReason: chosen.reason
  };
}

export function buildSpotifySmartShuffleQueue(
  currentTrack: Track,
  playlistTracks: Track[],
  playedTrackIds: Set<string>,
  discoveryPool: Track[] = []
): Track[] {
  // Sort remaining playlist tracks acoustically based on currentTrack
  const remaining = playlistTracks.filter(t => t.id !== currentTrack.id && !playedTrackIds.has(t.id));
  const basePool = remaining.length > 0 ? remaining : playlistTracks.filter(t => t.id !== currentTrack.id);

  let cursor = currentTrack;
  const orderedList: Track[] = [];
  const tempPool = [...basePool];

  while (tempPool.length > 0) {
    let bestIdx = 0;
    let bestScore = -99999;
    for (let i = 0; i < tempPool.length; i++) {
      const { score } = scoreTrackAffinity(cursor, tempPool[i], false);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    const chosen = tempPool.splice(bestIdx, 1)[0];
    orderedList.push(chosen);
    cursor = chosen;
  }

  // Weave in Spotify Smart Shuffle Recommendations (1 per 2-3 songs)
  const discoveryCandidates = discoveryPool.filter(d =>
    !playlistTracks.some(p => p.id === d.id || p.title.toLowerCase() === d.title.toLowerCase()) &&
    !playedTrackIds.has(d.id)
  );

  const result: Track[] = [];
  for (let i = 0; i < orderedList.length; i++) {
    result.push(orderedList[i]);

    // Every 2 tracks, inject 1 tailored discovery track
    if ((i + 1) % 2 === 0 && discoveryCandidates.length > 0) {
      const prev = orderedList[i];
      const scoredDisc = discoveryCandidates
        .map(c => scoreTrackAffinity(prev, c, false))
        .filter(s => s.score > 40)
        .sort((a, b) => b.score - a.score);

      if (scoredDisc.length > 0) {
        const topDisc = scoredDisc[0];
        result.push({
          ...topDisc.track,
          isSmartRecommendation: true,
          recommendationReason: `✨ Akıllı Karışık: ${prev.artist} tarzı öneri`
        });
        const rIdx = discoveryCandidates.findIndex(d => d.id === topDisc.track.id);
        if (rIdx !== -1) discoveryCandidates.splice(rIdx, 1);
      }
    }
  }

  return result;
}

// ----------------------------------------------------
// 5.1 Spotify Balanced Shuffle (Bregman Dispersion Algorithm)
// Distributes same-artist tracks evenly across the queue
// ----------------------------------------------------
export function getBalancedShuffleQueue(tracks: Track[], currentTrackId?: string): Track[] {
  if (!tracks || tracks.length <= 2) return [...(tracks || [])];

  const pool = tracks.filter(t => t.id !== currentTrackId);
  if (pool.length <= 1) return pool;

  // 1. Group tracks by artist
  const artistBins: Record<string, Track[]> = {};
  for (const t of pool) {
    const key = (t.artist || 'Unknown').trim().toLowerCase();
    if (!artistBins[key]) artistBins[key] = [];
    artistBins[key].push(t);
  }

  // 2. Shuffle each artist's internal list
  for (const artist in artistBins) {
    const list = artistBins[artist];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
  }

  // 3. Sort bins by size descending
  const sortedBins = Object.values(artistBins).sort((a, b) => b.length - a.length);

  // 4. Interleave items with spacing (Bregman dispersion)
  const result: Track[] = [];
  const maxLen = sortedBins[0].length;

  for (let step = 0; step < maxLen; step++) {
    const roundBins = [...sortedBins].sort(() => Math.random() - 0.5);
    for (const bin of roundBins) {
      if (bin.length > step) {
        result.push(bin[step]);
      }
    }
  }

  return result;
}

// ----------------------------------------------------
// 5.2 Spotify Smart Shuffle Track Injector
// Injects a high-affinity external track into the playlist flow
// ----------------------------------------------------
export async function getSpotifySmartShuffleTrack(
  currentTrack: Track,
  currentPlaylist: Track[],
  playedTrackIds: Set<string>
): Promise<Track | null> {
  const currentTheme = detectTrackTheme(currentTrack);
  const relatedPeers = getRelatedArtists(currentTrack.artist);
  const playlistIds = new Set(currentPlaylist.map(t => t.id));

  // 1. First look in POPULAR_ORIGINAL_HITS for an unplayed instant match outside the playlist
  const instantCandidates = POPULAR_ORIGINAL_HITS.filter(t => {
    if (playlistIds.has(t.id) || playedTrackIds.has(t.id) || t.id === currentTrack.id) return false;
    const theme = detectTrackTheme(t);
    const isRelated = relatedPeers.some(r => t.artist.toLowerCase().includes(r.toLowerCase()));
    return isRelated || theme.category === currentTheme.category;
  });

  if (instantCandidates.length > 0) {
    const chosen = instantCandidates[Math.floor(Math.random() * instantCandidates.length)];
    return {
      ...chosen,
      isSmartRecommendation: true,
      smartRecommendationSeed: currentTrack.artist,
      recommendationReason: `✨ Spotify Akıllı Karışık • ${currentTrack.artist} benzeri`,
      matchScore: Math.floor(94 + Math.random() * 5)
    };
  }

  // 2. If no instant hits unplayed, fetch dynamically via related artist search
  const query = relatedPeers.length > 0 
    ? relatedPeers[Math.floor(Math.random() * relatedPeers.length)]
    : currentTrack.artist;

  try {
    const results = await searchUniversalTracks(query);
    const valid = results.filter(t => 
      !playlistIds.has(t.id) && 
      !playedTrackIds.has(t.id) && 
      t.id !== currentTrack.id &&
      t.title.toLowerCase() !== currentTrack.title.toLowerCase()
    );

    if (valid.length > 0) {
      const selected = valid[0];
      return {
        ...selected,
        isSmartRecommendation: true,
        smartRecommendationSeed: currentTrack.artist,
        recommendationReason: `✨ Spotify Akıllı Karışık • ${currentTrack.artist} stili`,
        matchScore: Math.floor(92 + Math.random() * 7)
      };
    }
  } catch (err) {
    console.warn('Smart shuffle search fetch failed:', err);
  }

  return null;
}

// ----------------------------------------------------
// 6. Endless Autoplay Setting
// ----------------------------------------------------

export function getEndlessAutoplay(): boolean {
  try {
    const val = localStorage.getItem(ENDLESS_AUTOPLAY_KEY);
    return val !== null ? JSON.parse(val) : true;
  } catch {
    return true;
  }
}

export function setEndlessAutoplay(enabled: boolean): void {
  try {
    localStorage.setItem(ENDLESS_AUTOPLAY_KEY, JSON.stringify(enabled));
  } catch {}
}

// ----------------------------------------------------
// 7. Personal PIN & Master Passkey (Private Mode)
// ----------------------------------------------------

export function getStoredPIN(): string | null {
  try {
    return localStorage.getItem(PIN_KEY);
  } catch {
    return null;
  }
}

export function setStoredPIN(pin: string | null): void {
  try {
    if (pin && pin.trim().length >= 4) {
      localStorage.setItem(PIN_KEY, pin.trim());
    } else {
      localStorage.removeItem(PIN_KEY);
      localStorage.removeItem(LOCK_STATE_KEY);
    }
  } catch {}
}

export function isAppLocked(): boolean {
  try {
    const hasPin = Boolean(localStorage.getItem(PIN_KEY));
    if (!hasPin) return false;
    const isLocked = localStorage.getItem(LOCK_STATE_KEY);
    return isLocked !== 'false';
  } catch {
    return false;
  }
}

export function setAppLockedState(locked: boolean): void {
  try {
    localStorage.setItem(LOCK_STATE_KEY, locked ? 'true' : 'false');
  } catch {}
}

export function verifyPIN(entered: string): boolean {
  const stored = getStoredPIN();
  if (!stored) return true;
  return stored === entered.trim();
}

// ----------------------------------------------------
// 8. Full Personal Data Export / Import (Ownership)
// ----------------------------------------------------

export function exportPersonalDataJSON(playlists: Playlist[]): void {
  const history = getListeningHistory();
  const habits = getListeningHabitsSummary();

  const backupData = {
    app: 'SoundPulse',
    version: '2.0.0',
    exportDate: new Date().toISOString(),
    playlists,
    listeningHistory: history,
    listeningHabits: habits,
    settings: {
      hasPersonalPin: Boolean(getStoredPIN()),
      endlessAutoplay: getEndlessAutoplay()
    }
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `soundpulse_kisisel_yedek_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseImportDataJSON(jsonString: string): { playlists?: Playlist[]; history?: ListeningHistoryItem[] } | null {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed && (Array.isArray(parsed.playlists) || Array.isArray(parsed.listeningHistory))) {
      return {
        playlists: parsed.playlists,
        history: parsed.listeningHistory
      };
    }
    return null;
  } catch (err) {
    console.error('Failed to parse backup JSON:', err);
    return null;
  }
}
