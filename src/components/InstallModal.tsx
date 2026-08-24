import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Smartphone, Laptop, CheckCircle2, X, Sparkles, WifiOff, ShieldCheck, ArrowRight, ExternalLink, Copy, Check, Terminal } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'pwabuilder' | 'native' | 'capacitor'>('pwabuilder');
  const [isInstalling, setIsInstalling] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedManifest, setCopiedManifest] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-hqrrsc4fitxjiedxdlnnos-772848354490.europe-west2.run.app';
  const manifestUrl = `${currentUrl}/manifest.json`;

  const copyToClipboard = (text: string, type: 'url' | 'manifest') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedManifest(true);
      setTimeout(() => setCopiedManifest(false), 2000);
    }
  };

  const handleNativeInstall = async () => {
    setIsInstalling(true);
    try {
      await onNativeInstall();
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
          className="relative w-full max-w-xl bg-[#12161c] border border-neutral-800/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 md:p-6 border-b border-neutral-800/70 bg-gradient-to-br from-emerald-950/40 via-transparent to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 shrink-0">
                  <div className="w-full h-full bg-[#0d1117] rounded-[10px] flex items-center justify-center">
                    <Download className="w-6 h-6 text-emerald-400" />
                  </div>
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                    Android APK & Uygulama Paketi
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-bold rounded-full border border-emerald-500/30 uppercase">
                      PWA & APK
                    </span>
                  </h2>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    PWABuilder ile Google Play veya doğrudan .apk olarak indirin
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Tabs */}
          <div className="flex border-b border-neutral-800/70 px-4 pt-3 gap-2 bg-[#0d1015]">
            <button
              onClick={() => setActiveTab('pwabuilder')}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-all cursor-pointer ${
                activeTab === 'pwabuilder'
                  ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              PWABuilder ile APK (Önerilen)
            </button>
            <button
              onClick={() => setActiveTab('native')}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-all cursor-pointer ${
                activeTab === 'native'
                  ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Cihaza Doğrudan Yükle (1 Tık)
            </button>
            <button
              onClick={() => setActiveTab('capacitor')}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-all cursor-pointer ${
                activeTab === 'capacitor'
                  ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Terminal className="w-4 h-4" />
              Android Studio / Capacitor
            </button>
          </div>

          {/* Content Body */}
          <div className="p-6 overflow-y-auto space-y-4 text-sm text-neutral-300 flex-1">
            {activeTab === 'pwabuilder' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs leading-relaxed">
                  ✅ <strong>manifest.json</strong> ve <strong>Service Worker</strong> PWABuilder standartlarına (100% uyumlu) tam olarak yapılandırıldı.
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-neutral-900/70 rounded-xl border border-neutral-800">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">
                      1
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white">Uygulama Linkinizi Kopyalayın</div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <input
                          type="text"
                          readOnly
                          value={currentUrl}
                          className="flex-1 bg-black/40 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-300 select-all font-mono truncate"
                        />
                        <button
                          onClick={() => copyToClipboard(currentUrl, 'url')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs rounded-lg transition flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedLink ? 'Kopyalandı' : 'Kopyala'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-neutral-900/70 rounded-xl border border-neutral-800">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">
                      2
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-white">PWABuilder Sitesini Açın</div>
                      <p className="text-xs text-neutral-400 mt-1">
                        Microsoft tarafından sağlanan ücretsiz PWABuilder aracına gidin ve kopyaladığınız linki yapıştırıp <strong>"Start"</strong>a basın:
                      </p>
                      <a
                        href="https://www.pwabuilder.com"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 mt-2 px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-emerald-400 font-bold text-xs rounded-lg border border-neutral-700 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>PWABuilder.com'a Git</span>
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-neutral-900/70 rounded-xl border border-neutral-800">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">
                      3
                    </div>
                    <div>
                      <div className="font-semibold text-white">"Package for Stores" & Android APK İndirin</div>
                      <p className="text-xs text-neutral-400 mt-1">
                        Sağ üstteki <strong>"Package For Stores"</strong> butonuna basıp <strong>Android</strong> seçeneğini seçin. Doğrudan imzalı <strong>.apk</strong> dosyasını ve Google Play Store <strong>.aab</strong> paketini ücretsiz olarak indirin.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Direct Manifest Link */}
                <div className="p-3 bg-black/40 rounded-xl border border-neutral-800/80 flex items-center justify-between text-xs">
                  <div className="text-neutral-400 truncate pr-2">
                    <span className="text-neutral-500">Doğrudan Manifest Linki: </span>
                    <span className="font-mono text-emerald-400">{manifestUrl}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(manifestUrl, 'manifest')}
                    className="p-1.5 text-neutral-400 hover:text-white rounded-md hover:bg-neutral-800 transition shrink-0 cursor-pointer"
                    title="Manifest linkini kopyala"
                  >
                    {copiedManifest ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'native' && (
              <div className="space-y-4">
                <p className="text-xs text-neutral-300">
                  Cihazınızın tarayıcısı PWA destekliyorsa doğrudan tek tıkla yükleyebilirsiniz:
                </p>

                {hasNativePrompt && !isInstalled ? (
                  <button
                    onClick={handleNativeInstall}
                    disabled={isInstalling}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2.5 transition active:scale-[0.98] cursor-pointer"
                  >
                    <Download className="w-5 h-5 text-black" />
                    <span>{isInstalling ? 'Yükleniyor...' : 'Şimdi Telefona Yükle (1 Tık)'}</span>
                  </button>
                ) : (
                  <div className="p-4 bg-neutral-900/80 border border-neutral-800 rounded-xl space-y-2 text-xs">
                    <div className="font-semibold text-white flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                      Xiaomi & Android Tarayıcıdan Yükleme:
                    </div>
                    <p className="text-neutral-400 leading-relaxed">
                      Chrome veya Xiaomi Mi Browser'da sağ üstteki <strong>üç nokta (⋮)</strong> menüsünü açıp <strong>"Uygulamayı Yükle"</strong> (veya <em>"Ana Ekrana Ekle"</em>) seçeneğine basarak anında APK gibi bağımsız tam ekran kullanabilirsiniz.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'capacitor' && (
              <div className="space-y-3 text-xs">
                <p className="text-neutral-300">
                  Android Studio ile kaynak koddan kendi APK'nızı üretmek isterseniz:
                </p>

                <div className="p-3 bg-black/60 rounded-xl border border-neutral-800 font-mono text-emerald-400 space-y-1.5 select-all">
                  <p className="text-neutral-500"># Projeyi indirdikten sonra terminalde:</p>
                  <p>npm install @capacitor/core @capacitor/cli @capacitor/android</p>
                  <p>npx cap init SoundPulse com.soundpulse.music</p>
                  <p>npm run build</p>
                  <p>npx cap add android</p>
                  <p>npx cap open android</p>
                </div>
                <p className="text-neutral-400">
                  Android Studio açıldığında <strong>Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong> seçeneği ile doğrudan cihazınıza yükleyeceğiniz <strong>.apk</strong> dosyasını alabilirsiniz.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-[#0d1015] border-t border-neutral-800/70 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Manifest: <span className="text-emerald-300 font-mono">/manifest.json</span> (Hazır)
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
