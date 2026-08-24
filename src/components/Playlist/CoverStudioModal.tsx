import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Image as ImageIcon, Palette, Check, RefreshCw, Upload, Music, Flame, Heart, Disc, Radio, Zap, Headphones, Compass } from 'lucide-react';
import { Playlist } from '../../types';

interface CoverStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: Playlist;
  onSaveCover: (coverUrl: string, coverConfig?: Playlist['coverConfig']) => void;
}

const GRADIENT_PRESETS = [
  { start: '#10b981', end: '#064e3b', label: 'Spotify Emerald' },
  { start: '#8b5cf6', end: '#3b0764', label: 'Cyber Violet' },
  { start: '#f43f5e', end: '#881337', label: 'Ruby Sunset' },
  { start: '#f59e0b', end: '#78350f', label: 'Golden Amber' },
  { start: '#06b6d4', end: '#083344', label: 'Deep Ocean' },
  { start: '#ec4899', end: '#4c0519', label: 'Neon Pink' },
  { start: '#3b82f6', end: '#1e1b4b', label: 'Midnight Blue' },
  { start: '#84cc16', end: '#14532d', label: 'Lime Acid' },
];

const ICONS = [
  { id: 'music', icon: Music, label: 'Müzik' },
  { id: 'headphones', icon: Headphones, label: 'Kulaklık' },
  { id: 'disc', icon: Disc, label: 'Plak' },
  { id: 'flame', icon: Flame, label: 'Alev' },
  { id: 'heart', icon: Heart, label: 'Kalp' },
  { id: 'zap', icon: Zap, label: 'Yıldırım' },
  { id: 'radio', icon: Radio, label: 'Radyo' },
  { id: 'compass', icon: Compass, label: 'Pusula' },
];

const CURATED_IMAGES = [
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80',
];

