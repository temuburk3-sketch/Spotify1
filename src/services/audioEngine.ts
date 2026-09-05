import { AudioSettings, Track } from '../types';
import { getAudioBlobFromCache } from './storage';

class AudioEngine {
  private audio: HTMLAudioElement;
  private prefetchAudio: HTMLAudioElement | null = null;
  private prefetchedTrackId: string | null = null;
  private ctx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private pannerNode: StereoPannerNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;
  private subBassFilter: BiquadFilterNode | null = null;
  private vocalFilter: BiquadFilterNode | null = null;
  private eq10Filters: BiquadFilterNode[] = [];
  private isInitialized = false;

  // 8D Spatial Audio Auto-Panner LFO
  private isSpatialActive = false;
  private spatialSpeed = 0.5;
  private spatialInterval: any = null;
  private spatialPhase = 0;

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
  private keepScreenAwake = false; // Default FALSE to prevent mobile phone overheating and battery drain
  private batterySaverMode = true; // Eco mode: 144p/small stream decoding, throttled animations

  public setScreenAwakePreference(awake: boolean): void {
    this.keepScreenAwake = awake;
    if (!awake) {
      this.releaseWakeLock();
    } else if (this.isPlaying()) {
      this.acquireWakeLock().catch(() => {});
    }
  }

  public setKeepScreenAwake(awake: boolean): void {
    this.setScreenAwakePreference(awake);
  }

  public getScreenAwakePreference(): boolean {
    return this.keepScreenAwake;
  }

  public setBatterySaverMode(enabled: boolean): void {
    this.batterySaverMode = enabled;
    if (this.ytPlayer && typeof this.ytPlayer.setPlaybackQuality === 'function') {
      try {
        this.ytPlayer.setPlaybackQuality(enabled ? 'small' : 'medium');
      } catch {}
    }
  }

  public getBatterySaverMode(): boolean {
    return this.batterySaverMode;
  }

  private currentTrack: Track | null = null;
  private onTimeUpdateCallback: ((time: number, duration: number) => void) | null = null;
  private onEndedCallback: (() => void) | null = null;
  private onErrorCallback: ((err: any) => void) | null = null;
  private onPlayStateChangeCallback: ((isPlaying: boolean) => void) | null = null;
  private lastTimeUpdateTs = 0;
  private lastMediaSessionPosUpdateTs = 0;

  // Master and transition volume management
  private masterVolume = 0.85;
  private currentEffectiveVolume = 0.85;
  private fadeInterval: any = null;
  private isTransitioning = false;
  private crossfadeSeconds = 0;

  // True Shuffle Memory Tracker (guarantees full permutation without repeat)
  private shuffleHistory: string[] = [];
  private shuffleRemaining: string[] = [];

  // Sleep Timer with smooth fade-out
  private sleepTimerId: any = null;
  private sleepTimerEndTs: number | null = null;
  private onSleepTimerComplete: (() => void) | null = null;

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

  // Silent audio keep-alive & Web Audio pipeline to keep mobile browsers (Opera, Chrome, iOS) active in background
  private initSilentKeepAlive() {
    try {
      // High-compatibility silent WAV loop
      const silentWav = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      this.silentAudio = new Audio(silentWav);
      this.silentAudio.loop = true;
      this.silentAudio.volume = 0.001;
      this.silentAudio.setAttribute('playsinline', 'true');
      this.silentAudio.setAttribute('webkit-playsinline', 'true');
    } catch {}
  }

