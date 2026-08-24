import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Smartphone, Laptop, CheckCircle2, X, Sparkles, WifiOff, ShieldCheck, ArrowRight, Apple, Play } from 'lucide-react';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasNativePrompt: boolean;
  onNativeInstall: () => Promise<boolean>;
  isInstalled: boolean;
}

export const InstallModal: React.FC<InstallModalProps> = ({
  isOpen,
  onClose,
  hasNativePrompt,
  onNativeInstall,
  isInstalled,
}) => {
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>('android');
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      const success = await onNativeInstall();
      if (success) {
        setInstallSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-[#12161c] border border-neutral-800/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-neutral-800/70 bg-gradient-to-br from-emerald-950/40 via-transparent to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20">
                  <div className="w-full h-full bg-[#0d1117] rounded-[10px] flex items-center justify-center">
                    <Download className="w-6 h-6 text-emerald-400" />
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    SoundPulse'ı İndir
                    <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-semibold rounded-full border border-emerald-500/30">
                      Uygulama Modu
                    </span>
                  </h2>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Telefona, tablete veya bilgisayara uygulama olarak kurun
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Install Action Button */}
            {hasNativePrompt && !isInstalled && (
              <div className="mt-5">
                <button
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2.5 transition-all transform active:scale-[0.98] disabled:opacity-75 cursor-pointer"
                >
                  <Download className="w-5 h-5 text-black" />
                  <span>{isInstalling ? 'Yükleniyor...' : 'Şimdi Uygulamayı Cihaza Yükle (1 Tık)'}</span>
                </button>
              </div>
            )}

            {isInstalled && (
              <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-emerald-300 text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>SoundPulse cihazınızda uygulama olarak zaten yüklü!</span>
              </div>
            )}
          </div>

          {/* Advantages Bar */}
          <div className="grid grid-cols-3 divide-x divide-neutral-800/80 bg-[#0d1015] border-b border-neutral-800/70 text-center py-2.5 px-2">
            <div className="flex flex-col items-center gap-1">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] font-medium text-neutral-300">Tam Ekran & Hızlı</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <WifiOff className="w-4 h-4 text-cyan-400" />
              <span className="text-[11px] font-medium text-neutral-300">İnternetsiz Dinleme</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span className="text-[11px] font-medium text-neutral-300">Kilit Ekranı Kontrolü</span>
            </div>
          </div>

          {/* Platform Tabs */}
          <div className="flex border-b border-neutral-800/70 px-4 pt-3 gap-2 bg-[#12161c]">
            <button
              onClick={() => setActiveTab('android')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all cursor-pointer ${
                activeTab === 'android'
                  ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              Android & Xiaomi
            </button>
            <button
              onClick={() => setActiveTab('ios')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all cursor-pointer ${
                activeTab === 'ios'
                  ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Apple className="w-4 h-4" />
              iPhone & iPad
            </button>
            <button
              onClick={() => setActiveTab('desktop')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all cursor-pointer ${
                activeTab === 'desktop'
                  ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Laptop className="w-4 h-4" />
              PC & Mac
            </button>
          </div>

          {/* Guide Content */}
          <div className="p-6 overflow-y-auto space-y-4 text-sm text-neutral-300 flex-1">
            {activeTab === 'android' && (
              <div className="space-y-3">
                <div className="text-xs text-neutral-400 font-medium">
                  Android ve Xiaomi telefonlarda SoundPulse'ı bağımsız bir uygulama (APK benzeri tam ekran) olarak ana ekrana ekleme:
                </div>

                <div className="flex items-start gap-3 p-3 bg-neutral-900/60 rounded-xl border border-neutral-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">
                    1
                  </div>
                  <div>
                    <div className="font-semibold text-white">Tarayıcı Menüsünü Açın</div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      Chrome veya Mi Browser sağ üst köşesindeki <strong>üç nokta (⋮)</strong> simgesine dokunun.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-neutral-900/60 rounded-xl border border-neutral-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">
                    2
                  </div>
                  <div>
                    <div className="font-semibold text-white">"Uygulamayı Yükle" veya "Ana Ekrana Ekle" Seçin</div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      Menüdeki <strong>"Uygulamayı Yükle"</strong> (veya <em>"Ana Ekrana Ekle"</em>) seçeneğine basın.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-neutral-900/60 rounded-xl border border-neutral-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">
                    3
                  </div>
                  <div>
                    <div className="font-semibold text-white">Tamamlandı! Doğrudan Uygulamadan Dinleyin</div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      Ana ekranınızda SoundPulse simgesi belirecektir. Tıkladığınızda tarayıcı çubukları olmadan tam ekran ve arka planda kilit ekranı kontrolleriyle çalışır.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ios' && (
              <div className="space-y-3">
                <div className="text-xs text-neutral-400 font-medium">
                  iPhone veya iPad'de Safari tarayıcısından tek adımda yükleme:
                </div>

                <div className="flex items-start gap-3 p-3 bg-neutral-900/60 rounded-xl border border-neutral-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">
                    1
                  </div>
                  <div>
                    <div className="font-semibold text-white">Paylaş Simgesine Dokunun</div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      Safari'nin altındaki <strong>Paylaş</strong> (kare içinden yukarı ok çıkan simge) butonuna dokunun.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-neutral-900/60 rounded-xl border border-neutral-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">
                    2
                  </div>
                  <div>
                    <div className="font-semibold text-white">"Ana Ekrana Ekle" Butonuna Basın</div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      Açılan menüde aşağı kaydırarak <strong>"Ana Ekrana Ekle"</strong> seçeneğini seçin ve sağ üstteki <strong>"Ekle"</strong>ye basın.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-neutral-900/60 rounded-xl border border-neutral-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">
                    3
                  </div>
                  <div>
                    <div className="font-semibold text-white">Yerel Uygulama Olarak Kullanın</div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      Ana ekranınızdaki simgeden açtığınızda Apple Music / Spotify gibi bağımsız tam ekran çalışır.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'desktop' && (
              <div className="space-y-3">
                <div className="text-xs text-neutral-400 font-medium">
                  Windows, Mac veya Linux bilgisayarınızda masaüstü uygulaması olarak çalıştırma:
                </div>

                <div className="flex items-start gap-3 p-3 bg-neutral-900/60 rounded-xl border border-neutral-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">
                    1
                  </div>
                  <div>
                    <div className="font-semibold text-white">Adres Çubuğundaki İndir İkonuna Tıklayın</div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      Chrome, Edge veya Brave tarayıcınızın URL/adres çubuğunun en sağındaki <strong>"SoundPulse Uygulamasını Yükle"</strong> (monitör/aşağı ok) simgesine tıklayın.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-neutral-900/60 rounded-xl border border-neutral-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">
                    2
                  </div>
                  <div>
                    <div className="font-semibold text-white">"Yükle" Onayına Basın</div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      Uygulama masaüstünüze ve Başlat menünüze otomatik olarak eklenecektir.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-[#0d1015] border-t border-neutral-800/70 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Ücretsiz, Reklamsız ve Hafif (PWA)
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Kapat
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
