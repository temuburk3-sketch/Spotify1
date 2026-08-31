import { Track } from '../types';
import { LyricsResponse } from './lyricsService';

export interface TVSyncState {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  lyricsData: LyricsResponse | null;
  timestamp: number;
}

class TVSyncService {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<(state: TVSyncState) => void> = new Set();
  private currentState: TVSyncState = {
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    lyricsData: null,
    timestamp: Date.now()
  };

  constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel('soundpulse_tv_sync_bus');
        this.channel.onmessage = (event) => {
          if (event.data && typeof event.data === 'object') {
            this.currentState = event.data;
            this.notifyListeners(this.currentState);
          }
        };
      } catch {}
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'soundpulse_tv_sync_state' && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            this.currentState = parsed;
            this.notifyListeners(parsed);
          } catch {}
        }
      });
    }
  }

  public broadcastState(state: Partial<TVSyncState>) {
    this.currentState = {
      ...this.currentState,
      ...state,
      timestamp: Date.now()
    };

    if (this.channel) {
      try {
        this.channel.postMessage(this.currentState);
      } catch {}
    }

    try {
      localStorage.setItem('soundpulse_tv_sync_state', JSON.stringify(this.currentState));
    } catch {}

    this.notifyListeners(this.currentState);
  }

  public subscribe(callback: (state: TVSyncState) => void): () => void {
    this.listeners.add(callback);
    callback(this.currentState);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(state: TVSyncState) {
    this.listeners.forEach((cb) => {
      try {
        cb(state);
      } catch {}
    });
  }

  public openTVPopoutWindow(): Window | null {
    if (typeof window === 'undefined') return null;
    const url = `${window.location.origin}${window.location.pathname}?tv=stage`;
    const width = 1280;
    const height = 720;
    const left = window.screen.width ? (window.screen.width - width) / 2 : 100;
    const top = window.screen.height ? (window.screen.height - height) / 2 : 100;
    return window.open(
      url,
      'SoundPulseTVStage',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
    );
  }
}

export const tvSyncService = new TVSyncService();
