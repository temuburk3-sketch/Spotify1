import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  constructor(props: Props) {
    super(props);
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SoundPulse ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetStorage = () => {
    try {
      localStorage.removeItem('soundpulse_playlists');
      localStorage.removeItem('soundpulse_folders');
      localStorage.removeItem('soundpulse_audio_settings');
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen w-screen bg-[#07090d] text-neutral-100 p-6 font-sans">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 shadow-xl shadow-amber-500/5">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2 text-center">
            SoundPulse Kurtarma Modu
          </h1>
          <p className="text-sm text-neutral-400 max-w-md text-center mb-6 leading-relaxed">
            Beklenmedik bir veri veya tarayıcı önbellek durumu oluştu. Müzik listenizi ve ayarlarınızı koruyarak güvenle yeniden başlatabilirsiniz.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
            <button
              onClick={this.handleReload}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm transition shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Yeniden Başlat</span>
            </button>

            <button
              onClick={this.handleResetStorage}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 font-bold text-sm transition cursor-pointer"
              title="Kayıtlı geçersiz verileri temizleyip varsayılan listelerle açar"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Verileri Sıfırla</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
