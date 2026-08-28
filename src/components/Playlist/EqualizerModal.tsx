import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sliders,
  Zap,
  Clock,
  Sparkles,
  RotateCcw,
  Headphones,
  Mic2,
  Volume2,
  Radio,
  SlidersHorizontal,
  Gauge,
  Music2,
  Layers,
  Sparkle
} from 'lucide-react';
import { AudioSettings } from '../../types';
import { audioEngine } from '../../services/audioEngine';

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AudioSettings;
  onUpdateSettings: (newSettings: AudioSettings) => void;
  sleepTimerMinutes: number | null;
  onSetSleepTimer: (mins: number | null) => void;
}

const EQ_10_PRESETS: Record<
  string,
  {
    label: string;
    description: string;
    bands: AudioSettings['eq10Bands'];
    bassBoost: boolean;
    subBassBoost?: boolean;
    playbackRate?: number;
    spatial?: boolean;
    vocalCut?: boolean;
  }
> = {
  flat: {
    label: 'Düz (Standart)',
    description: 'Doğal stüdyo referans dengesi',
    bands: { b32: 0, b64: 0, b125: 0, b250: 0, b500: 0, b1k: 0, b2k: 0, b4k: 0, b8k: 0, b16k: 0 },
    bassBoost: false
  },
  bassBoost: {
    label: 'Mega Bass Boost',
    description: 'Sub-bass & 60Hz güçlü vurucu bas',
    bands: { b32: 9, b64: 8, b125: 6, b250: 3, b500: 0, b1k: -1, b2k: -2, b4k: -1, b8k: 2, b16k: 4 },
    bassBoost: true,
    subBassBoost: true
  },
  vocal: {
    label: 'Vokal & Netlik',
    description: 'Öne çıkan vokaller ve berrak sözler',
    bands: { b32: -3, b64: -2, b125: 1, b250: 3, b500: 6, b1k: 7, b2k: 6, b4k: 4, b8k: 3, b16k: 1 },
    bassBoost: false
  },
  electronic: {
    label: 'Kulüp & Elektronik',
    description: 'Derin vuruşlar ve parlak tizler',
    bands: { b32: 8, b64: 7, b125: 5, b250: 2, b500: -2, b1k: -1, b2k: 3, b4k: 6, b8k: 7, b16k: 8 },
    bassBoost: true
  },
  rock: {
    label: 'Rock & Konser',
    description: 'Elektro gitar, davul ve canlı sahne',
    bands: { b32: 6, b64: 5, b125: 4, b250: 1, b500: -2, b1k: 1, b2k: 4, b4k: 6, b8k: 7, b16k: 6 },
    bassBoost: false
  },
  pop: {
    label: 'Modern Pop',
    description: 'Radyo standardı dinamik ve dengeli',
    bands: { b32: 4, b64: 5, b125: 3, b250: 0, b500: 2, b1k: 4, b2k: 4, b4k: 5, b8k: 6, b16k: 5 },
    bassBoost: false
  },
  acoustic: {
    label: 'Akustik & Klasik',
    description: 'Yaylılar, piyano ve sıcak enstrümanlar',
    bands: { b32: 3, b64: 4, b125: 2, b250: 3, b500: 4, b1k: 4, b2k: 5, b4k: 4, b8k: 5, b16k: 6 },
    bassBoost: false
  },
  nightcore: {
    label: '⚡ Nightcore Modu',
    description: '1.25x tempo artışı ve parlak tizler',
    bands: { b32: 2, b64: 3, b125: 1, b250: 0, b500: 2, b1k: 4, b2k: 6, b4k: 7, b8k: 8, b16k: 9 },
    bassBoost: false,
    playbackRate: 1.25
  },
  slowed: {
    label: '🌙 Slowed + Reverb',
    description: '0.85x yavaşlatılmış lo-fi atmosfer',
    bands: { b32: 7, b64: 6, b125: 4, b250: 2, b500: 1, b1k: -2, b2k: -3, b4k: 2, b8k: 3, b16k: 4 },
    bassBoost: true,
    playbackRate: 0.85
  }
};

