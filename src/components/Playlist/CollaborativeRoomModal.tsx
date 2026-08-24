import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Users, Copy, Check, Share2, Sparkles, UserPlus, Radio, Shield, Heart } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Playlist, Collaborator } from '../../types';
import { getCurrentUser, collabManager } from '../../services/collaboration';

interface CollaborativeRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: Playlist;
  onUpdatePlaylist: (updated: Playlist) => void;
}

export const CollaborativeRoomModal: React.FC<CollaborativeRoomModalProps> = ({
  isOpen,
  onClose,
  playlist,
  onUpdatePlaylist
}) => {
  const [copied, setCopied] = useState(false);
  const [simulatedFriendName, setSimulatedFriendName] = useState('');
  const currentUser = getCurrentUser();

  if (!isOpen) return null;

  const roomCode = playlist.roomCode || `${Math.floor(100000 + Math.random() * 900000)}`;
  const shareUrl = `${window.location.origin}?room=${roomCode}&playlist=${playlist.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleToggleCollaborative = () => {
    const updated: Playlist = {
      ...playlist,
      isCollaborative: !playlist.isCollaborative,
      roomCode: playlist.roomCode || roomCode,
      collaborators: playlist.collaborators || [
        {
          id: currentUser.id,
          name: `${currentUser.name} (Kurucu)`,
          avatar: currentUser.avatar,
          role: 'owner',
          isOnline: true,
          lastActive: 'Şimdi'
        }
      ]
    };
    onUpdatePlaylist(updated);
    collabManager.broadcast(playlist.id, 'user_joined', { user: currentUser });
  };

  const handleSimulateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulatedFriendName.trim()) return;

    const newCollaborator: Collaborator = {
      id: `u_${Date.now()}`,
      name: simulatedFriendName.trim(),
      avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 9999999)}?w=150&auto=format&fit=crop&q=80`,
      role: 'editor',
      isOnline: true,
      lastActive: 'Yeni katıldı'
    };

    const currentList = playlist.collaborators || [];
    const updated: Playlist = {
      ...playlist,
      collaborators: [...currentList, newCollaborator]
    };

    onUpdatePlaylist(updated);
    setSimulatedFriendName('');
    confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
    collabManager.broadcast(playlist.id, 'user_joined', { user: newCollaborator });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden text-neutral-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/60">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Ortak Çalışma & Paylaşım</h2>
                <p className="text-xs text-neutral-400">Arkadaşlarınızla aynı anda şarkı ekleyin ve sıralayın</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Status Card */}
            <div className="flex items-center justify-between p-4 bg-neutral-950 rounded-xl border border-neutral-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">Ortak Liste Modu</span>
                  {playlist.isCollaborative && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> CANLI
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {playlist.isCollaborative
                    ? 'Bağlantıya veya oda koduna sahip olan herkes şarkı ekleyip oylayabilir.'
                    : 'Bu liste şu an sadece sana özel gizli modda.'}
                </p>
              </div>
              <button
                onClick={handleToggleCollaborative}
                className={`px-4 py-2 rounded-full text-xs font-bold transition shadow-md ${
                  playlist.isCollaborative
                    ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-500/20'
                }`}
              >
                {playlist.isCollaborative ? 'Ortak Modu Kapat' : 'Ortak Modu Aç'}
              </button>
            </div>

            {playlist.isCollaborative && (
              <>
                {/* Room Code & QR */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center p-4 bg-neutral-950/60 rounded-xl border border-neutral-800">
                  <div className="flex flex-col items-center justify-center p-3 bg-white rounded-lg">
                    <QRCodeSVG
                      value={shareUrl}
                      size={130}
                      bgColor="#ffffff"
                      fgColor="#000000"
                      level="Q"
                    />
                    <span className="text-[10px] text-neutral-600 font-semibold mt-2">Kamerayla Tara ve Katıl</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-neutral-400 block mb-1">6 Haneli Oda Kodu</span>
                      <div className="flex items-center gap-2">
                        <div className="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-lg font-mono font-black text-emerald-400 tracking-widest flex-1 text-center">
                          {roomCode}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleCopyLink}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-white rounded-xl text-xs font-bold border border-neutral-700 transition"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" /> Bağlantı Kopyalandı!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-neutral-400" /> Davet Bağlantısını Kopyala
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Active Collaborators */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-400" /> Odadaki Katılımcılar ({playlist.collaborators?.length || 1})
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {(playlist.collaborators || []).map((collab) => (
                      <div
                        key={collab.id}
                        className="flex items-center justify-between p-2.5 bg-neutral-950/80 border border-neutral-800 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src={collab.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                              alt={collab.name}
                              className="w-9 h-9 rounded-full object-cover border border-neutral-700"
                            />
                            {collab.isOnline && (
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-neutral-900 ring-1 ring-emerald-500/50" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-xs text-white flex items-center gap-1.5">
                              {collab.name}
                              {collab.role === 'owner' && (
                                <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                                  Kurucu
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-neutral-400">{collab.lastActive}</div>
                          </div>
                        </div>

                        <span className="text-[11px] text-emerald-400 font-medium px-2 py-0.5 rounded-md bg-emerald-500/10">
                          {collab.role === 'owner' ? 'Tam Yetki' : 'Düzenleyici'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Add simulated friend */}
                  <form onSubmit={handleSimulateInvite} className="mt-3 flex gap-2">
                    <input
                      type="text"
                      placeholder="Arkadaşının Adı (ör. Selin, Deniz)..."
                      value={simulatedFriendName}
                      onChange={(e) => setSimulatedFriendName(e.target.value)}
                      className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white rounded-xl flex items-center gap-1.5 transition"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-emerald-400" /> Ekle
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end px-6 py-4 bg-neutral-950 border-t border-neutral-800">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-full transition shadow-lg shadow-emerald-500/20"
            >
              Kapat
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
