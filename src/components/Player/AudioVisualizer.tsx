import React, { useEffect, useRef, memo } from 'react';
import { audioEngine } from '../../services/audioEngine';

interface AudioVisualizerProps {
  isPlaying: boolean;
  color?: string;
  type?: 'bars' | 'wave';
  className?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = memo(({
  isPlaying,
  color = '#1ed760',
  type = 'bars',
  className = 'w-full h-12'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    let lastRenderTime = 0;
    const fpsInterval = 1000 / 25; // 25 FPS throttle to prevent GPU thermal throttling & battery drain

    // Pre-create shared gradient once per canvas dimensions to prevent 3,000+ GC object allocations/sec
    let cachedGrad: CanvasGradient | null = null;
    let lastHeight = 0;

    const getGradient = (h: number) => {
      if (!cachedGrad || lastHeight !== h) {
        cachedGrad = ctx.createLinearGradient(0, 0, 0, h);
        cachedGrad.addColorStop(0, '#22c55e');
        cachedGrad.addColorStop(1, '#15803d');
        lastHeight = h;
      }
      return cachedGrad;
    };

    const render = (currentTime: number) => {
      // Completely sleep and DO NOT schedule requestAnimationFrame when phone is locked / screen is off
      if (typeof document !== 'undefined' && document.hidden) {
        animationFrameRef.current = null;
        return;
      }

      if (!isPlaying) {
        // Draw one static baseline frame then sleep
        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        const barCount = 20;
        const barWidth = (width / barCount) * 0.7;
        const gap = (width / barCount) * 0.3;
        for (let i = 0; i < barCount; i++) {
          const x = i * (barWidth + gap);
          ctx.beginPath();
          ctx.roundRect(x, height - 3, barWidth, 3, [1, 1, 0, 0]);
          ctx.fill();
        }
        animationFrameRef.current = null;
        return;
      }

      const elapsed = currentTime - lastRenderTime;
      if (elapsed < fpsInterval) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }
      lastRenderTime = currentTime - (elapsed % fpsInterval);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const freqData = audioEngine.getVisualizerData();

      if (type === 'bars') {
        const barCount = 20; // Lower count saves canvas draw calls and thermal load
        const barWidth = (width / barCount) * 0.7;
        const gap = (width / barCount) * 0.3;
        const barGrad = getGradient(height);
        ctx.fillStyle = barGrad;

        for (let i = 0; i < barCount; i++) {
          let value = 0;
          if (isPlaying && freqData && freqData.length > 0) {
            const index = Math.floor((i / barCount) * (freqData.length * 0.6));
            value = freqData[index] / 255;
          } else if (isPlaying) {
            value = (Math.sin(phase + i * 0.4) + 1) * 0.4 + 0.1;
          } else {
            value = 0.05;
          }

          const barHeight = Math.max(3, value * height);
          const x = i * (barWidth + gap);
          const y = height - barHeight;

          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
          ctx.fill();
        }
      } else {
        // Waveform
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.beginPath();

        const sliceWidth = width / 30;
        let x = 0;

        for (let i = 0; i <= 30; i++) {
          let v = 0.5;
          if (isPlaying) {
            v = 0.5 + Math.sin(phase + i * 0.3) * 0.35 * (Math.random() * 0.2 + 0.8);
          }
          const y = v * height;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.stroke();
      }

      if (isPlaying) {
        phase += 0.15;
        animationFrameRef.current = requestAnimationFrame(render);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      } else if (isPlaying && !animationFrameRef.current) {
        animationFrameRef.current = requestAnimationFrame(render);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (isPlaying && !document.hidden) {
      animationFrameRef.current = requestAnimationFrame(render);
    } else {
      render(0);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, color, type]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={48}
      className={className}
    />
  );
});

AudioVisualizer.displayName = 'AudioVisualizer';