export const CoverStudioModal: React.FC<CoverStudioModalProps> = ({
  isOpen,
  onClose,
  playlist,
  onSaveCover
}) => {
  const [activeTab, setActiveTab] = useState<'gradient' | 'photos' | 'url'>('gradient');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENT_PRESETS[0]);
  const [gradientAngle, setGradientAngle] = useState(135);
  const [selectedIcon, setSelectedIcon] = useState('music');
  const [overlayText, setOverlayText] = useState(playlist.name || 'Çalma Listem');
  const [textColor, setTextColor] = useState('#ffffff');
  const [selectedImage, setSelectedImage] = useState(playlist.coverUrl);
  const [customUrl, setCustomUrl] = useState('');

  if (!isOpen) return null;

  const handleRandomizeGradient = () => {
    const randomG = GRADIENT_PRESETS[Math.floor(Math.random() * GRADIENT_PRESETS.length)];
    setSelectedGradient(randomG);
    setGradientAngle(Math.floor(Math.random() * 360));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setSelectedImage(event.target.result as string);
          setActiveTab('photos');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (activeTab === 'gradient') {
      // Create SVG Data URL representation of gradient + icon + title
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="${selectedGradient.start}" />
              <stop offset="100%" stop-color="${selectedGradient.end}" />
            </linearGradient>
          </defs>
          <rect width="600" height="600" fill="url(#grad)" />
          <circle cx="300" cy="300" r="180" fill="rgba(255,255,255,0.06)" />
          <circle cx="300" cy="300" r="110" fill="rgba(0,0,0,0.15)" />
          <text x="50%" y="68%" text-anchor="middle" fill="${textColor}" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="34" letter-spacing="1">
            ${overlayText.substring(0, 24)}
          </text>
        </svg>
      `;
      const encodedSvg = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
      onSaveCover(encodedSvg, {
        type: 'gradient',
        gradientStart: selectedGradient.start,
        gradientEnd: selectedGradient.end,
        gradientAngle,
        icon: selectedIcon,
        text: overlayText,
        textColor
      });
    } else if (activeTab === 'photos') {
      onSaveCover(selectedImage, { type: 'image' });
    } else {
      if (customUrl.trim()) {
        onSaveCover(customUrl.trim(), { type: 'image' });
      }
    }
    onClose();
  };

  const SelectedIconComp = ICONS.find(i => i.id === selectedIcon)?.icon || Music;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden text-neutral-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/60">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Kapak Fotoğrafı Stüdyosu</h2>
                <p className="text-xs text-neutral-400">Çalma listenize özel yüksek çözünürlüklü kapak tasarlayın</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Live Preview */}
            <div className="flex flex-col items-center justify-center">
              <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
                Canlı Önizleme
              </div>
              <div
                className="relative w-56 h-56 rounded-xl overflow-hidden shadow-2xl flex flex-col items-center justify-center p-4 border border-white/10 group select-none"
                style={{
                  background: activeTab === 'gradient'
                    ? `linear-gradient(${gradientAngle}deg, ${selectedGradient.start}, ${selectedGradient.end})`
                    : `url(${selectedImage}) center/cover no-repeat`
                }}
              >
                {activeTab === 'gradient' && (
                  <>
                    <div className="absolute inset-0 bg-radial from-white/10 to-transparent pointer-events-none" />
                    <div className="w-16 h-16 rounded-full bg-black/20 backdrop-blur-xs flex items-center justify-center mb-3 shadow-inner">
                      <SelectedIconComp className="w-8 h-8 text-white drop-shadow-md" />
                    </div>
                    <div
                      className="text-center font-extrabold text-sm px-2 drop-shadow-md line-clamp-2"
                      style={{ color: textColor }}
                    >
                      {overlayText || 'Çalma Listem'}
                    </div>
                    <div className="text-[10px] text-white/70 uppercase tracking-widest mt-1">
                      SOUNDPULSE
                    </div>
                  </>
                )}
                {activeTab !== 'gradient' && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-3">
                    <span className="text-xs font-bold text-white drop-shadow">{playlist.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-4">
              {/* Tabs */}
              <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800">
                <button
                  onClick={() => setActiveTab('gradient')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${
                    activeTab === 'gradient' ? 'bg-emerald-500 text-black font-bold' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Gradient & İkon
                </button>
                <button
                  onClick={() => setActiveTab('photos')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${
                    activeTab === 'photos' ? 'bg-emerald-500 text-black font-bold' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Hazır Fotoğraflar
                </button>
                <button
                  onClick={() => setActiveTab('url')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${
                    activeTab === 'url' ? 'bg-emerald-500 text-black font-bold' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  URL / Yükle
                </button>
              </div>

              {/* Gradient Tab Content */}
              {activeTab === 'gradient' && (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs text-neutral-300">Renk Paleti</span>
                      <button
                        onClick={handleRandomizeGradient}
                        className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Rastgele
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {GRADIENT_PRESETS.map((g, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedGradient(g)}
                          className={`h-8 rounded-lg border transition relative overflow-hidden ${
                            selectedGradient.start === g.start ? 'border-white scale-105 shadow-md' : 'border-transparent opacity-80 hover:opacity-100'
                          }`}
                          style={{ background: `linear-gradient(135deg, ${g.start}, ${g.end})` }}
                          title={g.label}
                        >
                          {selectedGradient.start === g.start && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <Check className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-neutral-300 block mb-1.5">İkon Seçimi</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {ICONS.map((item) => {
                        const Icon = item.icon;
                        const isSel = selectedIcon === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setSelectedIcon(item.id)}
                            className={`p-2 rounded-lg flex items-center justify-center border text-xs gap-1 transition ${
                              isSel
                                ? 'bg-neutral-800 border-emerald-500 text-emerald-400'
                                : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-white'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-neutral-300 block mb-1">Kapak Başlığı</label>
                    <input
                      type="text"
                      value={overlayText}
                      onChange={(e) => setOverlayText(e.target.value)}
                      maxLength={30}
                      className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* Curated Photos Tab */}
              {activeTab === 'photos' && (
                <div className="space-y-3">
                  <div className="text-xs text-neutral-400">Estetik Albüm Kapakları:</div>
                  <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                    {CURATED_IMAGES.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImage(img)}
                        className={`aspect-square rounded-lg overflow-hidden border transition relative group ${
                          selectedImage === img ? 'border-emerald-500 scale-105 ring-2 ring-emerald-500/50' : 'border-neutral-800 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="preset" className="w-full h-full object-cover" />
                        {selectedImage === img && (
                          <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white drop-shadow" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* URL & Upload Tab */}
              {activeTab === 'url' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-neutral-300 block mb-1">Görsel URL'si</label>
                    <input
                      type="url"
                      placeholder="https://... / .jpg / .png"
                      value={customUrl}
                      onChange={(e) => {
                        setCustomUrl(e.target.value);
                        setSelectedImage(e.target.value);
                      }}
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="pt-2 border-t border-neutral-800">
                    <label className="text-xs text-neutral-300 block mb-2">Veya Cihazından Fotoğraf Yükle</label>
                    <label className="flex flex-col items-center justify-center p-4 border border-dashed border-neutral-700 hover:border-emerald-500/80 rounded-xl cursor-pointer bg-neutral-950/40 transition group">
                      <Upload className="w-6 h-6 text-neutral-400 group-hover:text-emerald-400 mb-1" />
                      <span className="text-xs text-neutral-300">Dosya Seç (JPG, PNG, WebP)</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-neutral-950 border-t border-neutral-800">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white transition"
            >
              İptal
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-full transition shadow-lg shadow-emerald-500/20"
            >
              Kapağı Uygula & Kaydet
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
