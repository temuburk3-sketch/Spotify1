import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Music2, Link as LinkIcon, Sparkles, Check, Loader2, ListMusic, Play, Volume2, Search, Filter, ShieldCheck, Zap, Radio, BookOpen, Compass, FileText } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Playlist, Track } from '../../types';
import { parseSpotifyUrl, createTracksFromSpotifyImport, SpotifyParsedResult } from '../../services/spotifyParser';
import { audioEngine } from '../../services/audioEngine';
import { searchSpotifyPublic, FEATURED_SPOTIFY_COLLECTIONS, SpotifyPublicItem } from '../../services/spotifyApiService';

interface SpotifyImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: Playlist[];
  currentPlaylistId?: string;
  onImportTracks: (tracks: Track[], targetPlaylistId: string, newPlaylistName?: string) => void;
}

export const SpotifyImportModal: React.FC<SpotifyImportModalProps> = ({
  isOpen,
  onClose,
  playlists,
  currentPlaylistId,
  onImportTracks
}) => {
  const [activeTab, setActiveTab] = useState<'url' | 'browse' | 'text'>('url');
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [textListInput, setTextListInput] = useState('');
  const [isParsingText, setIsParsingText] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progressText, setProgressText] = useState('Spotify verileri çözümleniyor...');
  const [parsedData, setParsedData] = useState<SpotifyParsedResult | null>(null);
  const [useFullSeries, setUseFullSeries] = useState(true);
  const [targetChoice, setTargetChoice] = useState<'current' | 'new'>(currentPlaylistId ? 'current' : 'new');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(currentPlaylistId || playlists[0]?.id || '');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const [deduplicate, setDeduplicate] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [maxTrackLimit, setMaxTrackLimit] = useState<number>(1000);

  // Browse & Live Search states
  const [browseQuery, setBrowseQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');
  const [browseItems, setBrowseItems] = useState<SpotifyPublicItem[]>(FEATURED_SPOTIFY_COLLECTIONS);
  const [isSearchingBrowse, setIsSearchingBrowse] = useState(false);

  // Debounced search for Browse tab
  useEffect(() => {
    if (activeTab !== 'browse') return;
    const timer = setTimeout(async () => {
      setIsSearchingBrowse(true);
      try {
        const results = await searchSpotifyPublic(browseQuery);
        setBrowseItems(results);
      } catch (err) {
        console.warn('Browse search error:', err);
      } finally {
        setIsSearchingBrowse(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [browseQuery, activeTab]);

  const filteredBrowseItems = useMemo(() => {
    if (selectedCategory === 'Tümü') return browseItems;
    return browseItems.filter(item => item.category === selectedCategory || (selectedCategory === 'Podcast Yayınları' && item.isPodcast));
  }, [browseItems, selectedCategory]);

  const effectiveTracks = useMemo(() => {
    if (!parsedData) return [];
    if (parsedData.type === 'episode' && !useFullSeries && parsedData.singleTrack) {
      return [parsedData.singleTrack];
    }
    return parsedData.tracks || [];
  }, [parsedData, useFullSeries]);

  const finalTracksToImport = useMemo(() => {
    if (!parsedData) return [];
    const baseResult: SpotifyParsedResult = {
      ...parsedData,
      tracks: effectiveTracks
    };
    return createTracksFromSpotifyImport(baseResult, {
      deduplicate,
      maxTracks: maxTrackLimit
    });
  }, [parsedData, effectiveTracks, deduplicate, maxTrackLimit]);

  const filteredPreviewTracks = useMemo(() => {
    if (!finalTracksToImport) return [];
    if (!searchFilter.trim()) return finalTracksToImport;
    const q = searchFilter.toLowerCase();
    return finalTracksToImport.filter(
      t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
    );
  }, [finalTracksToImport, searchFilter]);

  const totalCalculatedDuration = useMemo(() => {
    const totalSecs = finalTracksToImport.reduce((acc, t) => acc + (t.duration || 0), 0);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    if (hours > 0) return `${hours} saat ${mins} dakika`;
    return `${mins} dakika`;
  }, [finalTracksToImport]);

  const handleParse = async (overrideUrl?: string) => {
    const urlToUse = overrideUrl || spotifyUrl;
    if (!urlToUse.trim()) return;
    setIsLoading(true);
    setErrorMsg('');
    setProgressText('Spotify API ile bağlantı kuruluyor...');

    try {
      setTimeout(() => {
        setProgressText('Bölümler ve şarkı listesi eksiksiz taranıyor...');
      }, 1000);

      const result = await parseSpotifyUrl(urlToUse);
      if (!result || (result.tracks && result.tracks.length === 0)) {
        setErrorMsg('Bu çalma listesindeki şarkılara ulaşılamadı. Çalma listesi Spotify uygulamasında "Gizli" (Özel) olabilir. Lütfen Spotify uygulamasında listeyi "Herkese Açık" (Public) yapın veya "Metin Listesi Yapıştır" sekmesinden şarkıları doğrudan ekleyin.');
        setIsLoading(false);
        return;
      }
      setParsedData(result);
      setUseFullSeries(true);
      setNewPlaylistName(result.parentShow?.title || result.title);
      setActiveTab('url');
    } catch (e: any) {
      setErrorMsg(e.message || 'Spotify verisi çekilirken bir sorun oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleParseTextList = () => {
    if (!textListInput.trim()) return;
    setIsParsingText(true);
    setErrorMsg('');

    try {
      const lines = textListInput
        .split('\n')
        .map(l => l.replace(/^[0-9]+[\.\-\)\s]+/, '').trim())
        .filter(l => l.length > 1);

      if (lines.length === 0) {
        setErrorMsg('Lütfen en az bir şarkı adı girin.');
        setIsParsingText(false);
        return;
      }

      const parsedTracks: Track[] = lines.map((line, idx) => {
        let title = line;
        let artist = 'Çeşitli Sanatçılar';

        if (line.includes(' - ')) {
          const parts = line.split(' - ');
          artist = parts[0].trim();
          title = parts.slice(1).join(' - ').trim();
        } else if (line.includes(' – ')) {
          const parts = line.split(' – ');
          artist = parts[0].trim();
          title = parts.slice(1).join(' – ').trim();
        } else if (line.includes(':')) {
          const parts = line.split(':');
          artist = parts[0].trim();
          title = parts.slice(1).join(':').trim();
        }

        return {
          id: `txt_${Date.now()}_${idx}`,
          title: title || line,
          artist: artist,
          album: 'Özel İçe Aktarma',
          duration: 210,
          coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
          audioUrl: '',
          source: 'spotify' as const,
          addedAt: new Date().toISOString(),
          genre: 'Özel Liste'
        };
      });

      setParsedData({
        type: 'playlist',
        id: `manual_${Date.now()}`,
        url: '',
        title: 'Özel Liste',
        authorName: 'Kullanıcı',
        thumbnailUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
        tracks: parsedTracks
      });
      setNewPlaylistName('Özel Liste');
      setActiveTab('url');
    } catch (err: any) {
      setErrorMsg(err.message || 'Metin listesi çözümlenirken hata oluştu.');
    } finally {
      setIsParsingText(false);
    }
  };

  const handleSelectCollection = (item: SpotifyPublicItem) => {
    setSpotifyUrl(item.spotifyUrl);
    handleParse(item.spotifyUrl);
  };

  const handleImport = () => {
    if (finalTracksToImport.length === 0) return;
    
    const listTitle = newPlaylistName || parsedData?.parentShow?.title || parsedData?.title || 'Spotify İçe Aktarma';

    if (targetChoice === 'new') {
      onImportTracks(finalTracksToImport, 'NEW_PLAYLIST', listTitle);
    } else {
      onImportTracks(finalTracksToImport, selectedPlaylistId);
    }

    confetti({ particleCount: 90, spread: 85, origin: { y: 0.6 } });
    onClose();
  };

  const handleTrackPreview = (track: Track) => {
    if (previewTrackId === track.id) {
      audioEngine.pause();
      setPreviewTrackId(null);
    } else {
      audioEngine.playTrack(track);
      setPreviewTrackId(track.id);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'playlist': return 'Çalma Listesi';
      case 'album': return 'Albüm';
      case 'show': return 'Podcast / Şiir Serisi';
      case 'episode': return 'Podcast / Şiir Bölümü';
      case 'track': return 'Şarkı';
      default: return 'Medya';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden text-neutral-100 max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/90 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#1DB954]/15 text-[#1DB954] rounded-xl border border-[#1DB954]/30">
                <Music2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">Spotify & Podcast İçe Aktarma</h2>
                  <span className="flex items-center gap-1 text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Zap className="w-3 h-3 text-emerald-400" /> Tam Seri & 1000 Parça
                  </span>
                </div>
                <p className="text-xs text-neutral-400">Şiir serileri, podcastler ve çalma listelerini tüm bölümleriyle anında çekin</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-neutral-800 bg-neutral-950/70 px-6 pt-2">
            <button
              onClick={() => setActiveTab('url')}
              className={`flex items-center gap-2 pb-2.5 px-4 text-xs font-bold border-b-2 transition ${
                activeTab === 'url'
                  ? 'border-[#1DB954] text-[#1DB954]'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" /> Link İle Aktar
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`flex items-center gap-2 pb-2.5 px-4 text-xs font-bold border-b-2 transition ${
                activeTab === 'text'
                  ? 'border-[#1DB954] text-[#1DB954]'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Şarkı Listesi Yapıştır
            </button>
            <button
              onClick={() => setActiveTab('browse')}
              className={`flex items-center gap-2 pb-2.5 px-4 text-xs font-bold border-b-2 transition ${
                activeTab === 'browse'
                  ? 'border-[#1DB954] text-[#1DB954]'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" /> Spotify'da Canlı Keşfet & Ara
            </button>
          </div>

          <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
            {/* TAB 1: Link Input Mode */}
            {activeTab === 'url' && (
              <>
                {/* Input URL */}
                <div>
                  <label className="text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-[#1DB954]" /> Spotify veya Podcast Bağlantısı
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://open.spotify.com/playlist/... veya /episode/... veya /show/..."
                      value={spotifyUrl}
                      onChange={(e) => setSpotifyUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleParse(); }}
                      className="flex-1 px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#1DB954]"
                    />
                    <button
                      onClick={() => handleParse()}
                      disabled={isLoading || !spotifyUrl.trim()}
                      className="px-5 py-2.5 bg-[#1DB954] hover:bg-[#1ed760] disabled:opacity-50 text-black text-xs font-bold rounded-xl flex items-center gap-2 transition shrink-0 cursor-pointer shadow-md shadow-[#1DB954]/20"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Çözümle & Tümünü Çek'}
                    </button>
                  </div>
                  {errorMsg && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2 mt-2.5">
                      <p className="text-xs text-rose-300 font-medium leading-relaxed">{errorMsg}</p>
                      <button
                        type="button"
                        onClick={() => { setActiveTab('text'); setErrorMsg(''); }}
                        className="text-[11px] font-bold px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-lg border border-rose-500/30 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" /> Şarkıları Metin Olarak Yapıştırmayı Dene
                      </button>
                    </div>
                  )}
                </div>

                {/* Loading Indicator */}
                {isLoading && (
                  <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-[#1DB954]" />
                    <div className="text-xs text-neutral-300">
                      <div className="font-semibold text-white">{progressText}</div>
                      <div className="text-[11px] text-neutral-500">Tüm şiirler, podcast bölümleri veya şarkılar taranıyor...</div>
                    </div>
                  </div>
                )}

                {/* Quick Examples */}
                {!parsedData && !isLoading && (
                  <div className="p-3.5 bg-neutral-950/60 rounded-xl border border-neutral-800 space-y-2">
                    <div className="text-[11px] text-neutral-400 font-medium flex items-center justify-between">
                      <span>Önerilen Hızlı Aktarımlar:</span>
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Tüm Seriyi Eksiksiz Çeker
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          const url = 'https://open.spotify.com/episode/4cto1WaeLmuOM1PsGB097p';
                          setSpotifyUrl(url);
                          handleParse(url);
                        }}
                        className="text-[11px] px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 rounded-lg border border-neutral-800 transition flex items-center gap-1.5"
                      >
                        <BookOpen className="w-3 h-3 text-emerald-400" /> Yıldız Kenter Şiir Serisi (13 Bölüm)
                      </button>
                      <button
                        onClick={() => {
                          const url = 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M';
                          setSpotifyUrl(url);
                          handleParse(url);
                        }}
                        className="text-[11px] px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-lg border border-neutral-800 transition"
                      >
                        🔥 Today's Top Hits (50 Şarkı)
                      </button>
                      <button
                        onClick={() => {
                          const url = 'https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd';
                          setSpotifyUrl(url);
                          handleParse(url);
                        }}
                        className="text-[11px] px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-lg border border-neutral-800 transition"
                      >
                        🌟 Türkçe Pop Zirve (50 Şarkı)
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* TAB 2: Text / Song List Input */}
            {activeTab === 'text' && (
              <div className="space-y-4">
                <div className="p-4 bg-neutral-950/80 rounded-xl border border-neutral-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <FileText className="w-4 h-4 text-[#1DB954]" />
                    <span>Şarkı Listesi veya Şarkı Adlarını Yapıştırın</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Gizli/özel Spotify listelerinizdeki veya notlarınızdaki şarkıları buraya doğrudan yapıştırabilirsiniz. Her satıra bir şarkı gelecek şekilde format: <code>Sanatçı - Şarkı Adı</code> veya sadece şarkı adı.
                  </p>
                  <textarea
                    rows={8}
                    placeholder={`Müslüm Gürses - Affet\nSezen Aksu - Gülümse\nYıldız Tilbe - Delikanlım\nEbru Gündeş - Kurşun Adres Sormaz Ki\nFerdi Tayfur - Huzurum Kalmadı`}
                    value={textListInput}
                    onChange={(e) => setTextListInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#1DB954] font-mono leading-relaxed"
                  />
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[11px] text-neutral-500">
                      {textListInput.split('\n').filter(l => l.trim().length > 1).length} şarkı algılandı
                    </span>
                    <button
                      type="button"
                      onClick={handleParseTextList}
                      disabled={isParsingText || !textListInput.trim()}
                      className="px-5 py-2.5 bg-[#1DB954] hover:bg-[#1ed760] disabled:opacity-50 text-black text-xs font-bold rounded-xl flex items-center gap-2 transition cursor-pointer shadow-md shadow-[#1DB954]/20"
                    >
                      {isParsingText ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Listeyi Çözümle & İncele
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Live Browse & Search Mode */}
            {activeTab === 'browse' && (
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Spotify'da çalma listesi, şiir, podcast veya sanatçı ara..."
                    value={browseQuery}
                    onChange={(e) => setBrowseQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#1DB954]"
                  />
                  {isSearchingBrowse && (
                    <Loader2 className="w-4 h-4 animate-spin text-[#1DB954] absolute right-3.5 top-3" />
                  )}
                </div>

                {/* Categories */}
                <div className="flex flex-wrap gap-1.5">
                  {['Tümü', 'Şiir & Edebiyat', 'Pop & Trendler', 'Sakinlik & Akustik', 'Podcast Yayınları'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`text-[11px] px-3 py-1 rounded-lg border transition ${
                        selectedCategory === cat
                          ? 'bg-[#1DB954] text-black font-bold border-[#1DB954]'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Items Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                  {filteredBrowseItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectCollection(item)}
                      className="flex items-center gap-3 p-3 bg-neutral-950/80 hover:bg-neutral-900 border border-neutral-800/80 hover:border-[#1DB954]/50 rounded-xl cursor-pointer transition group text-left"
                    >
                      <img
                        src={item.coverUrl}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover border border-neutral-800 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] uppercase font-bold text-[#1DB954] bg-[#1DB954]/10 px-1.5 py-0.5 rounded border border-[#1DB954]/20">
                            {item.isPodcast ? 'Podcast & Şiir' : 'Çalma Listesi'}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-semibold">
                            {item.trackCount} parça
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white truncate mt-0.5 group-hover:text-[#1DB954] transition">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-neutral-400 truncate">{item.author}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Parsed Result Card */}
            {parsedData && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-neutral-950 rounded-xl border border-[#1DB954]/30 space-y-4"
              >
                {/* Entity Info */}
                <div className="flex items-center gap-3">
                  <img
                    src={parsedData.thumbnailUrl}
                    alt={parsedData.title}
                    className="w-16 h-16 rounded-xl object-cover border border-neutral-800 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] uppercase font-extrabold text-[#1DB954] tracking-wider px-2 py-0.5 bg-[#1DB954]/10 rounded border border-[#1DB954]/20">
                        {getTypeLabel(parsedData.type)}
                      </span>
                      <span className="text-[11px] text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {finalTracksToImport.length} içerik ({totalCalculatedDuration})
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white truncate mt-1">
                      {parsedData.parentShow?.title || parsedData.title}
                    </h3>
                    <p className="text-xs text-neutral-400 truncate">{parsedData.authorName || 'Spotify'}</p>
                  </div>
                </div>

                {/* Smart Series Detection Banner */}
                {parsedData.parentShow && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        '{parsedData.parentShow.title}' Serisinin Tüm Bölümleri Bulundu ({parsedData.tracks.length} Kayıt)
                      </div>
                      <p className="text-[11px] text-neutral-400">
                        Tek bir kayıt yerine serideki diğer tüm şiirler ve ses kayıtları otomatik dahil edildi.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setUseFullSeries(true)}
                        className={`px-3 py-1 text-[11px] font-bold rounded-lg transition ${
                          useFullSeries ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20' : 'bg-neutral-800 text-neutral-300 hover:text-white'
                        }`}
                      >
                        Tüm Seri ({parsedData.tracks.length})
                      </button>
                      {parsedData.singleTrack && (
                        <button
                          type="button"
                          onClick={() => setUseFullSeries(false)}
                          className={`px-3 py-1 text-[11px] font-bold rounded-lg transition ${
                            !useFullSeries ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20' : 'bg-neutral-800 text-neutral-300 hover:text-white'
                          }`}
                        >
                          Yalnızca Bu (1)
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Import Options: Limit & Deduplication */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-neutral-800/80">
                  <div className="flex items-center justify-between p-2 bg-neutral-900/70 rounded-lg border border-neutral-800">
                    <label className="text-[11px] text-neutral-300 font-semibold flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={deduplicate}
                        onChange={(e) => setDeduplicate(e.target.checked)}
                        className="rounded border-neutral-700 text-[#1DB954] focus:ring-0"
                      />
                      Yinelenenleri Filtrele
                    </label>
                    <span className="text-[10px] text-neutral-500">Temiz Liste</span>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-neutral-900/70 rounded-lg border border-neutral-800">
                    <span className="text-[11px] text-neutral-300 font-semibold">Aktarım Limiti:</span>
                    <select
                      value={maxTrackLimit}
                      onChange={(e) => setMaxTrackLimit(Number(e.target.value))}
                      className="px-2 py-0.5 bg-neutral-950 border border-neutral-700 rounded text-[11px] text-white focus:outline-none"
                    >
                      <option value={1000}>Tümü (1000'e Kadar)</option>
                      <option value={500}>İlk 500 Şarkı</option>
                      <option value={250}>İlk 250 Şarkı</option>
                      <option value={100}>İlk 100 Şarkı</option>
                      <option value={50}>İlk 50 Şarkı</option>
                    </select>
                  </div>
                </div>

                {/* Track Preview Search & List */}
                <div className="space-y-2 pt-2 border-t border-neutral-800/80">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-neutral-400">
                      Aktarılacak Parçalar ({finalTracksToImport.length}):
                    </span>
                    <div className="relative w-44">
                      <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2" />
                      <input
                        type="text"
                        placeholder="Listede ara..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        className="w-full pl-7 pr-2 py-1 bg-neutral-900 border border-neutral-800 rounded-lg text-[11px] text-white placeholder-neutral-500 focus:outline-none focus:border-[#1DB954]"
                      />
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {filteredPreviewTracks.slice(0, 100).map((trk, i) => (
                      <div
                        key={trk.id || i}
                        className="flex items-center justify-between p-2 rounded-lg bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800/50 text-xs transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-[10px] text-neutral-500 w-5 text-right font-mono">{i + 1}</span>
                          <img src={trk.coverUrl} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
                          <div className="truncate">
                            <div className="font-semibold text-neutral-200 truncate">{trk.title}</div>
                            <div className="text-[10px] text-neutral-400 truncate">{trk.artist}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-neutral-500 font-mono">
                            {Math.floor(trk.duration / 60)}:{(trk.duration % 60).toString().padStart(2, '0')}
                          </span>
                          <button
                            onClick={() => handleTrackPreview(trk)}
                            className="p-1 text-neutral-400 hover:text-[#1DB954] hover:bg-neutral-800 rounded transition"
                            title="Önizlemeyi Dinle"
                          >
                            {previewTrackId === trk.id ? (
                              <Volume2 className="w-3.5 h-3.5 text-[#1DB954] animate-pulse" />
                            ) : (
                              <Play className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                    {filteredPreviewTracks.length > 100 && (
                      <div className="text-center py-1.5 text-[11px] text-neutral-500">
                        + {filteredPreviewTracks.length - 100} diğer şarkı daha aktarılacak...
                      </div>
                    )}
                  </div>
                </div>

                {/* Target Playlist Options */}
                <div className="pt-3 border-t border-neutral-800 space-y-2">
                  <span className="text-xs text-neutral-300 font-semibold block">Nereye Aktarılsın?</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setTargetChoice('new')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                        targetChoice === 'new'
                          ? 'bg-[#1DB954]/20 border-[#1DB954] text-[#1DB954]'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <ListMusic className="w-3.5 h-3.5" /> Yeni Liste Oluştur
                    </button>
                    <button
                      onClick={() => setTargetChoice('current')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                        targetChoice === 'current'
                          ? 'bg-[#1DB954]/20 border-[#1DB954] text-[#1DB954]'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" /> Mevcut Listeye Ekle
                    </button>
                  </div>

                  {targetChoice === 'new' ? (
                    <input
                      type="text"
                      placeholder="Yeni Liste Başlığı..."
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      className="w-full mt-2 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#1DB954]"
                    />
                  ) : (
                    <select
                      value={selectedPlaylistId}
                      onChange={(e) => setSelectedPlaylistId(e.target.value)}
                      className="w-full mt-2 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#1DB954]"
                    >
                      {playlists.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.tracks.length} şarkı)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 bg-neutral-950 border-t border-neutral-800 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white transition"
            >
              Kapat
            </button>
            {parsedData && (
              <button
                onClick={handleImport}
                disabled={finalTracksToImport.length === 0}
                className="px-5 py-2.5 bg-[#1DB954] hover:bg-[#1ed760] disabled:opacity-50 text-black text-xs font-bold rounded-full transition flex items-center gap-1.5 shadow-lg shadow-[#1DB954]/25 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" /> {finalTracksToImport.length} Parçayı Aktar & Çal
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