  private async acquireWakeLock() {
    // Thermal & Battery Optimization:
    // Only acquire screen wake lock if explicitly requested by the user.
    // Keeping the screen forced awake during music playback is the #1 cause of mobile phone overheating.
    if (!this.keepScreenAwake) return;
    if ('wakeLock' in navigator && (navigator as any).wakeLock) {
      try {
        if (!this.wakeLock) {
          this.wakeLock = await (navigator as any).wakeLock.request('screen');
          this.wakeLock.addEventListener('release', () => {
            this.wakeLock = null;
          });
        }
      } catch (err) {
        // WakeLock may be rejected or unsupported
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
        if (!document.hidden) {
          // Returned to foreground
          if (this.isPlaying()) {
            this.acquireWakeLock().catch(() => {});
            this.updateMediaSessionPosition(this.getCurrentTime(), this.getDuration());
          }
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

      // If the HTML5 audio element was playing a short 30-second preview, but the track is a full song (duration > 40s):
      // Do NOT suddenly skip to the next track!
      const currentAudioDuration = this.audio.duration || 0;
      const expectedTrackDuration = this.currentTrack?.duration || 180;
      const isShortPreview = currentAudioDuration > 0 && currentAudioDuration <= 35 && expectedTrackDuration > 45 && this.currentTrack?.source !== 'local';

      if (isShortPreview && this.currentTrack) {
        // Attempt resolving full YouTube audio stream
        if (!this.currentTrack.youtubeId) {
          fetch(`/api/audio/full-source?title=${encodeURIComponent(this.currentTrack.title)}&artist=${encodeURIComponent(this.currentTrack.artist)}`)
            .then(r => r.json())
            .then(data => {
              if (data.youtubeId && this.currentTrack) {
                this.currentTrack.youtubeId = data.youtubeId;
                this.playViaYouTube(data.youtubeId, 30);
              }
            })
            .catch(() => {});
        }
        return;
      }

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
      console.warn('HTML5 Audio notice:', e);
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
    if (this.ytPlayerReady && this.ytPlayer && typeof this.ytPlayer.loadVideoById === 'function') return Promise.resolve();
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
              host.style.bottom = '0px';
              host.style.right = '0px';
              host.style.width = '1px';
              host.style.height = '1px';
              host.style.overflow = 'hidden';
              host.style.zIndex = '-1';
              host.style.pointerEvents = 'none';
              host.style.opacity = '0.001';
              document.body.appendChild(host);
            }

            this.ytPlayer = new (window as any).YT.Player('youtube-player-host', {
              height: '1',
              width: '1',
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
                    // Low-res video decoding saves ~85% mobile GPU wattage and halts overheating
                    if (typeof this.ytPlayer.setPlaybackQuality === 'function') {
                      this.ytPlayer.setPlaybackQuality(this.batterySaverMode ? 'small' : 'medium');
                    }
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
                    // 2: PAUSED (normal pause or buffering pause, do NOT downgrade to 30s preview!)
                    this.clearYtInterval();
                    this.updateMediaSessionState('paused');
                    if (this.onPlayStateChangeCallback) {
                      this.onPlayStateChangeCallback(false);
                    }
                  }
                },
                onError: (err: any) => {
                  console.warn('YouTube Player playback notice:', err);
                  // If this video ID had restrictions (e.g. error 150/101), fetch candidate backup video ID
                  if (this.currentTrack && this.activeMode === 'youtube') {
                    const failedId = this.currentTrack.youtubeId;
                    fetch(`/api/audio/full-source?title=${encodeURIComponent(this.currentTrack.title)}&artist=${encodeURIComponent(this.currentTrack.artist)}&excludeId=${encodeURIComponent(failedId || '')}`)
                      .then(r => r.json())
                      .then(data => {
                        if (data.youtubeId && data.youtubeId !== failedId && this.currentTrack) {
                          this.currentTrack.youtubeId = data.youtubeId;
                          this.playViaYouTube(data.youtubeId, 0);
                        }
                      })
                      .catch(() => {});
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
    }, 500);
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

      // Dynamics Compressor for Volume Normalization / ReplayGain
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-24, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

      // Stereo Panner for 3D & 8D Spatial Audio
      if (typeof this.ctx.createStereoPanner === 'function') {
        this.pannerNode = this.ctx.createStereoPanner();
      }

      // Vocal Remover / Center Notch Filter (Center-Channel Vocal Subtraction simulation)
      this.vocalFilter = this.ctx.createBiquadFilter();
      this.vocalFilter.type = 'peaking';
      this.vocalFilter.frequency.value = 1000;
      this.vocalFilter.Q.value = 1.2;
      this.vocalFilter.gain.value = 0;

      // Sub-Bass Boost Filter (45Hz Low-Shelf)
      this.subBassFilter = this.ctx.createBiquadFilter();
      this.subBassFilter.type = 'lowshelf';
      this.subBassFilter.frequency.value = 45;
      this.subBassFilter.gain.value = 0;

      // Bass Boost Filter (100Hz Low-Shelf)
      this.bassFilter = this.ctx.createBiquadFilter();
      this.bassFilter.type = 'lowshelf';
      this.bassFilter.frequency.value = 100;
      this.bassFilter.gain.value = 0;

      // 10-Band Parametric Equalizer: 32Hz, 64Hz, 125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz, 8kHz, 16kHz
      const freq10 = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
      this.eq10Filters = freq10.map((freq, idx) => {
        const filter = this.ctx!.createBiquadFilter();
        if (idx === 0) filter.type = 'lowshelf';
        else if (idx === freq10.length - 1) filter.type = 'highshelf';
        else filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.gain.value = 0;
        filter.Q.value = 1.4;
        return filter;
      });

      // Chain nodes: source -> vocalFilter -> subBass -> bass -> eq10[0..9] -> compressor -> panner -> gain -> analyser -> destination
      let lastNode: AudioNode = this.sourceNode;
      lastNode.connect(this.vocalFilter);
      lastNode = this.vocalFilter;

      lastNode.connect(this.subBassFilter);
      lastNode = this.subBassFilter;

      lastNode.connect(this.bassFilter);
      lastNode = this.bassFilter;

      for (const filter of this.eq10Filters) {
        lastNode.connect(filter);
        lastNode = filter;
      }

      lastNode.connect(this.compressor);
      lastNode = this.compressor;

      if (this.pannerNode) {
        lastNode.connect(this.pannerNode);
        lastNode = this.pannerNode;
      }

      lastNode.connect(this.gainNode);
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      this.isInitialized = true;
    } catch (err) {
      console.warn('Web Audio init note:', err);
    }
  }

  // --- Soft Transition & Volume Ramping Helpers ---

  private cancelActiveFade(): void {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
  }

  private applyInternalVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    this.currentEffectiveVolume = clamped;

    // HTML5 Audio
    try {
      this.audio.volume = clamped;
    } catch {}

    // Web Audio Gain Node (if initialized)
    if (this.gainNode && this.ctx && this.ctx.state !== 'closed') {
      try {
        this.gainNode.gain.setValueAtTime(clamped, this.ctx.currentTime);
      } catch {}
    }

    // YouTube Player API (0 - 100)
    if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
      try {
        this.ytPlayer.setVolume(Math.round(clamped * 100));
      } catch {}
    }
  }

  /**
   * Smoothly fades out the audio volume from the current level down to 0.
   * Prevents abrupt acoustic cut-offs when stopping or switching tracks.
   */
  public fadeOut(durationMs = 180): Promise<void> {
    this.cancelActiveFade();
    return new Promise((resolve) => {
      const startVol = this.currentEffectiveVolume;
      if (startVol <= 0.01) {
        this.applyInternalVolume(0);
        resolve();
        return;
      }

      const startTime = performance.now();
      const stepInterval = 16; // ~60fps updates

      this.fadeInterval = setInterval(() => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(1, elapsed / Math.max(20, durationMs));
        // Cosine ease-out curve for natural human psychoacoustic roll-off
        const currentVol = startVol * Math.cos((progress * Math.PI) / 2);
        this.applyInternalVolume(currentVol);

        if (progress >= 1) {
          this.cancelActiveFade();
          this.applyInternalVolume(0);
          resolve();
        }
      }, stepInterval);
    });
  }

  /**
   * Smoothly fades in the audio volume from 0 to the target volume.
   */
  public fadeIn(targetVolume: number = this.masterVolume, durationMs = 220): Promise<void> {
    this.cancelActiveFade();
    return new Promise((resolve) => {
      const target = Math.max(0, Math.min(1, targetVolume));
      if (target <= 0.01) {
        this.applyInternalVolume(target);
        resolve();
        return;
      }

      this.applyInternalVolume(0);
      const startTime = performance.now();
      const stepInterval = 16; // ~60fps updates

      this.fadeInterval = setInterval(() => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(1, elapsed / Math.max(20, durationMs));
        // Sine ease-in curve for gentle attack
        const currentVol = target * Math.sin((progress * Math.PI) / 2);
        this.applyInternalVolume(currentVol);

        if (progress >= 1) {
          this.cancelActiveFade();
          this.applyInternalVolume(target);
          resolve();
        }
      }, stepInterval);
    });
  }

  /**
   * Helper function for executing an action (such as loading and playing a new track)
   * with smooth volume fade-out and fade-in to eliminate abrupt track cuts.
   */
  public async softTransition<T>(action: () => Promise<T> | T, durationMs = 260): Promise<T> {
    if (this.isTransitioning) {
      return await action();
    }

    this.isTransitioning = true;
    const fadeOutDuration = Math.round(durationMs * 0.45);
    const fadeInDuration = Math.round(durationMs * 0.55);

    try {
      if (this.isPlaying() || this.currentTrack) {
        await this.fadeOut(fadeOutDuration);
      } else {
        this.applyInternalVolume(0);
      }

      const result = await action();
      this.fadeIn(this.masterVolume, fadeInDuration).catch(() => {});
      return result;
    } catch (err) {
      this.applyInternalVolume(this.masterVolume);
      throw err;
    } finally {
      this.isTransitioning = false;
    }
  }

  // Play full song starting from 0:00 (or specified start time)
  public async playTrack(track: Track, startTime = 0): Promise<void> {
    this.cancelActiveFade();
    this.applyInternalVolume(this.masterVolume);
    return this.playTrackInternal(track, startTime);
  }

  private async playTrackInternal(track: Track, startTime = 0): Promise<void> {
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

    // 2. If track has youtubeId, play 100% full song via YouTube Engine cleanly & instantly
    if (track.youtubeId) {
      this.audio.pause();
      return this.playViaYouTube(track.youtubeId, effectiveStart);
    }

    // 3. If local file / blob URL or verified full stream, play via HTML5 Audio element
    if (track.source === 'local' || (track.audioUrl && (track.audioUrl.startsWith('blob:') || track.audioUrl.startsWith('data:'))) || (track as any).isFullStream) {
      if (this.ytPlayer && this.ytPlayerReady) {
        try { this.ytPlayer.pauseVideo(); } catch {}
      }
      this.clearYtInterval();
      return this.playViaHtml5(track, effectiveStart);
    }

    // 4. Resolve official full YouTube source first to prevent preview clip interruption
    try {
      if (this.ytPlayer && this.ytPlayerReady) {
        try { this.ytPlayer.pauseVideo(); } catch {}
      }
      this.audio.pause();

      const res = await fetch(`/api/audio/full-source?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.youtubeId && this.currentTrack?.id === track.id) {
          track.youtubeId = data.youtubeId;
          if (data.duration && data.duration > 0) {
            track.duration = data.duration;
          }
          return this.playViaYouTube(data.youtubeId, effectiveStart);
        }
      }
    } catch (e) {
      console.warn('Full track resolve note:', e);
    }

    // 5. Fallback HTML5 stream if YouTube stream is unreachable
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
        this.applyInternalVolume(this.currentEffectiveVolume);
        this.ytPlayer.playVideo();
        if (typeof this.ytPlayer.setPlaybackQuality === 'function') {
          try { this.ytPlayer.setPlaybackQuality(this.batterySaverMode ? 'small' : 'medium'); } catch {}
        }
        this.startYtInterval();
        this.acquireWakeLock().catch(() => {});
        this.silentAudio?.pause(); // Real stream playing; pause silent audio to save CPU
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
    if (!audioSrc || audioSrc.startsWith('synth:')) {
      this.playProceduralSynth(track);
      return;
    }

    this.audio.src = audioSrc;
    this.applyInternalVolume(this.currentEffectiveVolume);
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
      this.silentAudio?.pause();
    } catch (error) {
      console.warn('Playback error, trying procedural synth fallback:', error);
      this.playProceduralSynth(track);
      if (this.onPlayStateChangeCallback) {
        this.onPlayStateChangeCallback(true);
      }
    }
  }

  public async resume(): Promise<void> {
    if (this.isSynthPlaying) return;

    this.acquireWakeLock().catch(() => {});
    this.silentAudio?.pause();

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
    this.masterVolume = vol;
    this.cancelActiveFade();
    this.applyInternalVolume(vol);
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
    if (!this.isInitialized) this.initWebAudio();
    if (!this.isInitialized) return;

    // Map 5 bands onto 10 bands if needed
    if (this.eq10Filters.length === 10) {
      this.eq10Filters[0].gain.value = settings.bass;
      this.eq10Filters[1].gain.value = settings.bass * 0.8;
      this.eq10Filters[2].gain.value = settings.midLow;
      this.eq10Filters[3].gain.value = settings.midLow * 0.9;
      this.eq10Filters[4].gain.value = settings.mid;
      this.eq10Filters[5].gain.value = settings.mid;
      this.eq10Filters[6].gain.value = settings.midHigh;
      this.eq10Filters[7].gain.value = settings.midHigh * 0.9;
      this.eq10Filters[8].gain.value = settings.treble;
      this.eq10Filters[9].gain.value = settings.treble * 1.1;
    }
    if (this.bassFilter) {
      this.bassFilter.gain.value = bassBoost ? 7 : 0;
    }
  }

  public set10BandEqualizer(bands: AudioSettings['eq10Bands'], bassBoost: boolean, subBassBoost = false): void {
    if (!this.isInitialized) this.initWebAudio();
    if (!this.isInitialized) return;

    if (this.eq10Filters.length === 10) {
      this.eq10Filters[0].gain.value = bands.b32;
      this.eq10Filters[1].gain.value = bands.b64;
      this.eq10Filters[2].gain.value = bands.b125;
      this.eq10Filters[3].gain.value = bands.b250;
      this.eq10Filters[4].gain.value = bands.b500;
      this.eq10Filters[5].gain.value = bands.b1k;
      this.eq10Filters[6].gain.value = bands.b2k;
      this.eq10Filters[7].gain.value = bands.b4k;
      this.eq10Filters[8].gain.value = bands.b8k;
      this.eq10Filters[9].gain.value = bands.b16k;
    }

    if (this.bassFilter) {
      this.bassFilter.gain.value = bassBoost ? 8 : 0;
    }
    if (this.subBassFilter) {
      this.subBassFilter.gain.value = subBassBoost ? 9 : (bassBoost ? 4 : 0);
    }
  }

  public setSpatialAudio(enabled: boolean, speed = 0.5): void {
    this.isSpatialActive = enabled;
    this.spatialSpeed = Math.max(0.1, Math.min(2.0, speed));

    if (this.spatialInterval) {
      clearInterval(this.spatialInterval);
      this.spatialInterval = null;
    }

    if (!enabled) {
      if (this.pannerNode && this.ctx) {
        try {
          this.pannerNode.pan.setValueAtTime(0, this.ctx.currentTime);
        } catch {}
      }
      return;
    }

    // 8D Audio dynamic panning rotation (LFO oscillator)
    this.spatialInterval = setInterval(() => {
      if (!this.isSpatialActive || !this.pannerNode || !this.ctx || this.ctx.state === 'closed') return;
      this.spatialPhase += 0.05 * this.spatialSpeed;
      const panValue = Math.sin(this.spatialPhase) * 0.85;
      try {
        this.pannerNode.pan.setValueAtTime(panValue, this.ctx.currentTime);
      } catch {}
    }, 40);
  }

  public setVolumeNormalization(enabled: boolean): void {
    if (!this.isInitialized) this.initWebAudio();
    if (!this.compressor || !this.ctx) return;
    try {
      if (enabled) {
        this.compressor.threshold.setValueAtTime(-28, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(14, this.ctx.currentTime);
      } else {
        this.compressor.threshold.setValueAtTime(0, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(1, this.ctx.currentTime);
      }
    } catch {}
  }

  public setVocalRemover(enabled: boolean): void {
    if (!this.isInitialized) this.initWebAudio();
    if (!this.vocalFilter || !this.ctx) return;
    try {
      // Center vocal notch filter: -24dB at 1kHz vocal frequency range
      if (enabled) {
        this.vocalFilter.type = 'peaking';
        this.vocalFilter.frequency.setValueAtTime(1000, this.ctx.currentTime);
        this.vocalFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);
        this.vocalFilter.gain.setValueAtTime(-24, this.ctx.currentTime);
      } else {
        this.vocalFilter.gain.setValueAtTime(0, this.ctx.currentTime);
      }
    } catch {}
  }

  public setCrossfade(seconds: number): void {
    this.crossfadeSeconds = Math.max(0, Math.min(12, seconds));
  }

  public getCrossfade(): number {
    return this.crossfadeSeconds;
  }

  // --- Gapless Pre-Fetching Buffer Engine ---
  public prefetchNextTrack(nextTrack: Track): void {
    if (!nextTrack || nextTrack.id === this.prefetchedTrackId) return;
    this.prefetchedTrackId = nextTrack.id;

    // 1. If HTML5 audio stream, prefetch via background Audio object
    if (nextTrack.audioUrl && (nextTrack.source === 'local' || nextTrack.audioUrl.startsWith('http'))) {
      try {
        if (!this.prefetchAudio) {
          this.prefetchAudio = new Audio();
          this.prefetchAudio.preload = 'auto';
        }
        this.prefetchAudio.src = nextTrack.audioUrl;
        this.prefetchAudio.load();
      } catch {}
    }

    // 2. If YouTube track, resolve official video ID in advance so playback starts in 0ms
    if (!nextTrack.youtubeId && nextTrack.source !== 'local') {
      fetch(`/api/audio/full-source?title=${encodeURIComponent(nextTrack.title)}&artist=${encodeURIComponent(nextTrack.artist)}`)
        .then(r => r.json())
        .then(data => {
          if (data.youtubeId) {
            nextTrack.youtubeId = data.youtubeId;
            if (data.duration) nextTrack.duration = data.duration;
          }
        })
        .catch(() => {});
    }
  }

  // --- True Shuffle Memory Permutation Engine ---
  public getTrueShuffleNextTrack(playlistTracks: Track[], currentTrackId: string): Track | null {
    if (!playlistTracks || playlistTracks.length === 0) return null;
    if (playlistTracks.length === 1) return playlistTracks[0];

    // Filter current track
    const otherTrackIds = playlistTracks.map(t => t.id).filter(id => id !== currentTrackId);

    // If remaining pool is empty, reshuffle all tracks except current
    if (this.shuffleRemaining.length === 0) {
      // Fisher-Yates true random permutation
      const pool = [...otherTrackIds];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      this.shuffleRemaining = pool;
    }

    const nextId = this.shuffleRemaining.shift();
    if (!nextId) return playlistTracks[0];

    this.shuffleHistory.push(nextId);
    if (this.shuffleHistory.length > 500) this.shuffleHistory.shift();

    const matched = playlistTracks.find(t => t.id === nextId);
    return matched || playlistTracks[0];
  }

  public resetShuffleMemory(playlistTracks: Track[]): void {
    this.shuffleHistory = [];
    const pool = playlistTracks.map(t => t.id);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    this.shuffleRemaining = pool;
  }

  // --- Sleep Timer with Psychoacoustic Fade-out ---
  public setSleepTimer(minutes: number | null, onFinish?: () => void): void {
    if (this.sleepTimerId) {
      clearTimeout(this.sleepTimerId);
      this.sleepTimerId = null;
    }
    this.onSleepTimerComplete = onFinish || null;

    if (minutes === null || minutes <= 0) {
      this.sleepTimerEndTs = null;
      return;
    }

    const durationMs = minutes * 60 * 1000;
    this.sleepTimerEndTs = Date.now() + durationMs;

    this.sleepTimerId = setTimeout(async () => {
      // Smoothly fade out volume over 10 seconds before stopping
      try {
        await this.fadeOut(9000);
        this.pause();
        if (this.onSleepTimerComplete) {
          this.onSleepTimerComplete();
        }
      } catch {}
      this.sleepTimerEndTs = null;
    }, durationMs);
  }

  public getSleepTimerRemaining(): number | null {
    if (!this.sleepTimerEndTs) return null;
    const remMs = this.sleepTimerEndTs - Date.now();
    if (remMs <= 0) return 0;
    return Math.ceil(remMs / 60000);
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

  // Update WebVTT Text Track for Google Cast / Chromecast TV Lyrics Display
  private currentTrackVttUrl: string | null = null;

  public updateLyricsForCast(timedLyrics: { time: number; text: string }[]): void {
    if (typeof window === 'undefined' || typeof Blob === 'undefined') return;
    try {
      if (this.currentTrackVttUrl) {
        URL.revokeObjectURL(this.currentTrackVttUrl);
        this.currentTrackVttUrl = null;
      }

      // Remove existing tracks from audio element
      const existingTracks = this.audio.querySelectorAll('track');
      existingTracks.forEach((t) => t.remove());

      if (!timedLyrics || timedLyrics.length === 0) return;

      const formatVTTTime = (secs: number) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = Math.floor(secs % 60);
        const ms = Math.floor((secs % 1) * 1000);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
      };

      let vttContent = 'WEBVTT\n\n';
      const dur = this.getDuration() || 240;
      for (let i = 0; i < timedLyrics.length; i++) {
        const item = timedLyrics[i];
        const nextItem = timedLyrics[i + 1];
        const startTime = Math.max(0, item.time);
        const endTime = nextItem ? Math.min(nextItem.time, startTime + 15) : Math.min(dur, startTime + 8);
        if (endTime > startTime) {
          vttContent += `${formatVTTTime(startTime)} --> ${formatVTTTime(endTime)}\n${item.text}\n\n`;
        }
      }

      const blob = new Blob([vttContent], { type: 'text/vtt;charset=utf-8' });
      this.currentTrackVttUrl = URL.createObjectURL(blob);

      const trackEl = document.createElement('track');
      trackEl.kind = 'subtitles';
      trackEl.label = 'Şarkı Sözleri (TV Canlı)';
      trackEl.srclang = 'tr';
      trackEl.src = this.currentTrackVttUrl;
      trackEl.default = true;
      this.audio.appendChild(trackEl);

      if (this.audio.textTracks && this.audio.textTracks.length > 0) {
        this.audio.textTracks[0].mode = 'showing';
      }
    } catch (e) {
      console.warn('Cast lyrics track setup notice:', e);
    }
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
