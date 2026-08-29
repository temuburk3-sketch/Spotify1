import React, { useState, useEffect, useCallback, memo } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Play, Pause, Plus, HardDrive, RefreshCw, Music, Disc, Flame, Coffee, Compass, Radio, Check, Volume2, ShieldCheck, ListPlus, TrendingUp, Clock, BarChart3, HelpCircle, Heart } from 'lucide-react';
import { Track, Playlist, ListeningHabitsSummary } from '../../types';
import { fetchSmartRecommendations, getListeningHabitsSummary, getEndlessAutoplay, setEndlessAutoplay } from '../../services/recommendationService';
import { isTrackFollowed, toggleFollowTrack, subscribeToFollowChanges } from '../../services/followService';
import confetti from 'canvas-confetti';

interface RecommendationsViewProps {
  playlists: Playlist[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track, contextTracks?: Track[], contextName?: string) => void;
  onAddTrackToPlaylist: (track: Track, playlistId: string) => void;
  onAddToQueue: (track: Track) => void;
  onDownloadTrackOffline: (track: Track) => Promise<void>;
  onOpenPrivateModeGuide: () => void;
  onStartSongRadio?: (track: Track) => void;
}

const MOODS = [
  { id: 'all', label: '🌟 Tüm Zevklerin', desc: 'Genel dinleme profiline göre en iyi eşleşmeler' },
  { id: 'arabesk', label: '🥀 Arabesk & Damar', desc: 'Müslüm Gürses, Azer Bülbül, Ferdi Tayfur & klasik damar eserler' },
  { id: 'turkish', label: '🇹🇷 Türkçe Pop & Hit', desc: 'Türkçe modern pop, alternatif ve hitler' },
  { id: 'rock', label: '🎸 Anadolu & Modern Rock', desc: 'Barış Manço, Duman, Mor ve Ötesi, Şebnem Ferah' },
  { id: 'rap', label: '🎤 Türkçe Rap & Hip-Hop', desc: 'Ezhel, Ceza, Sagopa Kajmer, Uzi, Motive' },
  { id: 'energetic', label: '🔥 Enerjik & Spor', desc: 'Yüksek BPM, motivasyon ve ritim' },
  { id: 'chill', label: '☕ Chill & Lo-Fi', desc: 'Ders, çalışma ve odaklanma için sakin ritimler' },
  { id: 'driving', label: '🌃 Gece Sürüşü & Synthwave', desc: 'Kavinsky, retro dalgalar ve gece atmosferi' }
];

