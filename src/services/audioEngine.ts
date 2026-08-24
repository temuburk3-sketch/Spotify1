import { AudioSettings, Track } from '../types';
import { getAudioBlobFromCache } from './storage';

class AudioEngine {
  private audio: HTMLAudioElement;
  private ctx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private isInitialized = false;

  // Active Playback Mode
  private activeMode: 'html5' | 'youtube' | 'synth' = 'html5';

  // YouTube Full-Song Engine
  private ytPlayer: any = null;
  private ytPlayerReady = false;
  private ytInterval: any = null;
  private ytLoadingPromise: Promise<void> | null = null;

  // Fallback Synth
  private synthCtx: AudioContext | null = null;
  private synthInterval: any = null;
  private isSynthPlaying = false;

  // A-B Repeat Loop
  private loopA: number | null = null;
  private loopB: number | null = null;
  private isABLoopActive = false;

  // Background Audio Keep-Alive & Wake Lock
  private silentAudio: HTMLAudioElement | null = null;
  private wakeLock: any = null;

  private currentTrack: Track | null = null;
  private onTimeUpdateCallback: ((time: number, duration: number) => void) | null = null;
  private onEndedCallback: (() => void) | null = null;
  private onErrorCallback: ((err: any) => void) | null = null;
  private onPlayStateChangeCallback: ((isPlaying: boolean) => void) | null = null;
  private lastTimeUpdateTs = 0;
  private lastMediaSessionPosUpdateTs = 0;

  // MediaSession Action Handler Cache
  private actionHandlers: {
    onPlay?: () => void;
    onPause?: () => void;
    onNext?: () => void;
    onPrev?: () => void;
    onSeek?: (to: number) => void;
  } = {};

  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.preload = 'auto';

