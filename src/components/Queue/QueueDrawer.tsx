import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ListMusic, Play, Trash2, ArrowUp, ArrowDown, ThumbsUp, Sparkles, Disc } from 'lucide-react';
import { Track } from '../../types';

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  queue: Track[];
  currentTrack: Track | null;
  onPlayTrackFromQueue: (track: Track, index: number) => void;
  onRemoveFromQueue: (index: number) => void;
  onMoveQueueItem: (from: number, to: number) => void;
  onClearQueue: () => void;
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
  onUpvoteTrack
}) => {
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
            <div className="flex items-center gap-2">
              {queue.length > 0 && (
                <button
                  onClick={onClearQueue}
                  className="px-2.5 py-1 text-xs text-neutral-400 hover:text-rose-400 transition"
                  title="Sırayı Temizle"
                >
                  Temizle
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
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
              </div>

              {queue.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-neutral-800 rounded-2xl bg-neutral-950/40">
                  <Disc className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                  <p className="text-xs text-neutral-400">Sırada başka şarkı yok</p>
                  <p className="text-[11px] text-neutral-500 mt-1">Listelerden şarkı ekleyebilir veya otomatik sırayı dinleyebilirsiniz.</p>
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
                        className="w-5 text-center text-emerald-400 hidden group-hover:block transition"
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
                          className="flex items-center gap-1 px-2 py-1 bg-neutral-900 hover:bg-emerald-500/20 text-neutral-400 hover:text-emerald-300 rounded-lg text-[10px] font-bold border border-neutral-800 transition"
                          title="Parti Sırasında Yukarı Taşı (Oy Ver)"
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>{track.upvotes || 0}</span>
                        </button>
                      )}

                      {/* Reorder Up/Down */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                        <button
                          disabled={idx === 0}
                          onClick={() => onMoveQueueItem(idx, idx - 1)}
                          className="p-1 hover:text-white disabled:opacity-20 text-neutral-400"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={idx === queue.length - 1}
                          onClick={() => onMoveQueueItem(idx, idx + 1)}
                          className="p-1 hover:text-white disabled:opacity-20 text-neutral-400"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onRemoveFromQueue(idx)}
                          className="p-1 hover:text-rose-400 text-neutral-400"
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
