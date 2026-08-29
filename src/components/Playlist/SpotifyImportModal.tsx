import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Music2, Link as LinkIcon, Sparkles, Check, Loader2, ListMusic, Play, Volume2, Search, Filter, ShieldCheck, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Playlist, Track } from '../../types';
import { parseSpotifyUrl, createTracksFromSpotifyImport, SpotifyParsedResult } from '../../services/spotifyParser';
import { audioEngine } from '../../services/audioEngine';

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
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progressText, setProgressText] = useState('Spotify verileri çözümleniyor...');
  const [parsedData, setParsedData] = useState<SpotifyParsedResult | null>(null);
  const [targetChoice, setTargetChoice] = useState<'current' | 'new'>(currentPlaylistId ? 'current' : 'new');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(currentPlaylistId || playlists[0]?.id || '');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const [deduplicate, setDeduplicate] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [maxTrackLimit, setMaxTrackLimit] = useState<number>(1000);

  const finalTracksToImport = useMemo(() => {
    if (!parsedData) return [];
    return createTracksFromSpotifyImport(parsedData, {
      deduplicate,
      maxTracks: maxTrackLimit
    });
  }, [parsedData, deduplicate, maxTrackLimit]);

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

  const handleParse = async () => {
    if (!spotifyUrl.trim()) return;
    setIsLoading(true);
    setErrorMsg('');
    setProgressText('Spotify API ile bağlantı kuruluyor...');

    try {
      setTimeout(() => {
        setProgressText('Sayfalar taranıyor ve 1000 şarkıya kadar taranıyor...');
      }, 1200);

      const result = await parseSpotifyUrl(spotifyUrl);
      if (!result || (result.tracks && result.tracks.length === 0)) {
        setErrorMsg('Spotify listesi veya şarkısı çözümlenemedi. Lütfen geçerli bir Spotify URL veya paylaşım bağlantısı girin.');
        setIsLoading(false);
        return;
      }
      setParsedData(result);
      setNewPlaylistName(result.title);
    } catch (e: any) {
      setErrorMsg(e.message || 'Spotify verisi çekilirken bir sorun oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = () => {
    if (finalTracksToImport.length === 0) return;
    
    if (targetChoice === 'new') {
      onImportTracks(finalTracksToImport, 'NEW_PLAYLIST', newPlaylistName || parsedData?.title || 'Spotify İçe Aktarma');
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden text-neutral-100 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/90 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#1DB954]/15 text-[#1DB954] rounded-xl border border-[#1DB954]/30">
                <Music2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">Spotify Çalma Listesi İçe Aktar</h2>
                  <span className="flex items-center gap-1 text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Zap className="w-3 h-3 text-emerald-400" /> 1000 Şarkı Desteği
                  </span>
                </div>
                <p className="text-xs text-neutral-400">Tek tıkla 1000 şarkıya kadar eksiksiz ve orijinal ses eşleşmesiyle aktarın</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
            {/* Input URL */}
            <div>
              <label className="text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-[#1DB954]" /> Spotify URL'si veya Paylaşım Bağlantısı
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M..."
                  value={spotifyUrl}
                  onChange={(e) => setSpotifyUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleParse(); }}
                  className="flex-1 px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#1DB954]"
                />
                <button
                  onClick={handleParse}
                  disabled={isLoading || !spotifyUrl.trim()}
                  className="px-5 py-2.5 bg-[#1DB954] hover:bg-[#1ed760] disabled:opacity-50 text-black text-xs font-bold rounded-xl flex items-center gap-2 transition shrink-0 cursor-pointer shadow-md shadow-[#1DB954]/20"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Çözümle (1000 Max)'}
                </button>
              </div>
              {errorMsg && <p className="text-xs text-rose-400 mt-2">{errorMsg}</p>}
            </div>

            {/* Loading Indicator */}
            {isLoading && (
              <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-[#1DB954]" />
                <div className="text-xs text-neutral-300">
                  <div className="font-semibold text-white">{progressText}</div>
                  <div className="text-[11px] text-neutral-500">Büyük çalma listeleri sayfalama ile taranıyor...</div>
                </div>
              </div>
            )}

            {/* Example links */}
            {!parsedData && !isLoading && (
              <div className="p-3.5 bg-neutral-950/60 rounded-xl border border-neutral-800">
                <div className="text-[11px] text-neutral-400 font-medium mb-2 flex items-center justify-between">
                  <span>Hızlı Deneme Bağlantıları:</span>
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Orijinal Stüdyo & Kayıp Olmadan
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const url = 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M';
                      setSpotifyUrl(url);
                    }}
                    className="text-[11px] px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-lg border border-neutral-800 transition"
                  >
                    🔥 Today's Top Hits (50 Şarkı)
                  </button>
                  <button
                    onClick={() => {
                      const url = 'https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd';
                      setSpotifyUrl(url);
                    }}
                    className="text-[11px] px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-lg border border-neutral-800 transition"
                  >
                    🌟 RapCaviar (Geniş Liste)
                  </button>
                  <button
                    onClick={() => {
                      const url = 'https://open.spotify.com/track/7bxaFZ1O3cHkgLKMsdC3xR';
                      setSpotifyUrl(url);
                    }}
                    className="text-[11px] px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-lg border border-neutral-800 transition"
                  >
                    🎵 Tek Şarkı (Tame Impala)
                  </button>
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
                {/* Playlist Info */}
                <div className="flex items-center gap-3">
                  <img
                    src={parsedData.thumbnailUrl}
                    alt={parsedData.title}
                    className="w-16 h-16 rounded-xl object-cover border border-neutral-800 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] uppercase font-extrabold text-[#1DB954] tracking-wider px-2 py-0.5 bg-[#1DB954]/10 rounded border border-[#1DB954]/20">
                        {parsedData.type === 'playlist' ? 'Çalma Listesi' : parsedData.type === 'album' ? 'Albüm' : 'Şarkı'}
                      </span>
                      <span className="text-[11px] text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {finalTracksToImport.length} şarkı ({totalCalculatedDuration})
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white truncate mt-1">{parsedData.title}</h3>
                    <p className="text-xs text-neutral-400 truncate">{parsedData.authorName || 'Spotify'}</p>
                  </div>
                </div>

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
                      Aktarılacak Şarkılar ({finalTracksToImport.length}):
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
                <Sparkles className="w-3.5 h-3.5" /> {finalTracksToImport.length} Şarkıyı Aktar & Çal
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
