import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, Unlock, KeyRound, Download, Upload, Trash2, CheckCircle2, HelpCircle, Laptop, Server, Globe, ExternalLink, X, ShieldAlert, Sparkles } from 'lucide-react';
import { Playlist } from '../../types';
import {
  getStoredPIN,
  setStoredPIN,
  setAppLockedState,
  exportPersonalDataJSON,
  parseImportDataJSON
} from '../../services/recommendationService';
import confetti from 'canvas-confetti';

interface PrivateModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: Playlist[];
  onImportPlaylists: (importedPlaylists: Playlist[]) => void;
  onShowToast: (msg: string) => void;
}

export const PrivateModeModal: React.FC<PrivateModeModalProps> = ({
  isOpen,
  onClose,
  playlists,
  onImportPlaylists,
  onShowToast
}) => {
  const [currentPin, setCurrentPin] = useState<string | null>(getStoredPIN());
  const [inputPin, setInputPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [activeTab, setActiveTab] = useState<'pin' | 'backup' | 'guide'>('pin');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSavePin = () => {
    setErrorMsg(null);
    if (inputPin.length < 4 || inputPin.length > 8) {
      setErrorMsg('PIN en az 4, en fazla 8 haneli olmalıdır.');
      return;
    }
    if (inputPin !== confirmPin) {
      setErrorMsg('PIN şifreleri birbiriyle eşleşmiyor.');
      return;
    }

    setStoredPIN(inputPin);
    setCurrentPin(inputPin);
    setInputPin('');
    setConfirmPin('');
    onShowToast('🔒 Kişisel PIN kilidiniz başarıyla kaydedildi.');
    confetti({ particleCount: 50, spread: 60 });
  };

  const handleRemovePin = () => {
    setStoredPIN(null);
    setCurrentPin(null);
    setInputPin('');
    setConfirmPin('');
    onShowToast('🔓 PIN kilidi kaldırıldı. Uygulama serbest modda.');
  };

  const handleLockNow = () => {
    setAppLockedState(true);
    onClose();
    window.location.reload();
  };

  const handleExportBackup = () => {
    exportPersonalDataJSON(playlists);
    onShowToast('💾 Tüm çalma listeleriniz ve geçmişiniz .json olarak indirildi.');
    confetti({ particleCount: 40, spread: 50 });
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const result = parseImportDataJSON(text);
        if (result?.playlists && result.playlists.length > 0) {
          onImportPlaylists(result.playlists);
          onShowToast(`✅ ${result.playlists.length} çalma listesi başarıyla içe aktarıldı.`);
          confetti({ particleCount: 70, spread: 80 });
          onClose();
        } else {
          setErrorMsg('Geçerli bir SoundPulse yedek dosyası bulunamadı.');
        }
      } catch (err) {
        setErrorMsg('Dosya okunurken hata oluştu.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-950/60 via-neutral-900 to-teal-950/60 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Kişiselleştirme & Özel Kullanım Merkezi</span>
              </h2>
              <p className="text-xs text-neutral-400">
                Uygulamayı yalnızca kendinize ait özel bir müzik alanına dönüştürün
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/50 p-1.5 gap-1">
          <button
            onClick={() => { setActiveTab('pin'); setErrorMsg(null); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'pin'
                ? 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <KeyRound className="w-4 h-4 text-emerald-400" />
            <span>PIN & Master Kilit</span>
          </button>

          <button
            onClick={() => { setActiveTab('backup'); setErrorMsg(null); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'backup'
                ? 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Download className="w-4 h-4 text-teal-400" />
            <span>Kişisel Veri Yedekleme</span>
          </button>

          <button
            onClick={() => { setActiveTab('guide'); setErrorMsg(null); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'guide'
                ? 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>Özel Uygulama Rehberi</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-medium flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: PIN LOCK */}
          {activeTab === 'pin' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {currentPin ? (
                      <Lock className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Unlock className="w-5 h-5 text-neutral-500" />
                    )}
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {currentPin ? 'PIN Kilidi Aktif' : 'PIN Kilidi Kurulu Değil'}
                      </h3>
                      <p className="text-xs text-neutral-400">
                        {currentPin
                          ? 'Uygulama açılışta veya kilitlendiğinde 4 haneli PIN ister.'
                          : 'Başkalarının erişememesi için özel bir PIN parolası belirleyin.'}
                      </p>
                    </div>
                  </div>

                  {currentPin && (
                    <button
                      onClick={handleLockNow}
                      className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-emerald-400 text-xs font-bold rounded-xl border border-neutral-700 transition flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Şimdi Kilitle</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Set or Change PIN Form */}
              <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  {currentPin ? 'PIN Parolasını Güncelle' : 'Yeni Kişisel PIN Belirle'}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                      4 Haneli PIN
                    </label>
                    <input
                      type="password"
                      maxLength={8}
                      value={inputPin}
                      onChange={e => setInputPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="Örn: 1234"
                      className="w-full bg-neutral-950 text-white font-mono text-center tracking-widest text-lg py-2.5 rounded-xl border border-neutral-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                      PIN Tekrar
                    </label>
                    <input
                      type="password"
                      maxLength={8}
                      value={confirmPin}
                      onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="Örn: 1234"
                      className="w-full bg-neutral-950 text-white font-mono text-center tracking-widest text-lg py-2.5 rounded-xl border border-neutral-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  {currentPin ? (
                    <button
                      onClick={handleRemovePin}
                      className="text-xs text-red-400 hover:text-red-300 font-bold transition flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>PIN Kilidini Tamamen Kaldır</span>
                    </button>
                  ) : <div />}

                  <button
                    onClick={handleSavePin}
                    disabled={inputPin.length < 4}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition disabled:opacity-50"
                  >
                    {currentPin ? 'PIN Güncelle' : 'PIN Kilidini Etkinleştir'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BACKUP & EXPORT */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Kişisel Veri Yedekleme (Veri Sahipliği)</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Tüm çalma listeleriniz, dinleme geçmişiniz, müzik tercihleriniz ve favori şarkılarınız tek bir <code className="text-emerald-400">.json</code> dosyası olarak bilgisayarınıza/telefonunuza indirilir.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    onClick={handleExportBackup}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition shadow-lg shadow-emerald-500/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tüm Arşivimi & Geçmişimi İndir (.json)</span>
                  </button>

                  <label className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs transition cursor-pointer border border-neutral-700">
                    <Upload className="w-4 h-4 text-teal-400" />
                    <span>Yedekten Geri Yükle</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-400 space-y-1">
                <span className="font-bold text-white">💡 Cihazlar Arası Taşıma:</span>
                <p>Bu yedek dosyasını telefonunuza veya başka bir bilgisayara aktararak çalma listelerinizi ve dinleme alışkanlıklarınızı hiçbir veri kaybı olmadan doğrudan kullanabilirsiniz.</p>
              </div>
            </div>
          )}

          {/* TAB 3: STEP-BY-STEP USER GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-indigo-950/40 border border-emerald-500/20">
                <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Bu Uygulamayı Sadece Kendinize Özel Yapmanın 3 Yolu:</span>
                </h3>
                <p className="text-neutral-300">
                  SoundPulse tamamen bağımsızdır ve kişisel müzik kütüphaneniz olarak çalışmak üzere tasarlanmıştır.
                </p>
              </div>

              {/* Way 1 */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-emerald-400">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">1</span>
                  <span>Özel AI Studio Bağlantısı ile Kullanım (En Kolay)</span>
                </div>
                <p className="text-neutral-400 leading-relaxed pl-7">
                  Şu an çalıştığınız tarayıcı penceresi ve link yalnızca sizin Google hesabınıza bağlı özel bir geliştirme ortamıdır. Bu linki kimseyle paylaşmadığınız sürece sadece siz erişebilirsiniz.
                </p>
              </div>

              {/* Way 2 */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-teal-400">
                  <span className="w-5 h-5 rounded-full bg-teal-500/20 flex items-center justify-center text-[10px]">2</span>
                  <span>Dahili PIN Kilidi ile Kişisel Güvenlik</span>
                </div>
                <p className="text-neutral-400 leading-relaxed pl-7">
                  Uygulama içine eklediğimiz <strong>"PIN & Master Kilit"</strong> sekmesinden 4 haneli bir şifre koyarak, ortak bilgisayarda bile açılsa şifreniz girilmeden listelerinizin ve geçmişinizin görülmesini engelleyebilirsiniz.
                </p>
              </div>

              {/* Way 3 */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-indigo-400">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px]">3</span>
                  <span>Kendi Bilgisayarınıza veya Özel Sunucunuza Kurma (GitHub / ZIP)</span>
                </div>
                <p className="text-neutral-400 leading-relaxed pl-7">
                  AI Studio menüsünden <strong>"Export to ZIP"</strong> veya <strong>"Export to GitHub"</strong> diyerek tüm kaynak kodları indirebilirsiniz. Kendi bilgisayarınızda <code className="text-white bg-neutral-800 px-1.5 py-0.5 rounded">npm install && npm start</code> çalıştırarak tamamen yerel, bağımsız kişisel bir masaüstü müzik çalar olarak kullanabilirsiniz.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl transition"
          >
            Tamam
          </button>
        </div>
      </motion.div>
    </div>
  );
};
