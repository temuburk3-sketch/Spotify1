import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sliders, Volume2, Zap, Clock, Disc, Sparkles, RotateCcw } from 'lucide-react';
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

const EQ_PRESETS: Record<string, { label: string; bands: AudioSettings['eqBands']; bassBoost: boolean }> = {
  flat: {
    label: 'Düz (Standart)',
    bands: { bass: 0, midLow: 0, mid: 0, midHigh: 0, treble: 0 },
    bassBoost: false
  },
  bassBoost: {
    label: 'Derin Bas (Bass Boost)',
    bands: { bass: 8, midLow: 5, mid: 0, midHigh: -2, treble: -3 },
    bassBoost: true
  },
  vocal: {
    label: 'Vokal / Net Ses',
    bands: { bass: -2, midLow: 2, mid: 6, midHigh: 5, treble: 2 },
    bassBoost: false
  },
  electronic: {
    label: 'Elektronik / Dans',
    bands: { bass: 7, midLow: 4, mid: -2, midHigh: 3, treble: 6 },
    bassBoost: true
  },
  acoustic: {
    label: 'Akustik & Klasik',
    bands: { bass: 4, midLow: 2, mid: 3, midHigh: 4, treble: 5 },
    bassBoost: false
  },
  rock: {
    label: 'Rock & Canlı Konser',
    bands: { bass: 6, midLow: 3, mid: -1, midHigh: 4, treble: 7 },
    bassBoost: false
  }
};

export const EqualizerModal: React.FC<EqualizerModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  sleepTimerMinutes,
  onSetSleepTimer
}) => {
  if (!isOpen) return null;

  const handlePresetSelect = (presetKey: string) => {
    const preset = EQ_PRESETS[presetKey];
    if (!preset) return;
    const updated = {
      ...settings,
      eqPreset: presetKey,
      eqBands: { ...preset.bands },
      bassBoost: preset.bassBoost
    };
    onUpdateSettings(updated);
    audioEngine.setEqualizer(updated.eqBands, updated.bassBoost);
  };

  const handleBandChange = (band: keyof AudioSettings['eqBands'], value: number) => {
    const updatedBands = { ...settings.eqBands, [band]: value };
    const updated = {
      ...settings,
      eqPreset: 'custom',
      eqBands: updatedBands
    };
    onUpdateSettings(updated);
    audioEngine.setEqualizer(updatedBands, settings.bassBoost);
  };

  const handleBassBoostToggle = () => {
    const updated = { ...settings, bassBoost: !settings.bassBoost };
    onUpdateSettings(updated);
    audioEngine.setEqualizer(updated.eqBands, updated.bassBoost);
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden text-neutral-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/60">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Ekolayzer & Ses Stüdyosu</h2>
                <p className="text-xs text-neutral-400">Özel frekans ayarları, bas güçlendirme ve uyku zamanlayıcı</p>
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
            {/* Presets */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-neutral-300">Ön Tanımlı Modlar</span>
                <button
                  onClick={handleReset}
                  className="text-xs text-neutral-400 hover:text-white flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Sıfırla
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(EQ_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => handlePresetSelect(key)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition truncate text-left ${
                      settings.eqPreset === key
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 5-Band Sliders */}
            <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800">
              <span className="text-xs font-semibold text-neutral-300 block mb-4">5 Bant Frekans Grafiği</span>
              <div className="grid grid-cols-5 gap-2 items-end h-40 pb-2">
                {[
                  { key: 'bass', label: '60Hz', name: 'Derin Bas' },
                  { key: 'midLow', label: '250Hz', name: 'Bas' },
                  { key: 'mid', label: '1kHz', name: 'Vokal' },
                  { key: 'midHigh', label: '4kHz', name: 'Tiz' },
                  { key: 'treble', label: '12kHz', name: 'Hava' },
                ].map((band) => {
                  const val = settings.eqBands[band.key as keyof AudioSettings['eqBands']];
                  return (
                    <div key={band.key} className="flex flex-col items-center gap-2 h-full justify-between">
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">
                        {val > 0 ? `+${val}` : val}dB
                      </span>
                      <div className="relative flex-1 flex items-center justify-center">
                        <input
                          type="range"
                          min="-12"
                          max="12"
                          step="1"
                          value={val}
                          onChange={(e) =>
                            handleBandChange(band.key as keyof AudioSettings['eqBands'], parseFloat(e.target.value))
                          }
                          className="h-28 w-2 appearance-none bg-neutral-800 rounded-full outline-none accent-emerald-500 cursor-pointer [writing-mode:vertical-lr] [direction:rtl]"
                        />
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] font-mono text-neutral-300 font-bold">{band.label}</div>
                        <div className="text-[9px] text-neutral-400">{band.name}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bass boost & Playback speed */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Bass Boost Switch */}
              <div
                onClick={handleBassBoostToggle}
                className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                  settings.bassBoost
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${settings.bassBoost ? 'bg-emerald-500 text-black' : 'bg-neutral-800 text-neutral-400'}`}>
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Mega Bass Boost</div>
                    <div className="text-[10px] text-neutral-400">+8dB düşük frekans artışı</div>
                  </div>
                </div>
                <div className={`w-10 h-5 rounded-full transition flex items-center px-0.5 ${settings.bassBoost ? 'bg-emerald-500 justify-end' : 'bg-neutral-800 justify-start'}`}>
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </div>
              </div>

              {/* Playback speed */}
              <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-neutral-300">Çalma Hızı</span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">{settings.playbackRate}x</span>
                </div>
                <div className="flex gap-1">
                  {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => handlePlaybackRate(rate)}
                      className={`flex-1 py-1 rounded-lg text-xs font-semibold transition ${
                        settings.playbackRate === rate
                          ? 'bg-emerald-500 text-black font-bold'
                          : 'bg-neutral-900 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sleep Timer */}
            <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">Uyku Zamanlayıcı</span>
                </div>
                {sleepTimerMinutes !== null && (
                  <span className="text-xs text-amber-400 font-semibold font-mono">
                    {sleepTimerMinutes} dk sonra durdurulacak
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[
                  { label: 'Kapalı', value: null },
                  { label: '15 Dk', value: 15 },
                  { label: '30 Dk', value: 30 },
                  { label: '45 Dk', value: 45 },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSetSleepTimer(item.value)}
                    className={`py-2 rounded-xl border text-xs font-semibold transition ${
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

          {/* Footer */}
          <div className="flex items-center justify-end px-6 py-4 bg-neutral-950 border-t border-neutral-800">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-full transition shadow-lg shadow-emerald-500/20"
            >
              Tamam
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
