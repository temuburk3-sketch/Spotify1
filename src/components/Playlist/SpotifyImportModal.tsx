import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Music2, Link as LinkIcon, Sparkles, Check, ArrowRight, Loader2, ListMusic, Play, Volume2 } from 'lucide-react';
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
  const [parsedData, setParsedData] = useState<SpotifyParsedResult | null>(null);
  const [targetChoice, setTargetChoice] = useState<'current' | 'new'>(currentPlaylistId ? 'current' : 'new');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(currentPlaylistId || playlists[0]?.id || '');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleParse = async () => {
    if (!spotifyUrl.trim()) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
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
    if (!parsedData) return;
    const generatedTracks = createTracksFromSpotifyImport(parsedData);
    
    if (targetChoice === 'new') {
      onImportTracks(generatedTracks, 'NEW_PLAYLIST', newPlaylistName || parsedData.title);
    } else {
      onImportTracks(generatedTracks, selectedPlaylistId);
    }

    confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden text-neutral-100 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/80 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#1DB954]/10 text-[#1DB954] rounded-lg">
                <Music2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Spotify Çalma Listesi İçe Aktar</h2>
                <p className="text-xs text-neutral-400">Şarkıları orijinal isimleri ve gerçek ses önizlemeleriyle aktarın</p>
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
                  className="px-4 py-2 bg-[#1DB954] hover:bg-[#1ed760] disabled:opacity-50 text-black text-xs font-bold rounded-xl flex items-center gap-1.5 transition shrink-0"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Çözümle'}
                </button>
              </div>
              {errorMsg && <p className="text-xs text-rose-400 mt-2">{errorMsg}</p>}
            </div>

            {/* Example links */}
            {!parsedData && (
              <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800">
                <div className="text-[11px] text-neutral-400 font-medium mb-2">Hızlı Deneme Bağlantıları:</div>
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
                <div className="flex items-center gap-3">
                  <img
                    src={parsedData.thumbnailUrl}
                    alt={parsedData.title}
                    className="w-16 h-16 rounded-xl object-cover border border-neutral-800 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-[#1DB954] tracking-wider px-2 py-0.5 bg-[#1DB954]/10 rounded">
                        {parsedData.type === 'playlist' ? 'Çalma Listesi' : parsedData.type === 'album' ? 'Albüm' : 'Şarkı'}
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        {parsedData.tracks.length} orijinal şarkı
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white truncate mt-1">{parsedData.title}</h3>
                    <p className="text-xs text-neutral-400 truncate">{parsedData.authorName}</p>
                  </div>
                </div>

                {/* Track Preview List */}
                <div className="space-y-1.5 pt-2 border-t border-neutral-800/80">
                  <div className="text-[11px] font-semibold text-neutral-400 mb-1 flex items-center justify-between">
                    <span>İçerikteki Şarkılar ({parsedData.tracks.length}):</span>
                    <span className="text-[10px] text-neutral-500">Orijinal Ses Eşleşmesi Aktif</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {parsedData.tracks.map((trk, i) => (
                      <div
                        key={trk.id || i}
                        className="flex items-center justify-between p-2 rounded-lg bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800/50 text-xs transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-[10px] text-neutral-500 w-4 text-right font-mono">{i + 1}</span>
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
                className="px-5 py-2.5 bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-bold rounded-full transition flex items-center gap-1.5 shadow-lg shadow-[#1DB954]/25 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" /> {parsedData.tracks.length} Şarkıyı Aktar & Çal
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
