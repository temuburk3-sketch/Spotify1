import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ListMusic, 
  Play, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  ThumbsUp, 
  Sparkles, 
  Disc, 
  Heart,
  Shuffle,
  Layers
} from 'lucide-react';
import { Track } from '../../types';
import { isTrackFollowed, toggleFollowTrack, subscribeToFollowChanges } from '../../services/followService';

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  queue: Track[];
  currentTrack: Track | null;
  onPlayTrackFromQueue: (track: Track, index: number) => void;
  onRemoveFromQueue: (index: number) => void;
  onMoveQueueItem: (from: number, to: number) => void;
  onClearQueue: () => void;
  onReshuffleQueue?: () => void;
  onOpenMixer?: () => void;
  onUpvoteTrack?: (trackId: string) => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  isOpen,
  onClose,
  queue,
  currentTrack,
  onPlayTrackFromQueue,
  onRemoveFromQueue,
  onMoveQueueItem,
  onClearQueue,
  onReshuffleQueue,
  onOpenMixer,
  onUpvoteTrack
}) => {
  const [followTick, setFollowTick] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToFollowChanges(() => {
      setFollowTick(prev => prev + 1);
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, x: 350 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 350 }}
          className="relative w-full max-w-md h-full bg-neutral-900 border-l border-neutral-800 shadow-2xl flex flex-col text-neutral-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/80">
            <div className="flex items-center gap-2.5">
              <ListMusic className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white">Çalma Sırası (Queue)</h2>
            </div>
            <div className="flex items-center gap-1.5">
              {queue.length > 1 && onReshuffleQueue && (
                <button
                  onClick={onReshuffleQueue}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition font-medium cursor-pointer"
                  title="Sıradaki tüm şarkıları yeniden karıştır (Spotify Shuffle)"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Sırayı Karıştır</span>
                </button>
              )}
              {queue.length > 0 && (
                <button
                  onClick={onClearQueue}
                  className="px-2.5 py-1 text-xs text-neutral-400 hover:text-rose-400 transition cursor-pointer"
                  title="Sırayı Temizle"
                >
                  Temizle
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Quick Mixer Action in Queue */}
            {onOpenMixer && (
              <div className="p-3 bg-gradient-to-r from-emerald-950/40 via-neutral-950 to-indigo-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">Listeleri Sıraya Mixle</div>
                    <div className="text-[10px] text-neutral-400 truncate">1'den fazla listeyi seçip bu sıraya harmanlayın</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onOpenMixer();
                  }}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-lg transition shrink-0 cursor-pointer"
                >
                  Listeleri Mixle
                </button>
              </div>
            )}

            {/* Currently Playing */}
            {currentTrack && (
              <div>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-2">
                  Şu Anda Çalıyor
                </span>
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 shadow-md">
                    <img src={currentTrack.coverUrl} alt={currentTrack.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white truncate">{currentTrack.title}</div>
                    <div className="text-[11px] text-neutral-400 truncate">{currentTrack.artist}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                    Çalıyor
                  </span>
                </div>
              </div>
            )}

            {/* Upcoming Queue */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  Sıradaki Şarkılar ({queue.length})
                </span>
                {queue.length > 1 && onReshuffleQueue && (
                  <button
                    onClick={onReshuffleQueue}
                    className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Shuffle className="w-3 h-3" />
                    <span>Yeniden Karıştır</span>
                  </button>
                )}
              </div>

              {queue.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-neutral-800 rounded-2xl bg-neutral-950/40">
                  <Disc className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                  <p className="text-xs text-neutral-400">Sırada başka şarkı yok</p>
                  <p className="text-[11px] text-neutral-500 mt-1">Listelerden şarkı ekleyebilir veya "Listeleri Mixle" ile birden fazla listeyi harmanlayabilirsiniz.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {queue.map((track, idx) => (
                    <div
                      key={`${track.id}_${idx}`}
                      className="group p-2.5 bg-neutral-950/70 hover:bg-neutral-800/80 border border-neutral-800/80 rounded-xl flex items-center gap-3 transition"
                    >
                      <span className="w-5 text-center text-xs font-mono text-neutral-500 group-hover:hidden">
                        {idx + 1}
                      </span>
                      <button
                        onClick={() => onPlayTrackFromQueue(track, idx)}
                        className="w-5 text-center text-emerald-400 hidden group-hover:block transition cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-emerald-400" />
                      </button>

                      <img src={track.coverUrl} alt={track.title} className="w-10 h-10 rounded-lg object-cover shrink-0" />

                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-neutral-200 truncate group-hover:text-white">
                          {track.title}
                        </div>
                        <div className="text-[11px] text-neutral-400 truncate">{track.artist}</div>
                      </div>

                      {/* Upvote */}
                      {onUpvoteTrack && (
                        <button
                          onClick={() => onUpvoteTrack(track.id)}
                          className="flex items-center gap-1 px-2 py-1 bg-neutral-900 hover:bg-emerald-500/20 text-neutral-400 hover:text-emerald-300 rounded-lg text-[10px] font-bold border border-neutral-800 transition cursor-pointer"
                          title="Parti Sırasında Yukarı Taşı (Oy Ver)"
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>{track.upvotes || 0}</span>
                        </button>
                      )}

                      {/* Follow Heart */}
                      {(() => {
                        const isFollowed = isTrackFollowed(track.id) || isTrackFollowed(track.title);
                        return (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFollowTrack(track);
                            }}
                            className={`p-1 rounded-lg transition cursor-pointer ${
                              isFollowed
                                ? 'text-rose-500 opacity-100'
                                : 'text-neutral-500 hover:text-rose-400 opacity-0 group-hover:opacity-100'
                            }`}
                            title={isFollowed ? 'Şarkıyı Takipten Çıkar' : 'Şarkıyı Takip Et'}
                          >
                            <Heart className={`w-3.5 h-3.5 ${isFollowed ? 'fill-rose-500 text-rose-500' : ''}`} />
                          </button>
                        );
                      })()}

                      {/* Reorder Up/Down */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                        <button
                          disabled={idx === 0}
                          onClick={() => onMoveQueueItem(idx, idx - 1)}
                          className="p-1 hover:text-white disabled:opacity-20 text-neutral-400 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={idx === queue.length - 1}
                          onClick={() => onMoveQueueItem(idx, idx + 1)}
                          className="p-1 hover:text-white disabled:opacity-20 text-neutral-400 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onRemoveFromQueue(idx)}
                          className="p-1 hover:text-rose-400 text-neutral-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
