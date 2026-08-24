import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users, ArrowRight, Sparkles, CheckCircle2, Shield } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Playlist } from '../../types';
import { getCurrentUser, collabManager } from '../../services/collaboration';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: Playlist[];
  onSelectPlaylist: (id: string) => void;
  onAddCollaborativePlaylist: (playlist: Playlist) => void;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  isOpen,
  onClose,
  playlists,
  onSelectPlaylist,
  onAddCollaborativePlaylist
}) => {
  const [pinCode, setPinCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const currentUser = getCurrentUser();

  if (!isOpen) return null;

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pinCode.trim();
    if (!cleanPin) return;

    // Check if matching playlist already exists locally
    const existing = playlists.find(p => p.roomCode === cleanPin);
    if (existing) {
      onSelectPlaylist(existing.id);
      confetti({ particleCount: 60, spread: 60 });
      onClose();
      return;
    }

    // Otherwise create or connect to new collaborative room playlist
    const newCollabPlaylist: Playlist = {
      id: `collab_room_${cleanPin}`,
      name: `Ortak Liste #${cleanPin}`,
      description: `Canlı ortak çalışma odası (#${cleanPin}). Arkadaşlarınla anlık sıralama ve şarkı ekleme.`,
      coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isCollaborative: true,
      roomCode: cleanPin,
      collaborators: [
        {
          id: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar,
          role: 'editor',
          isOnline: true,
          lastActive: 'Şimdi katıldı'
        },
        {
          id: `u_host_${cleanPin}`,
          name: 'Oda Sahibi',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          role: 'owner',
          isOnline: true,
          lastActive: 'Çevrimiçi'
        }
      ],
      tracks: [
        {
          id: `trk_collab_1_${Date.now()}`,
          title: 'Antidepresan',
          artist: 'Mert Demir, Mabel Matiz',
          album: 'Ortak Havuz',
          duration: 202,
          coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
          audioUrl: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f792cb.mp3?filename=tuesday-glitch-122753.mp3',
          source: 'stream',
          addedAt: new Date().toISOString(),
          upvotes: 4
        }
      ]
    };

    onAddCollaborativePlaylist(newCollabPlaylist);
    collabManager.broadcast(newCollabPlaylist.id, 'user_joined', { user: currentUser });
    confetti({ particleCount: 70, spread: 70 });
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden text-neutral-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/60">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Ortak Odaya Katıl</h2>
                <p className="text-xs text-neutral-400">Arkadaşınızın paylaştığı 6 haneli kodu girin</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleJoin} className="p-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-2 text-center">
                6 Haneli Oda Kodu
              </label>
              <input
                type="text"
                maxLength={8}
                placeholder="Örn: 782941"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/[^0-9a-zA-Z]/g, '').toUpperCase())}
                className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-center font-mono text-2xl font-black text-emerald-400 tracking-widest placeholder-neutral-700 focus:outline-none focus:border-emerald-500 shadow-inner"
                autoFocus
              />
              {errorMsg && <p className="text-xs text-rose-400 mt-2 text-center">{errorMsg}</p>}
            </div>

            <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800 text-center">
              <span className="text-[11px] text-neutral-400 block mb-1">Mevcut Örnek Ortak Odalar:</span>
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setPinCode('782941')}
                  className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 rounded-lg text-xs font-mono text-emerald-400 border border-neutral-800"
                >
                  #782941 (Türkçe Pop)
                </button>
                <button
                  type="button"
                  onClick={() => setPinCode('319582')}
                  className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 rounded-lg text-xs font-mono text-emerald-400 border border-neutral-800"
                >
                  #319582 (Gym Club)
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={!pinCode.trim()}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-xs font-bold rounded-full transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
              >
                <Users className="w-4 h-4" /> Odaya Katıl & Senkronize Ol
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
