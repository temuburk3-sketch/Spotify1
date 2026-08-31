import { Track } from '../types';
import { LyricsResponse } from './lyricsService';

export interface TVSyncState {
  roomCode: string;
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  lyricsData: LyricsResponse | null;
  timestamp: number;
}

class TVSyncService {
  private channel: BroadcastChannel | null = null;
  private eventSource: EventSource | null = null;
  private listeners: Set<(state: TVSyncState) => void> = new Set();
  private lastPostTimestamp = 0;
  private roomCode = 'STAGE';

  private currentState: TVSyncState = {
    roomCode: 'STAGE',
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    lyricsData: null,
    timestamp: Date.now()
  };

  constructor() {
    // 1. Local BroadcastChannel for same-browser multi-tab sync
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

    // 2. LocalStorage sync fallback
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

    // 3. Connect SSE for smart TV and multi-device sync
    this.initSSE();
  }

  public setRoomCode(code: string) {
    this.roomCode = (code || 'STAGE').toUpperCase().trim();
    this.currentState.roomCode = this.roomCode;
    this.initSSE();
  }

  public getRoomCode(): string {
    return this.roomCode;
  }

  private initSSE() {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch {}
      this.eventSource = null;
    }

    try {
      this.eventSource = new EventSource(`/api/tv/events?room=${encodeURIComponent(this.roomCode)}`);
      this.eventSource.onmessage = (e) => {
        try {
          if (!e.data || e.data.startsWith(':')) return;
          const parsed = JSON.parse(e.data);
          if (parsed && parsed.timestamp && parsed.timestamp > (this.currentState.timestamp || 0)) {
            this.currentState = parsed;
            this.notifyListeners(parsed);
          }
        } catch {}
      };
      this.eventSource.onerror = () => {
        // SSE will reconnect automatically
      };
    } catch {}
  }

  public broadcastState(state: Partial<TVSyncState>) {
    this.currentState = {
      ...this.currentState,
      ...state,
      roomCode: this.roomCode,
      timestamp: Date.now()
    };

    // Broadcast local channel
    if (this.channel) {
      try {
        this.channel.postMessage(this.currentState);
      } catch {}
    }

    // Save local storage
    try {
      localStorage.setItem('soundpulse_tv_sync_state', JSON.stringify(this.currentState));
    } catch {}

    this.notifyListeners(this.currentState);

    // Throttle HTTP sync POST to server (every 1s max, or immediately on track/state change)
    const now = Date.now();
    const shouldImmediate = state.currentTrack !== undefined || state.isPlaying !== undefined;
    if (shouldImmediate || now - this.lastPostTimestamp > 1000) {
      this.lastPostTimestamp = now;
      fetch('/api/tv/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.currentState)
      }).catch(() => {});
    }
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
    const url = `${window.location.origin}${window.location.pathname}?tv=stage&room=${encodeURIComponent(this.roomCode)}`;
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
