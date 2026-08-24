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

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const freqData = audioEngine.getVisualizerData();

      if (type === 'bars') {
        const barCount = 32;
        const barWidth = (width / barCount) * 0.7;
        const gap = (width / barCount) * 0.3;

        for (let i = 0; i < barCount; i++) {
          let value = 0;
          if (isPlaying && freqData && freqData.length > 0) {
            const index = Math.floor((i / barCount) * (freqData.length * 0.6));
            value = freqData[index] / 255;
          } else if (isPlaying) {
            // Simulated bounce if web audio context is unattached
            value = (Math.sin(phase + i * 0.4) + 1) * 0.4 + 0.1;
          } else {
            value = 0.05;
          }

          const barHeight = Math.max(3, value * height);
          const x = i * (barWidth + gap);
          const y = height - barHeight;

          // Gradient bar
          const grad = ctx.createLinearGradient(0, y, 0, height);
          grad.addColorStop(0, '#22c55e');
          grad.addColorStop(1, '#15803d');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
          ctx.fill();
        }
      } else {
        // Waveform
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = color;
        ctx.beginPath();

        const sliceWidth = width / 40;
        let x = 0;

        for (let i = 0; i <= 40; i++) {
          let v = 0.5;
          if (isPlaying) {
            v = 0.5 + Math.sin(phase + i * 0.3) * 0.35 * (Math.random() * 0.3 + 0.7);
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
        phase += 0.12;
        animationFrameRef.current = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
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