const BAND_FREQS: { key: keyof AudioSettings['eq10Bands']; label: string; name: string }[] = [
  { key: 'b32', label: '32Hz', name: 'Sub' },
  { key: 'b64', label: '64Hz', name: 'Bas' },
  { key: 'b125', label: '125Hz', name: 'Vurucu' },
  { key: 'b250', label: '250Hz', name: 'Gövde' },
  { key: 'b500', label: '500Hz', name: 'Alt Orta' },
  { key: 'b1k', label: '1kHz', name: 'Vokal' },
  { key: 'b2k', label: '2kHz', name: 'Netlik' },
  { key: 'b4k', label: '4kHz', name: 'Parlak' },
  { key: 'b8k', label: '8kHz', name: 'Tiz' },
  { key: 'b16k', label: '16kHz', name: 'Hava' }
];

export const EqualizerModal: React.FC<EqualizerModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  sleepTimerMinutes,
  onSetSleepTimer
}) => {
  const [activeTab, setActiveTab] = useState<'eq' | 'fx' | 'timer'>('eq');

  if (!isOpen) return null;

  const currentEq10 = settings.eq10Bands || {
    b32: settings.eqBands?.bass || 0,
    b64: settings.eqBands?.bass || 0,
    b125: settings.eqBands?.midLow || 0,
    b250: settings.eqBands?.midLow || 0,
    b500: settings.eqBands?.mid || 0,
    b1k: settings.eqBands?.mid || 0,
    b2k: settings.eqBands?.midHigh || 0,
    b4k: settings.eqBands?.midHigh || 0,
    b8k: settings.eqBands?.treble || 0,
    b16k: settings.eqBands?.treble || 0
  };

  const handlePresetSelect = (presetKey: string) => {
    const preset = EQ_10_PRESETS[presetKey];
    if (!preset) return;

    const updated: AudioSettings = {
      ...settings,
      eqPreset: presetKey,
      eq10Bands: { ...preset.bands },
      eqBands: {
        bass: preset.bands.b64,
        midLow: preset.bands.b250,
        mid: preset.bands.b1k,
        midHigh: preset.bands.b4k,
        treble: preset.bands.b16k
      },
      bassBoost: preset.bassBoost,
      subBassBoost: !!preset.subBassBoost,
      playbackRate: preset.playbackRate || settings.playbackRate
    };

    onUpdateSettings(updated);
    audioEngine.set10BandEqualizer(updated.eq10Bands, updated.bassBoost, updated.subBassBoost);
    if (preset.playbackRate) {
      audioEngine.setPlaybackRate(preset.playbackRate);
    }
  };

  const handleBandChange = (bandKey: keyof AudioSettings['eq10Bands'], val: number) => {
    const newEq10 = { ...currentEq10, [bandKey]: val };
    const updated: AudioSettings = {
      ...settings,
      eqPreset: 'custom',
      eq10Bands: newEq10,
      eqBands: {
        bass: newEq10.b64,
        midLow: newEq10.b250,
        mid: newEq10.b1k,
        midHigh: newEq10.b4k,
        treble: newEq10.b16k
      }
    };
    onUpdateSettings(updated);
    audioEngine.set10BandEqualizer(newEq10, settings.bassBoost, settings.subBassBoost);
  };

  const handleToggleBassBoost = () => {
    const updated = { ...settings, bassBoost: !settings.bassBoost };
    onUpdateSettings(updated);
    audioEngine.set10BandEqualizer(currentEq10, updated.bassBoost, settings.subBassBoost);
  };

  const handleToggleSubBass = () => {
    const updated = { ...settings, subBassBoost: !settings.subBassBoost };
    onUpdateSettings(updated);
    audioEngine.set10BandEqualizer(currentEq10, settings.bassBoost, updated.subBassBoost);
  };

  const handleToggleSpatial = () => {
    const nextState = !settings.spatialAudio;
    const updated = { ...settings, spatialAudio: nextState };
    onUpdateSettings(updated);
    audioEngine.setSpatialAudio(nextState, settings.spatial8DSpeed || 0.5);
  };

  const handleSpatialSpeed = (speed: number) => {
    const updated = { ...settings, spatial8DSpeed: speed };
    onUpdateSettings(updated);
    audioEngine.setSpatialAudio(settings.spatialAudio, speed);
  };

  const handleToggleVocalRemover = () => {
    const nextState = !settings.vocalRemover;
    const updated = { ...settings, vocalRemover: nextState };
    onUpdateSettings(updated);
    audioEngine.setVocalRemover(nextState);
  };

  const handleToggleNormalization = () => {
    const nextState = !settings.volumeNormalization;
    const updated = { ...settings, volumeNormalization: nextState };
    onUpdateSettings(updated);
    audioEngine.setVolumeNormalization(nextState);
  };

  const handleToggleHDQuality = () => {
    const updated = { ...settings, highQualityAudio: !settings.highQualityAudio };
    onUpdateSettings(updated);
  };

  const handleCrossfadeChange = (secs: number) => {
    const updated = { ...settings, crossfade: secs };
    onUpdateSettings(updated);
    audioEngine.setCrossfade(secs);
  };

  const handlePlaybackRate = (rate: number) => {
    const updated = { ...settings, playbackRate: rate };
    onUpdateSettings(updated);
    audioEngine.setPlaybackRate(rate);
  };

  const handleReset = () => {
    handlePresetSelect('flat');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden text-neutral-100 flex flex-col max-h-[90dvh]"
        >
          {/* Top Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/70">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                  <span>Stüdyo Ekolayzer & Ses Motoru</span>
                  <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    10-BANT PRO
                  </span>
                </h2>
                <p className="text-xs text-neutral-400">8D uzamsal ses, vokal temizleme, ReplayGain ve uyku zamanlayıcı</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 px-6 pt-3 pb-1 border-b border-neutral-800 bg-neutral-950/40 text-xs font-bold">
            <button
              onClick={() => setActiveTab('eq')}
              className={`pb-2 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'eq'
                  ? 'border-emerald-500 text-emerald-400 font-extrabold'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> 10-Bant Ekolayzer
            </button>
            <button
              onClick={() => setActiveTab('fx')}
              className={`pb-2 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'fx'
                  ? 'border-emerald-500 text-emerald-400 font-extrabold'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" /> 8D Ses & Ses Efektleri
            </button>
            <button
              onClick={() => setActiveTab('timer')}
              className={`pb-2 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'timer'
                  ? 'border-emerald-500 text-emerald-400 font-extrabold'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Uyku & Çalma
            </button>
          </div>

          {/* Content Body */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {activeTab === 'eq' && (
              <>
                {/* Presets Grid */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Ön Tanımlı Ekolayzer Profilleri
                    </span>
                    <button
                      onClick={handleReset}
                      className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> Sıfırla
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(EQ_10_PRESETS).map(([key, preset]) => (
                      <button
                        key={key}
                        onClick={() => handlePresetSelect(key)}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                          settings.eqPreset === key
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow-lg shadow-emerald-500/10'
                            : 'bg-neutral-950 border-neutral-800/80 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                        }`}
                      >
                        <span className="text-xs font-bold text-white">{preset.label}</span>
                        <span className="text-[10px] text-neutral-400 line-clamp-1 mt-0.5 font-normal">
                          {preset.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 10-Band Sliders with Frequency Markers */}
                <div className="p-5 bg-neutral-950 rounded-2xl border border-neutral-800">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      10-Bant Parametrik Frekans Spektrumu
                    </span>
                    <span className="text-[11px] font-mono text-neutral-400">±12 dB Aralığı</span>
                  </div>

                  <div className="grid grid-cols-10 gap-1.5 items-end h-48 pb-2">
                    {BAND_FREQS.map((band) => {
                      const val = currentEq10[band.key] || 0;
                      return (
                        <div key={band.key} className="flex flex-col items-center gap-2 h-full justify-between">
                          <span
                            className={`text-[9px] font-mono font-bold ${
                              val > 0 ? 'text-emerald-400' : val < 0 ? 'text-cyan-400' : 'text-neutral-500'
                            }`}
                          >
                            {val > 0 ? `+${val}` : val}
                          </span>
                          <div className="relative flex-1 flex items-center justify-center">
                            <input
                              type="range"
                              min="-12"
                              max="12"
                              step="1"
                              value={val}
                              onChange={(e) => handleBandChange(band.key, parseFloat(e.target.value))}
                              className="h-32 w-1.5 appearance-none bg-neutral-800 rounded-full outline-none accent-emerald-400 cursor-pointer [writing-mode:vertical-lr] [direction:rtl]"
                            />
                          </div>
                          <div className="text-center">
                            <div className="text-[9px] font-mono text-neutral-300 font-bold truncate max-w-full">
                              {band.label}
                            </div>
                            <div className="text-[8px] text-neutral-500 truncate">{band.name}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'fx' && (
              <div className="space-y-4">
                {/* 8D Spatial Audio Card */}
                <div
                  className={`p-4 rounded-2xl border transition ${
                    settings.spatialAudio
                      ? 'bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-cyan-950/40 border-emerald-500/50'
                      : 'bg-neutral-950 border-neutral-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl ${
                          settings.spatialAudio ? 'bg-emerald-500 text-black' : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        <Headphones className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <span>3D & 8D Uzamsal Müzik Simülatörü</span>
                          {settings.spatialAudio && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full animate-pulse">
                              AKTİF
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-neutral-400">
                          Müziği kulaklıkta 360 derece etrafınızda döndüren binaural ses alanı
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleToggleSpatial}
                      className={`w-12 h-6 rounded-full transition flex items-center px-1 cursor-pointer ${
                        settings.spatialAudio ? 'bg-emerald-500 justify-end' : 'bg-neutral-800 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                    </button>
                  </div>

                  {settings.spatialAudio && (
                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-4">
                      <span className="text-xs text-neutral-300 font-semibold">Dönüş Hızı:</span>
                      <div className="flex-1 max-w-xs flex items-center gap-3">
                        <input
                          type="range"
                          min="0.1"
                          max="1.5"
                          step="0.1"
                          value={settings.spatial8DSpeed || 0.5}
                          onChange={(e) => handleSpatialSpeed(parseFloat(e.target.value))}
                          className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-neutral-700 rounded-lg"
                        />
                        <span className="text-xs font-mono text-emerald-400 font-bold min-w-[32px]">
                          {settings.spatial8DSpeed || 0.5}x
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Karaoke Vocal Remover */}
                <div
                  className={`p-4 rounded-2xl border transition ${
                    settings.vocalRemover
                      ? 'bg-purple-950/30 border-purple-500/50'
                      : 'bg-neutral-950 border-neutral-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl ${
                          settings.vocalRemover ? 'bg-purple-500 text-white' : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        <Mic2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <span>Karaoke Modu / Vokal Temizleme</span>
                          {settings.vocalRemover && (
                            <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded-full">
                              KARAOKE
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-neutral-400">
                          Orta kanal frekans filtresi ile ana vokal sesini kısıp altyapıyı öne çıkarır
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleToggleVocalRemover}
                      className={`w-12 h-6 rounded-full transition flex items-center px-1 cursor-pointer ${
                        settings.vocalRemover ? 'bg-purple-500 justify-end' : 'bg-neutral-800 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                    </button>
                  </div>
                </div>

                {/* Dynamic ReplayGain / Volume Normalization */}
                <div
                  className={`p-4 rounded-2xl border transition ${
                    settings.volumeNormalization
                      ? 'bg-cyan-950/30 border-cyan-500/50'
                      : 'bg-neutral-950 border-neutral-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl ${
                          settings.volumeNormalization ? 'bg-cyan-500 text-black' : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        <Volume2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">Ses Seviyesi Normalizasyonu (ReplayGain)</div>
                        <div className="text-xs text-neutral-400">
                          Şarkılar arasındaki ani ses patlamalarını ve kısıklıkları otomatik eşitler
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleToggleNormalization}
                      className={`w-12 h-6 rounded-full transition flex items-center px-1 cursor-pointer ${
                        settings.volumeNormalization ? 'bg-cyan-500 justify-end' : 'bg-neutral-800 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                    </button>
                  </div>
                </div>

                {/* Bass Boost & Sub-Bass Duo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div
                    onClick={handleToggleBassBoost}
                    className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      settings.bassBoost
                        ? 'bg-emerald-500/15 border-emerald-500 text-white'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-2 rounded-lg ${
                          settings.bassBoost ? 'bg-emerald-500 text-black' : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Mega Bas Güçlendirici</div>
                        <div className="text-[10px] text-neutral-400">+8dB 100Hz Low-Shelf</div>
                      </div>
                    </div>
                    <div
                      className={`w-10 h-5 rounded-full transition flex items-center px-0.5 ${
                        settings.bassBoost ? 'bg-emerald-500 justify-end' : 'bg-neutral-800 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                    </div>
                  </div>

                  <div
                    onClick={handleToggleSubBass}
                    className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      settings.subBassBoost
                        ? 'bg-amber-500/15 border-amber-500 text-white'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-2 rounded-lg ${
                          settings.subBassBoost ? 'bg-amber-500 text-black' : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        <Radio className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Sub-Bass Ultra Derin</div>
                        <div className="text-[10px] text-neutral-400">+9dB 45Hz Titreşim</div>
                      </div>
                    </div>
                    <div
                      className={`w-10 h-5 rounded-full transition flex items-center px-0.5 ${
                        settings.subBassBoost ? 'bg-amber-500 justify-end' : 'bg-neutral-800 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'timer' && (
              <div className="space-y-5">
                {/* Crossfade Slider */}
                <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Music2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">Şarkı Geçişlerinde Yumuşak Geçiş (Crossfade)</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {settings.crossfade > 0 ? `${settings.crossfade} saniye` : 'Kapalı'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="12"
                    step="1"
                    value={settings.crossfade || 0}
                    onChange={(e) => handleCrossfadeChange(parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg mt-2"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
                    <span>Kapalı</span>
                    <span>3 sn</span>
                    <span>6 sn</span>
                    <span>12 sn</span>
                  </div>
                </div>

                {/* Playback Speed */}
                <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">Çalma Hızı & Pitch</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 font-mono">{settings.playbackRate}x</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[0.75, 0.85, 1.0, 1.25, 1.5].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => handlePlaybackRate(rate)}
                        className={`py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          settings.playbackRate === rate
                            ? 'bg-emerald-500 text-black font-bold shadow-md shadow-emerald-500/20'
                            : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sleep Timer */}
                <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-white">Akıllı Uyku Zamanlayıcı (Kademeli Kısılmalı)</span>
                    </div>
                    {sleepTimerMinutes !== null && (
                      <span className="text-xs text-amber-400 font-bold font-mono">
                        {sleepTimerMinutes} dk sonra kapanacak
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400 mb-3">
                    Süre bitimine 10 saniye kala ses otomatik olarak yavaşça kısılır ve oynatıcı durur.
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Kapalı', value: null },
                      { label: '15 Dk', value: 15 },
                      { label: '30 Dk', value: 30 },
                      { label: '45 Dk', value: 45 },
                      { label: '60 Dk', value: 60 },
                      { label: '90 Dk', value: 90 }
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => onSetSleepTimer(item.value)}
                        className={`py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                          sleepTimerMinutes === item.value
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 bg-neutral-950 border-t border-neutral-800">
            <div className="text-xs text-neutral-400 font-medium">
              Web Audio DSP & Parametrik İşleme Aktif
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-full transition shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              Tamam
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