    this.initSilentKeepAlive();
    this.setupListeners();
    this.initVisibilityListener();
    this.initYouTube().catch(() => {});
  }

  // Silent audio keep-alive to keep mobile browsers (Android / iOS) from sleeping in the background
  private initSilentKeepAlive() {
    try {
      // 1-second silent WAV base64
      const silentWav = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      this.silentAudio = new Audio(silentWav);
      this.silentAudio.loop = true;
      this.silentAudio.volume = 0.001;
    } catch {}
  }

  private async acquireWakeLock() {
    if ('wakeLock' in navigator && (navigator as any).wakeLock) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          this.wakeLock = null;
        });
      } catch (err) {
        // WakeLock may be rejected if battery saver is on
      }
    }
  }

  private releaseWakeLock() {
    if (this.wakeLock) {
      try {
        this.wakeLock.release();
      } catch {}
      this.wakeLock = null;
    }
  }

  private initVisibilityListener() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.isPlaying()) {
          // Re-sync position and wake lock on foreground return
          this.acquireWakeLock().catch(() => {});
          this.updateMediaSessionPosition(this.getCurrentTime(), this.getDuration());
        }
      });
    }
  }

  private setupListeners() {
    this.audio.addEventListener('timeupdate', () => {
      if (this.activeMode !== 'html5') return;

      const now = performance.now();
      if (now - this.lastTimeUpdateTs < 250) return;
      this.lastTimeUpdateTs = now;

      const cur = this.audio.currentTime;
      const dur = this.audio.duration || this.currentTrack?.duration || 180;

      if (now - this.lastMediaSessionPosUpdateTs > 1000) {
        this.lastMediaSessionPosUpdateTs = now;
        this.updateMediaSessionPosition(cur, dur);
      }

      if (this.isABLoopActive && this.loopA !== null && this.loopB !== null) {
        if (cur >= this.loopB) {
          this.audio.currentTime = this.loopA;
        }
      }

      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(cur, dur);
      }
    });

    this.audio.addEventListener('ended', () => {
      if (this.activeMode !== 'html5') return;
      if (this.onEndedCallback) {
        this.onEndedCallback();
      }
    });

    this.audio.addEventListener('play', () => {
      if (this.activeMode !== 'html5') return;
      this.updateMediaSessionState('playing');
      this.acquireWakeLock().catch(() => {});
      if (this.onPlayStateChangeCallback) this.onPlayStateChangeCallback(true);
    });

    this.audio.addEventListener('pause', () => {
      if (this.activeMode !== 'html5') return;
      this.updateMediaSessionState('paused');
      this.releaseWakeLock();
      if (this.onPlayStateChangeCallback) this.onPlayStateChangeCallback(false);
    });

    this.audio.addEventListener('error', (e) => {
      if (this.activeMode !== 'html5') return;
      console.warn('HTML5 Audio error:', e);
      if (this.audio.crossOrigin) {
        this.audio.crossOrigin = null;
        this.audio.load();
        this.audio.play().catch(() => {});
        return;
      }
      if (this.onErrorCallback) {
        this.onErrorCallback(e);
      }
    });
  }

  // Initialize YouTube IFrame Player API for 100% full song streams
  public initYouTube(): Promise<void> {
    if (this.ytPlayerReady && this.ytPlayer) return Promise.resolve();
    if (this.ytLoadingPromise) return this.ytLoadingPromise;

    this.ytLoadingPromise = new Promise((resolve) => {
      const checkAndCreate = () => {
        if ((window as any).YT && (window as any).YT.Player) {
          try {
            let host = document.getElementById('youtube-player-host');
            if (!host) {
              host = document.createElement('div');
              host.id = 'youtube-player-host';
              host.style.position = 'fixed';
              host.style.bottom = '4px';
              host.style.right = '4px';
              host.style.width = '240px';
              host.style.height = '140px';
              host.style.zIndex = '-99';
              host.style.pointerEvents = 'none';
              host.style.opacity = '0.01';
              host.style.transform = 'scale(0.2)';
              host.style.transformOrigin = 'bottom right';
              document.body.appendChild(host);
            }

            this.ytPlayer = new (window as any).YT.Player('youtube-player-host', {
              height: '140',
              width: '240',
              playerVars: {
                autoplay: 1,
                controls: 0,
                disablekb: 1,
                fs: 0,
                rel: 0,
                playsinline: 1,
                enablejsapi: 1,
                origin: typeof window !== 'undefined' ? window.location.origin : undefined
              },
              events: {
                onReady: () => {
                  this.ytPlayerReady = true;
                  try {
                    this.ytPlayer.unMute();
                    this.ytPlayer.setVolume(100);
                  } catch {}
                  resolve();
                },
                onStateChange: (event: any) => {
                  if (this.activeMode !== 'youtube') return;

                  // 0: ENDED, 1: PLAYING, 2: PAUSED, 3: BUFFERING
                  if (event.data === 0) {
                    this.clearYtInterval();
                    if (this.onEndedCallback) {
                      this.onEndedCallback();
                    }
                  } else if (event.data === 1) {
                    this.startYtInterval();
                    this.updateMediaSessionState('playing');
                    if (this.onPlayStateChangeCallback) {
                      this.onPlayStateChangeCallback(true);
                    }
                  } else if (event.data === 2) {
                    this.clearYtInterval();
                    this.updateMediaSessionState('paused');
                    if (this.onPlayStateChangeCallback) {
                      this.onPlayStateChangeCallback(false);
                    }
                  }
                },
                onError: (err: any) => {
                  console.warn('YouTube Player playback warning:', err);
                  // If YouTube restricted, fallback to audio stream
                  if (this.currentTrack && this.activeMode === 'youtube') {
                    this.playViaHtml5(this.currentTrack, 0);
                  }
                }
              }
            });
          } catch (e) {
            console.warn('YouTube init error:', e);
            resolve();
          }
        } else {
          setTimeout(checkAndCreate, 120);
        }
      };

      if (!(window as any).YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
      checkAndCreate();
    });

    return this.ytLoadingPromise;
  }

  private startYtInterval() {
    this.clearYtInterval();
    this.ytInterval = setInterval(() => {
      if (this.ytPlayer && this.activeMode === 'youtube') {
        try {
          const state = typeof this.ytPlayer.getPlayerState === 'function' ? this.ytPlayer.getPlayerState() : 1;
          // Only check and trigger update if player is playing (state 1) or buffering (state 3)
          if (state !== 1 && state !== 3) return;

          const cur = this.ytPlayer.getCurrentTime() || 0;
          const dur = this.ytPlayer.getDuration() || (this.currentTrack?.duration || 180);

          const now = performance.now();
          if (now - this.lastMediaSessionPosUpdateTs > 1000) {
            this.lastMediaSessionPosUpdateTs = now;
            this.updateMediaSessionPosition(cur, dur);
          }

          if (this.isABLoopActive && this.loopA !== null && this.loopB !== null) {
            if (cur >= this.loopB) {
              this.ytPlayer.seekTo(this.loopA, true);
            }
          }

          if (this.onTimeUpdateCallback) {
            this.onTimeUpdateCallback(cur, dur);
          }
        } catch {}
      }
    }, 300);
  }

  private clearYtInterval() {
    if (this.ytInterval) {
      clearInterval(this.ytInterval);
      this.ytInterval = null;
    }
  }

  private initWebAudio() {
    if (this.isInitialized) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      this.ctx = new AudioCtxClass();
      this.sourceNode = this.ctx.createMediaElementSource(this.audio);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.gainNode = this.ctx.createGain();

      const frequencies = [60, 250, 1000, 4000, 12000];
      const types: BiquadFilterType[] = ['lowshelf', 'peaking', 'peaking', 'peaking', 'highshelf'];

      this.eqFilters = frequencies.map((freq, index) => {
        const filter = this.ctx!.createBiquadFilter();
        filter.type = types[index];
        filter.frequency.value = freq;
        filter.gain.value = 0;
        return filter;
      });

      this.bassFilter = this.ctx.createBiquadFilter();
      this.bassFilter.type = 'lowshelf';
      this.bassFilter.frequency.value = 100;
      this.bassFilter.gain.value = 0;

      let lastNode: AudioNode = this.sourceNode;
      for (const filter of this.eqFilters) {
        lastNode.connect(filter);
        lastNode = filter;
      }
      lastNode.connect(this.bassFilter);
      this.bassFilter.connect(this.gainNode);
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      this.isInitialized = true;
    } catch (err) {
      console.warn('Web Audio init note:', err);
    }
  }

  // Play full song starting from 0:00 (or specified start time)
  public async playTrack(track: Track, startTime = 0): Promise<void> {
    this.currentTrack = track;
    this.stopSynth();
    this.setupMediaSession(track);
    const effectiveStart = startTime > 0 ? startTime : (track.startOffset || 0);

    // 1. Check if track is cached offline in browser IndexedDB storage
    try {
      const cachedBlob = await getAudioBlobFromCache(track.id);
      if (cachedBlob) {
        if (this.ytPlayer && this.ytPlayerReady) {
          try { this.ytPlayer.pauseVideo(); } catch {}
        }
        this.clearYtInterval();
        return this.playViaHtml5(track, effectiveStart, URL.createObjectURL(cachedBlob));
      }
    } catch {}

    // 2. If track has youtubeId, play 100% full song via YouTube Engine
    if (track.youtubeId) {
      return this.playViaYouTube(track.youtubeId, effectiveStart);
    }

    // 3. If local file / blob URL, play via HTML5 Audio element
    if (track.source === 'local' || (track.audioUrl && (track.audioUrl.startsWith('blob:') || track.audioUrl.startsWith('data:')))) {
      if (this.ytPlayer && this.ytPlayerReady) {
        try { this.ytPlayer.pauseVideo(); } catch {}
      }
      this.clearYtInterval();
      return this.playViaHtml5(track, effectiveStart);
    }

    // 4. Resolve official full song source from server (YouTube stream ID & exact duration)
    try {
      const res = await fetch(`/api/audio/full-source?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.youtubeId) {
          track.youtubeId = data.youtubeId;
          if (data.duration && data.duration > 0) {
            track.duration = data.duration;
          }
          return this.playViaYouTube(data.youtubeId, effectiveStart);
        }
      }
    } catch (e) {
      console.warn('Full track resolve error:', e);
    }

    // 5. Fallback to direct HTML5 stream
    return this.playViaHtml5(track, effectiveStart);
  }

  private async playViaYouTube(youtubeId: string, startTime = 0): Promise<void> {
    this.activeMode = 'youtube';
    this.audio.pause();

    await this.initYouTube();

    if (this.ytPlayer && this.ytPlayer.loadVideoById) {
      try {
        const startSecs = Math.max(0, startTime);
        this.ytPlayer.loadVideoById({
          videoId: youtubeId,
          startSeconds: startSecs
        });
        this.ytPlayer.playVideo();
        this.startYtInterval();
        this.acquireWakeLock().catch(() => {});
        this.silentAudio?.play().catch(() => {});
        this.updateMediaSessionState('playing');
        if (this.onPlayStateChangeCallback) {
          this.onPlayStateChangeCallback(true);
        }
        return;
      } catch (e) {
        console.warn('Failed to load YT video:', e);
      }
    }

    // If YT failed to initialize, fallback to HTML5
    if (this.currentTrack) {
      return this.playViaHtml5(this.currentTrack, startTime);
    }
  }

  private async playViaHtml5(track: Track, startTime = 0, overrideSrc?: string): Promise<void> {
    this.activeMode = 'html5';
    this.clearYtInterval();
    if (this.ytPlayer && this.ytPlayerReady) {
      try { this.ytPlayer.pauseVideo(); } catch {}
    }

    const audioSrc = overrideSrc || track.audioUrl;
    this.audio.src = audioSrc;
    this.audio.currentTime = Math.max(0, startTime);

    try {
      if (!this.isInitialized) {
        this.initWebAudio();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      await this.audio.play();
      this.acquireWakeLock().catch(() => {});
      this.silentAudio?.play().catch(() => {});
    } catch (error) {
      console.warn('Playback error, trying procedural synth fallback:', error);
      if (!audioSrc || audioSrc.startsWith('synth:')) {
        this.playProceduralSynth(track);
      }
      throw error;
    }
  }

  public async resume(): Promise<void> {
    if (this.isSynthPlaying) return;

    this.acquireWakeLock().catch(() => {});
    this.silentAudio?.play().catch(() => {});

    if (this.activeMode === 'youtube' && this.ytPlayer) {
      try {
        this.ytPlayer.playVideo();
        this.startYtInterval();
        this.updateMediaSessionState('playing');
        return;
      } catch {}
    }

    if (!this.isInitialized) this.initWebAudio();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    this.updateMediaSessionState('playing');
    return this.audio.play();
  }

  public pause(): void {
    this.releaseWakeLock();
    this.silentAudio?.pause();
    this.updateMediaSessionState('paused');

    if (this.isSynthPlaying) {
      this.stopSynth();
    }

    if (this.activeMode === 'youtube' && this.ytPlayer) {
      try {
        this.ytPlayer.pauseVideo();
        this.clearYtInterval();
      } catch {}
    }

    this.audio.pause();
  }

  public seek(seconds: number): void {
    const targetDuration = this.currentTrack?.duration || 180;
    const clamped = Math.max(0, Math.min(seconds, targetDuration));

    if (this.activeMode === 'youtube' && this.ytPlayer) {
      try {
        this.ytPlayer.seekTo(clamped, true);
        if (this.onTimeUpdateCallback) {
          this.onTimeUpdateCallback(clamped, this.ytPlayer.getDuration() || targetDuration);
        }
        return;
      } catch {}
    }

    if (this.audio.duration && !isNaN(this.audio.duration)) {
      this.audio.currentTime = Math.max(0, Math.min(clamped, this.audio.duration));
    }
  }

  public setVolume(volume: number): void {
    const vol = Math.max(0, Math.min(1, volume));
    this.audio.volume = vol;
    if (this.ytPlayer && this.ytPlayer.setVolume) {
      try {
        this.ytPlayer.setVolume(Math.round(vol * 100));
      } catch {}
    }
  }

  public setPlaybackRate(rate: number): void {
    const r = Math.max(0.25, Math.min(2.5, rate));
    this.audio.playbackRate = r;
    if (this.ytPlayer && this.ytPlayer.setPlaybackRate) {
      try {
        this.ytPlayer.setPlaybackRate(r);
      } catch {}
    }
  }

  public setEqualizer(settings: AudioSettings['eqBands'], bassBoost: boolean): void {
    if (!this.isInitialized) return;
    if (this.eqFilters.length === 5) {
      this.eqFilters[0].gain.value = settings.bass;
      this.eqFilters[1].gain.value = settings.midLow;
      this.eqFilters[2].gain.value = settings.mid;
      this.eqFilters[3].gain.value = settings.midHigh;
      this.eqFilters[4].gain.value = settings.treble;
    }
    if (this.bassFilter) {
      this.bassFilter.gain.value = bassBoost ? 8 : 0;
    }
  }

  public setABLoop(start: number | null, end: number | null, enabled: boolean): void {
    this.loopA = start;
    this.loopB = end;
    this.isABLoopActive = enabled;
  }

  public getVisualizerData(): Uint8Array | null {
    if (this.activeMode === 'html5' && this.analyser) {
      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(dataArray);
      return dataArray;
    }

    // Dynamic procedural frequency spectrum for YouTube audio playback
    if (this.isPlaying()) {
      const arr = new Uint8Array(64);
      const t = Date.now() / 150;
      for (let i = 0; i < 64; i++) {
        const beat = Math.sin(t + i * 0.25) * 0.5 + 0.5;
        const sub = Math.sin(t * 1.8 + i * 0.1) * 0.5 + 0.5;
        arr[i] = Math.floor((beat * 0.6 + sub * 0.4) * 200 + 40);
      }
      return arr;
    }

    return null;
  }

  public getWaveformData(): Uint8Array | null {
    if (this.activeMode === 'html5' && this.analyser) {
      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteTimeDomainData(dataArray);
      return dataArray;
    }

    if (this.isPlaying()) {
      const arr = new Uint8Array(64);
      const t = Date.now() / 100;
      for (let i = 0; i < 64; i++) {
        arr[i] = Math.floor(128 + Math.sin(t + i * 0.4) * 45);
      }
      return arr;
    }

    return null;
  }

  public isPlaying(): boolean {
    if (this.activeMode === 'youtube' && this.ytPlayer) {
      try {
        return this.ytPlayer.getPlayerState() === 1;
      } catch {
        return false;
      }
    }
    return !this.audio.paused && !this.audio.ended && this.audio.currentTime > 0;
  }

  public getCurrentTime(): number {
    if (this.activeMode === 'youtube' && this.ytPlayer) {
      try {
        return this.ytPlayer.getCurrentTime() || 0;
      } catch {}
    }
    return this.audio.currentTime || 0;
  }

  public getDuration(): number {
    if (this.activeMode === 'youtube' && this.ytPlayer) {
      try {
        return this.ytPlayer.getDuration() || (this.currentTrack?.duration || 180);
      } catch {}
    }
    return this.audio.duration || (this.currentTrack?.duration || 180);
  }

  // Procedural fallback audio synthesizer for ambient lo-fi / chill notes
  public playProceduralSynth(track: Track): void {
    try {
      this.stopSynth();
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      this.synthCtx = new AudioCtxClass();
      this.isSynthPlaying = true;
      this.activeMode = 'synth';

      const chords = [
        [261.63, 329.63, 392.00, 493.88], // Cmaj7
        [220.00, 261.63, 329.63, 392.00], // Am7
        [174.61, 220.00, 261.63, 329.63], // Fmaj7
        [196.00, 246.94, 293.66, 349.23], // G7
      ];
      let chordIndex = 0;

      const playChord = () => {
        if (!this.synthCtx || !this.isSynthPlaying) return;
        const currentChord = chords[chordIndex % chords.length];
        chordIndex++;

        currentChord.forEach((freq, i) => {
          if (!this.synthCtx) return;
          const osc = this.synthCtx.createOscillator();
          const gain = this.synthCtx.createGain();
          osc.type = i % 2 === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq, this.synthCtx.currentTime);

          gain.gain.setValueAtTime(0.001, this.synthCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.04, this.synthCtx.currentTime + 0.3);
          gain.gain.exponentialRampToValueAtTime(0.0001, this.synthCtx.currentTime + 2.8);

          osc.connect(gain);
          gain.connect(this.synthCtx.destination);

          osc.start(this.synthCtx.currentTime);
          osc.stop(this.synthCtx.currentTime + 3.0);
        });
      };

      playChord();
      this.synthInterval = setInterval(playChord, 3000);
      if (this.onPlayStateChangeCallback) this.onPlayStateChangeCallback(true);
    } catch (e) {
      console.warn('Synth error:', e);
    }
  }

  public stopSynth(): void {
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
    if (this.synthCtx) {
      try {
        this.synthCtx.close();
      } catch {}
      this.synthCtx = null;
    }
    this.isSynthPlaying = false;
  }

  // MediaSession API setup for lock screen & background listening
  private setupMediaSession(track: Track) {
    if ('mediaSession' in navigator) {
      try {
        const cover = track.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60';
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title,
          artist: track.artist,
          album: track.album || 'SoundPulse Music',
          artwork: [
            { src: cover, sizes: '96x96', type: 'image/jpeg' },
            { src: cover, sizes: '128x128', type: 'image/jpeg' },
            { src: cover, sizes: '192x192', type: 'image/jpeg' },
            { src: cover, sizes: '256x256', type: 'image/jpeg' },
            { src: cover, sizes: '384x384', type: 'image/jpeg' },
            { src: cover, sizes: '512x512', type: 'image/jpeg' },
          ]
        });

        this.bindMediaSessionActions();
        this.updateMediaSessionPosition(0, track.duration || 180);
      } catch (e) {
        console.warn('MediaSession metadata error:', e);
      }
    }
  }

  public updateMediaSessionPosition(position: number, duration: number) {
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      try {
        const dur = Math.max(1, duration || this.currentTrack?.duration || 180);
        const pos = Math.max(0, Math.min(position, dur));
        navigator.mediaSession.setPositionState({
          duration: dur,
          playbackRate: 1.0,
          position: pos
        });
      } catch {}
    }
  }

  public updateMediaSessionState(state: 'playing' | 'paused' | 'none') {
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = state;
      } catch {}
    }
  }

  private bindMediaSessionActions() {
    if (!('mediaSession' in navigator)) return;

    const actionList: MediaSessionAction[] = [
      'play',
      'pause',
      'previoustrack',
      'nexttrack',
      'seekto',
      'seekbackward',
      'seekforward',
      'stop'
    ];

    actionList.forEach((action) => {
      try {
        navigator.mediaSession.setActionHandler(action, (details) => {
          switch (action) {
            case 'play':
              if (this.actionHandlers.onPlay) this.actionHandlers.onPlay();
              else this.resume();
              break;
            case 'pause':
              if (this.actionHandlers.onPause) this.actionHandlers.onPause();
              else this.pause();
              break;
            case 'previoustrack':
              if (this.actionHandlers.onPrev) {
                this.actionHandlers.onPrev();
              }
              break;
            case 'nexttrack':
              if (this.actionHandlers.onNext) {
                this.actionHandlers.onNext();
              }
              break;
            case 'seekto':
              if (details.seekTime !== undefined) {
                if (this.actionHandlers.onSeek) {
                  this.actionHandlers.onSeek(details.seekTime);
                } else {
                  this.seek(details.seekTime);
                }
              }
              break;
            case 'seekbackward': {
              const offset = details.seekOffset || 10;
              const newPos = Math.max(0, this.getCurrentTime() - offset);
              this.seek(newPos);
              break;
            }
            case 'seekforward': {
              const offset = details.seekOffset || 10;
              const newPos = Math.min(this.getDuration(), this.getCurrentTime() + offset);
              this.seek(newPos);
              break;
            }
            case 'stop':
              this.pause();
              break;
          }
        });
      } catch (err) {
        // Some browsers may not support certain actions
      }
    });
  }

  public setMediaSessionActionHandlers(handlers: {
    onPlay?: () => void;
    onPause?: () => void;
    onNext?: () => void;
    onPrev?: () => void;
    onSeek?: (to: number) => void;
  }) {
    this.actionHandlers = { ...this.actionHandlers, ...handlers };
    this.bindMediaSessionActions();
  }

  public setCallbacks(callbacks: {
    onTimeUpdate?: (time: number, duration: number) => void;
    onEnded?: () => void;
    onError?: (err: any) => void;
    onPlayStateChange?: (isPlaying: boolean) => void;
  }) {
    if (callbacks.onTimeUpdate) this.onTimeUpdateCallback = callbacks.onTimeUpdate;
    if (callbacks.onEnded) this.onEndedCallback = callbacks.onEnded;
    if (callbacks.onError) this.onErrorCallback = callbacks.onError;
    if (callbacks.onPlayStateChange) this.onPlayStateChangeCallback = callbacks.onPlayStateChange;
  }
}

export const audioEngine = new AudioEngine();