export const RecommendationsView: React.FC<RecommendationsViewProps> = memo(({
  playlists,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onAddTrackToPlaylist,
  onAddToQueue,
  onDownloadTrackOffline,
  onOpenPrivateModeGuide,
  onStartSongRadio
}) => {
  const [activeMood, setActiveMood] = useState<string>('all');
  const [recommendations, setRecommendations] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [habits, setHabits] = useState<ListeningHabitsSummary>(getListeningHabitsSummary());
  const [endlessAutoplay, setEndlessState] = useState<boolean>(getEndlessAutoplay());
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>(playlists[0]?.id || '');
  const [addedTrackIds, setAddedTrackIds] = useState<Set<string>>(new Set());
  const [isAddingAll, setIsAddingAll] = useState(false);
  const [followTick, setFollowTick] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToFollowChanges(() => {
      setFollowTick(prev => prev + 1);
    });
    return unsubscribe;
  }, []);

  const loadRecs = useCallback(async (mood: string) => {
    setIsLoading(true);
    try {
      const recs = await fetchSmartRecommendations({
        mood: mood as any,
        count: 10
      });
      setRecommendations(recs);
      setHabits(getListeningHabitsSummary());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecs(activeMood);
  }, [activeMood]);

  const handleToggleEndless = () => {
    const next = !endlessAutoplay;
    setEndlessState(next);
    setEndlessAutoplay(next);
  };

  const handleAddAllToPlaylist = () => {
    if (!selectedPlaylistId || recommendations.length === 0) return;
    setIsAddingAll(true);
    recommendations.forEach(track => {
      onAddTrackToPlaylist(track, selectedPlaylistId);
    });
    setAddedTrackIds(new Set(recommendations.map(r => r.id)));
    confetti({ particleCount: 70, spread: 70 });
    setTimeout(() => setIsAddingAll(false), 800);
  };

  const handleAddSingle = (track: Track) => {
    if (!selectedPlaylistId) return;
    onAddTrackToPlaylist(track, selectedPlaylistId);
    setAddedTrackIds(prev => new Set(prev).add(track.id));
    confetti({ particleCount: 25, spread: 45 });
  };

  return (
    <div className="flex-1 overflow-y-auto pb-56 sm:pb-44 text-neutral-100 select-none custom-scrollbar">
      {/* Top Banner */}
      <div className="relative p-6 md:p-8 bg-gradient-to-b from-indigo-950/70 via-neutral-900/90 to-neutral-900 border-b border-neutral-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center gap-1 text-[11px] uppercase font-black tracking-widest px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 text-emerald-400 border border-emerald-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                Gemini 3.7 Flash Destekli
              </span>
              <span className="text-[11px] text-neutral-400 font-medium hidden sm:inline">
                • Dinleme Alışkanlığına Göre Akıllı Müzik Motoru
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">
              Sana Özel Akıllı Öneriler
            </h1>
            <p className="text-sm text-neutral-300 mt-1 max-w-xl">
              Dinlediğin şarkıların ritim, vokal ve tür yapısını analiz ederek sana en uygun şarkıları anında keşfet ve çalma listelerine otomatik ekle.
            </p>
          </div>

          {/* Quick Actions & Privacy Mode Guide Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenPrivateModeGuide}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-xs font-bold text-neutral-200 border border-neutral-700 transition"
              title="Bu uygulamayı sadece kendinize özel hale getirme rehberi"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Sadece Bana Özel Mod</span>
            </button>

            <button
              onClick={handleToggleEndless}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
                endlessAutoplay
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-neutral-800/80 text-neutral-400 border-neutral-700'
              }`}
              title="Liste bittiğinde benzer şarkıları durmaksızın çal"
            >
              <Radio className="w-4 h-4 text-emerald-400" />
              <span>Sonsuz Akıllı Radyo ({endlessAutoplay ? 'Açık' : 'Kapalı'})</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
        {/* 1. Listening Habits Insights Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Dominant Vibe Card */}
          <div className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-400 text-xs font-bold">
              <span>BASKIN MÜZİK TARZIN</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="my-3">
              <div className="text-xl font-black text-white">{habits.dominantVibe}</div>
              <div className="text-xs text-neutral-400 mt-1">
                Kayıtlı toplam dinleme: <span className="text-emerald-400 font-bold">{habits.totalPlays || 15}+ parça</span>
              </div>
            </div>
            <div className="text-[11px] text-neutral-400 bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800/80">
              💡 Öneriler dinleme geçmişinize ve en çok dinlediğiniz sanatçılara göre otomatik yenilenir.
            </div>
          </div>

          {/* Top Genres Breakdown */}
          <div className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800">
            <div className="flex items-center justify-between text-neutral-400 text-xs font-bold mb-3">
              <span>EN ÇOK DİNLEDİĞİN TÜRLER</span>
              <BarChart3 className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="space-y-2.5">
              {habits.topGenres.slice(0, 3).map((g, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-neutral-200">{g.genre}</span>
                    <span className="text-emerald-400 font-bold">%{g.percentage}</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                      style={{ width: `${Math.max(g.percentage, 15)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Artists & Favorites */}
          <div className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-400 text-xs font-bold mb-2">
              <span>FAVORİ SANATÇILARIN</span>
              <Disc className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex flex-wrap gap-1.5 my-2">
              {habits.topArtists.slice(0, 5).map((a, i) => (
                <span
                  key={i}
                  className="text-xs px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-200 font-medium border border-neutral-700"
                >
                  {a.artist}
                </span>
              ))}
            </div>
            <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 mt-2">
              <Clock className="w-3.5 h-3.5 text-neutral-400" />
              <span>Son oturumda analiz edildi</span>
            </div>
          </div>
        </div>

        {/* 2. Mood & Vibe Filter Pills */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Ruh Haline Göre Keşfet</span>
            </h2>
            <button
              onClick={() => loadRecs(activeMood)}
              disabled={isLoading}
              className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-bold transition px-2.5 py-1 rounded-lg hover:bg-neutral-800 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Yenile & Tekrar Üret</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {MOODS.map(m => (
              <button
                key={m.id}
                onClick={() => setActiveMood(m.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                  activeMood === m.id
                    ? 'bg-emerald-500 text-black border-emerald-400 shadow-lg shadow-emerald-500/20'
                    : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800 hover:text-white'
                }`}
              >
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Batch Add Toolbar */}
        {recommendations.length > 0 && (
          <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-neutral-300 flex items-center gap-2">
              <ListPlus className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong className="text-white">{recommendations.length} şarkılık</strong> akıllı liste hazırlandı.
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedPlaylistId}
                onChange={e => setSelectedPlaylistId(e.target.value)}
                className="bg-neutral-950 text-white text-xs px-3 py-2 rounded-xl border border-neutral-700 focus:outline-none focus:border-emerald-500 font-medium"
              >
                {playlists.map(p => (
                  <option key={p.id} value={p.id}>
                    📥 {p.name} ({p.tracks.length} şarkı)
                  </option>
                ))}
              </select>

              <button
                onClick={handleAddAllToPlaylist}
                disabled={isAddingAll || !selectedPlaylistId}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-xs transition shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{isAddingAll ? 'Ekleniyor...' : 'Tümünü Listeme Ekle'}</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. Recommendation Track Cards */}
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-neutral-400">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
            <p className="text-sm font-semibold text-neutral-300">Zevkinize uygun en iyi şarkılar taranıyor...</p>
            <p className="text-xs text-neutral-500">Gemini 3.7 müzik harmonisi ve sanatçı veritabanı analiz ediliyor</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {recommendations.map((track, idx) => {
              const isCurrentPlaying = currentTrack?.id === track.id && isPlaying;
              const isAdded = addedTrackIds.has(track.id);

              return (
                <div
                  key={track.id || idx}
                  className="group relative p-3.5 rounded-2xl bg-neutral-900/80 hover:bg-neutral-850 border border-neutral-800/80 hover:border-neutral-700 transition flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start gap-3.5">
                    {/* Cover Art with Play Button */}
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-neutral-800 bg-neutral-950">
                      <img
                        src={track.coverUrl}
                        alt={track.title}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => onPlayTrack(track, recommendations, `${MOODS.find(m => m.id === activeMood)?.label || 'Tavsiyeler'}`)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-emerald-400 transition"
                      >
                        {isCurrentPlaying ? (
                          <Pause className="w-7 h-7 fill-emerald-400" />
                        ) : (
                          <Play className="w-7 h-7 fill-emerald-400" />
                        )}
                      </button>
                    </div>

                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3
                          onClick={() => onPlayTrack(track, recommendations, `${MOODS.find(m => m.id === activeMood)?.label || 'Tavsiyeler'}`)}
                          className="font-bold text-sm text-white hover:text-emerald-400 cursor-pointer truncate"
                        >
                          {track.title}
                        </h3>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                          %{track.matchScore || 98} Uyum
                        </span>
                      </div>

                      <div className="text-xs text-neutral-400 truncate mt-0.5">{track.artist}</div>

                      {/* AI Reason Badge */}
                      {track.recommendationReason && (
                        <div className="mt-2 text-[11px] text-indigo-300/90 bg-indigo-950/40 border border-indigo-500/20 px-2 py-1 rounded-lg line-clamp-2">
                          ✨ {track.recommendationReason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800/60 text-xs">
                    <span className="text-[11px] text-neutral-400 font-medium px-2 py-0.5 bg-neutral-950 rounded-md">
                      {track.genre || 'Hit'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* Follow Song Heart Button */}
                      {(() => {
                        const isFollowed = isTrackFollowed(track.id) || isTrackFollowed(track.title);
                        return (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFollowTrack(track);
                            }}
                            className={`p-1.5 rounded-lg border transition cursor-pointer ${
                              isFollowed
                                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                                : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700/60 text-neutral-400 hover:text-rose-400'
                            }`}
                            title={isFollowed ? 'Şarkıyı Takipten Çıkar' : 'Şarkıyı Takip Et'}
                          >
                            <Heart className={`w-3.5 h-3.5 ${isFollowed ? 'fill-rose-500 text-rose-500' : ''}`} />
                          </button>
                        );
                      })()}

                      {onStartSongRadio && (
                        <button
                          onClick={() => onStartSongRadio(track)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-amber-400/50 text-amber-300 transition font-medium text-[11px]"
                          title="Bu şarkının tarzında sonsuz radyo başlat"
                        >
                          <Radio className="w-3.5 h-3.5" />
                          <span>Radyo</span>
                        </button>
                      )}

                      <button
                        onClick={() => onAddToQueue(track)}
                        className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition font-medium"
                        title="Kuyruğa Ekle"
                      >
                        Kuyruğa Ekle
                      </button>

                      <button
                        onClick={() => handleAddSingle(track)}
                        disabled={isAdded}
                        className={`flex items-center gap-1 px-3 py-1 rounded-lg font-bold transition ${
                          isAdded
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-xs'
                        }`}
                        title="Seçili Çalma Listesine Ekle"
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Eklendi</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Listeye Ekle</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

RecommendationsView.displayName = 'RecommendationsView';
