import { Track } from '../types';
import { LyricsResponse } from './lyricsService';

export interface TVCastFrameData {
  track: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  lyricsData: LyricsResponse | null;
  activeLineIndex: number;
  timedLyrics: { time: number; text: string }[];
}

export class TVCastStreamEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private animationFrameId: number | null = null;
  private stream: MediaStream | null = null;
  private isStreaming = false;
  private coverImageCache: HTMLImageElement | null = null;
  private currentCoverUrl = '';

  constructor() {
    if (typeof document !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 1280;
      this.canvas.height = 720;
      this.ctx = this.canvas.getContext('2d');

      this.videoEl = document.createElement('video');
      this.videoEl.muted = true; // Muted locally so audio comes from main player or cast
      this.videoEl.playsInline = true;
      this.videoEl.setAttribute('playsinline', 'true');
      this.videoEl.setAttribute('webkit-playsinline', 'true');
      this.videoEl.style.position = 'fixed';
      this.videoEl.style.bottom = '-9999px';
      this.videoEl.style.left = '-9999px';
      this.videoEl.style.width = '1px';
      this.videoEl.style.height = '1px';
      this.videoEl.style.opacity = '0';
      this.videoEl.style.pointerEvents = 'none';
      document.body.appendChild(this.videoEl);
    }
  }

  public getMediaStream(): MediaStream | null {
    if (!this.canvas) return null;
    if (!this.stream) {
      try {
        this.stream = (this.canvas as any).captureStream(30);
        if (this.videoEl) {
          this.videoEl.srcObject = this.stream;
          this.videoEl.play().catch(() => {});
        }
      } catch (err) {
        console.warn('captureStream init notice:', err);
      }
    }
    return this.stream;
  }

  public getVideoElement(): HTMLVideoElement | null {
    return this.videoEl;
  }

  public startRenderLoop(getData: () => TVCastFrameData) {
    this.isStreaming = true;
    this.getMediaStream();

    const render = () => {
      if (!this.isStreaming || !this.ctx || !this.canvas) return;

      const data = getData();
      this.drawFrame(data);
      this.animationFrameId = requestAnimationFrame(render);
    };

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.animationFrameId = requestAnimationFrame(render);
  }

  public stopRenderLoop() {
    this.isStreaming = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private drawFrame(data: TVCastFrameData) {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    const track = data.track;
    const currentTime = data.currentTime;
    const duration = data.duration || 1;
    const timedLyrics = data.timedLyrics || [];
    const activeIdx = data.activeLineIndex;

    // 1. Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#051b14');
    bgGrad.addColorStop(0.5, '#020617');
    bgGrad.addColorStop(1, '#090a0f');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle ambient glow
    const glowGrad = ctx.createRadialGradient(w * 0.25, h * 0.45, 20, w * 0.25, h * 0.45, 450);
    glowGrad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
    glowGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Top Header Bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(0, 0, w, 70);

    ctx.fillStyle = '#10b981';
    ctx.font = '900 24px system-ui, sans-serif';
    ctx.fillText('SOUNDPULSE TV', 40, 45);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 16px system-ui, sans-serif';
    ctx.fillText('CANLI KARAOKE & SÖZLER', 240, 44);

    if (data.isPlaying) {
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(w - 50, 35, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText('CANLI YAYIN', w - 160, 41);
    }

    if (!track) {
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 32px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SoundPulse TV - Şarkı Seçiniz', w / 2, h / 2);
      ctx.textAlign = 'left';
      return;
    }

    // 3. Left Side: Album Artwork & Track Info
    const artX = 50;
    const artY = 110;
    const artSize = 300;

    // Load and cache artwork image
    if (track.coverUrl && track.coverUrl !== this.currentCoverUrl) {
      this.currentCoverUrl = track.coverUrl;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = track.coverUrl;
      img.onload = () => {
        this.coverImageCache = img;
      };
    }

    // Draw artwork
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(artX, artY, artSize, artSize, 20);
    ctx.clip();
    if (this.coverImageCache && this.coverImageCache.complete) {
      try {
        ctx.drawImage(this.coverImageCache, artX, artY, artSize, artSize);
      } catch {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(artX, artY, artSize, artSize);
      }
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(artX, artY, artSize, artSize);
    }
    ctx.restore();

    // Track Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 28px system-ui, sans-serif';
    const titleText = track.title.length > 24 ? track.title.slice(0, 22) + '...' : track.title;
    ctx.fillText(titleText, artX, artY + artSize + 45);

    // Track Artist
    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 20px system-ui, sans-serif';
    const artistText = (track.artist || '').length > 28 ? (track.artist || '').slice(0, 26) + '...' : (track.artist || '');
    ctx.fillText(artistText, artX, artY + artSize + 75);

    // Progress Bar
    const progY = artY + artSize + 110;
    const progW = artSize;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.roundRect(artX, progY, progW, 8, 4);
    ctx.fill();

    const progress = Math.min(1, Math.max(0, currentTime / duration));
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.roundRect(artX, progY, progW * progress, 8, 4);
    ctx.fill();

    // Time text
    const formatSec = (s: number) => {
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return `${m}:${sec.toString().padStart(2, '0')}`;
    };
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 14px monospace';
    ctx.fillText(formatSec(currentTime), artX, progY + 28);
    ctx.fillText(formatSec(duration), artX + progW - 40, progY + 28);

    // 4. Right Side: Big Synced Karaoke Lyrics (x = 420 to 1230)
    const lyricsBoxX = 410;
    const lyricsBoxY = 100;
    const lyricsBoxW = w - lyricsBoxX - 40;
    const lyricsBoxH = 580;

    // Draw lyrics box container
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.roundRect(lyricsBoxX, lyricsBoxY, lyricsBoxW, lyricsBoxH, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Render 5 Lyric Lines (2 previous, 1 active, 2 next)
    const lineSpacing = 78;
    const centerY = lyricsBoxY + lyricsBoxH / 2 - 20;

    for (let offset = -2; offset <= 3; offset++) {
      const idx = activeIdx + offset;
      const targetY = centerY + offset * lineSpacing;

      if (idx < 0 || idx >= timedLyrics.length) continue;
      const line = timedLyrics[idx];

      if (offset === 0) {
        // ACTIVE LINE (Big, Glowing, Highlighted)
        ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
        ctx.beginPath();
        ctx.roundRect(lyricsBoxX + 20, targetY - 42, lyricsBoxW - 40, 64, 16);
        ctx.fill();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.shadowColor = 'rgba(52, 211, 153, 0.8)';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 36px system-ui, sans-serif';
        ctx.fillText(`🔥 ${line.text}`, lyricsBoxX + 40, targetY);
        ctx.shadowBlur = 0;
      } else if (offset < 0) {
        // PASSED LINES
        ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.font = 'bold 24px system-ui, sans-serif';
        ctx.fillText(line.text, lyricsBoxX + 50, targetY);
      } else {
        // UPCOMING LINES
        ctx.fillStyle = offset === 1 ? 'rgba(226, 232, 240, 0.8)' : 'rgba(148, 163, 184, 0.4)';
        ctx.font = offset === 1 ? 'bold 26px system-ui, sans-serif' : 'bold 22px system-ui, sans-serif';
        ctx.fillText(line.text, lyricsBoxX + 50, targetY);
      }
    }
  }

  public async triggerPictureInPicture(): Promise<boolean> {
    if (!this.videoEl) return false;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return false;
      } else if (this.videoEl.requestPictureInPicture) {
        await this.videoEl.play();
        await this.videoEl.requestPictureInPicture();
        return true;
      }
    } catch (e) {
      console.warn('PiP notice:', e);
    }
    return false;
  }

  public async triggerRemoteCastPrompt(): Promise<boolean> {
    if (!this.videoEl) return false;
    try {
      if ('remote' in this.videoEl && (this.videoEl as any).remote) {
        await (this.videoEl as any).remote.prompt();
        return true;
      }
    } catch (e) {
      console.warn('Remote cast notice:', e);
    }
    return false;
  }
}

export const tvCastStreamEngine = new TVCastStreamEngine();
