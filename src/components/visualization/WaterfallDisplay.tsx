import { useRef, useEffect, useCallback } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import type { SensorReading } from '../../types';

interface WaterfallDisplayProps {
  readings: SensorReading[];
  maxRange: number;
  width?: number;
  height?: number;
  historyLength?: number;
}

export function WaterfallDisplay({
  readings,
  maxRange,
  width = 400,
  height = 200,
  historyLength = 100,
}: WaterfallDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<Float32Array[]>([]);

  // Color scale for waterfall
  const getWaterfallColor = (intensity: number): [number, number, number] => {
    // Blue-to-red thermal colormap
    const t = Math.max(0, Math.min(1, intensity));
    
    if (t < 0.25) {
      // Black to blue
      return [0, 0, Math.floor(t * 4 * 255)];
    } else if (t < 0.5) {
      // Blue to cyan
      return [0, Math.floor((t - 0.25) * 4 * 255), 255];
    } else if (t < 0.75) {
      // Cyan to yellow
      const s = (t - 0.5) * 4;
      return [Math.floor(s * 255), 255, Math.floor((1 - s) * 255)];
    } else {
      // Yellow to red
      const s = (t - 0.75) * 4;
      return [255, Math.floor((1 - s) * 255), 0];
    }
  };

  const processReadings = useCallback((
    readings: SensorReading[],
    numBins: number
  ): Float32Array => {
    const bins = new Float32Array(numBins);
    
    readings.forEach((reading) => {
      const binIndex = Math.floor((reading.range / maxRange) * numBins);
      if (binIndex >= 0 && binIndex < numBins) {
        // Normalize intensity to 0-1
        const normalized = Math.max(0, Math.min(1, (reading.intensity + 100) / 200));
        bins[binIndex] = Math.max(bins[binIndex], normalized);
      }
    });

    return bins;
  }, [maxRange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Process current readings into bins
    const numBins = width;
    const currentLine = processReadings(readings, numBins);

    // Add to history
    historyRef.current.unshift(currentLine);
    if (historyRef.current.length > historyLength) {
      historyRef.current.pop();
    }

    // Clear canvas
    ctx.fillStyle = '#000810';
    ctx.fillRect(0, 0, width, height);

    // Draw waterfall
    const lineHeight = height / historyLength;
    const imageData = ctx.createImageData(width, height);

    historyRef.current.forEach((line, lineIndex) => {
      const y = Math.floor(lineIndex * lineHeight);
      const yEnd = Math.floor((lineIndex + 1) * lineHeight);

      for (let x = 0; x < width; x++) {
        const intensity = line[x] || 0;
        const [r, g, b] = getWaterfallColor(intensity);

        for (let dy = y; dy < yEnd && dy < height; dy++) {
          const pixelIndex = (dy * width + x) * 4;
          imageData.data[pixelIndex] = r;
          imageData.data[pixelIndex + 1] = g;
          imageData.data[pixelIndex + 2] = b;
          imageData.data[pixelIndex + 3] = 255;
        }
      }
    });

    ctx.putImageData(imageData, 0, 0);

    // Draw range scale
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '10px monospace';

    for (let i = 0; i <= 4; i++) {
      const x = (i / 4) * width;
      const range = ((i / 4) * maxRange / 1000).toFixed(1);
      
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 5);
      ctx.stroke();
      
      if (i < 4) {
        ctx.fillText(`${range}km`, x + 2, 15);
      }
    }

    // Time axis label
    ctx.fillText('← Time', 5, height - 5);
    ctx.fillText('Range →', width - 50, height - 5);

  }, [readings, width, height, historyLength, processReadings]);

  return (
    <Paper
      sx={{
        p: 1,
        backgroundColor: '#000810',
        border: '1px solid #1a3a5a',
        borderRadius: 1,
      }}
    >
      <Typography
        variant="caption"
        sx={{ color: '#4fc3f7', display: 'block', mb: 0.5 }}
      >
        Waterfall Display
      </Typography>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          display: 'block',
          borderRadius: '4px',
          border: '1px solid #1a3a5a',
        }}
      />
      
      {/* Color scale legend */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          mt: 0.5,
          gap: 1,
        }}
      >
        <Typography variant="caption" sx={{ color: '#666', fontSize: '0.65rem' }}>
          Low
        </Typography>
        <Box
          sx={{
            flex: 1,
            height: 8,
            borderRadius: 0.5,
            background: 'linear-gradient(90deg, #000033, #0066ff, #00ffff, #ffff00, #ff0000)',
          }}
        />
        <Typography variant="caption" sx={{ color: '#666', fontSize: '0.65rem' }}>
          High
        </Typography>
      </Box>
    </Paper>
  );
}



