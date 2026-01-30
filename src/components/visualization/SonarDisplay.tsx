import { useRef, useEffect, useMemo } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import type { SensorReading, Detection } from '../../types';

interface SonarDisplayProps {
  type: 'ppi' | 'bscan';
  readings: SensorReading[];
  detections: Detection[];
  maxRange: number;
  heading: number;
  width?: number;
  height?: number;
}

export function SonarDisplay({
  type,
  readings,
  detections,
  maxRange,
  heading,
  width = 300,
  height = 300,
}: SonarDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Color scale for intensity
  const getColor = (intensity: number, alpha: number = 1): string => {
    // Green phosphor style
    const normalized = Math.max(0, Math.min(1, intensity / 255));
    const g = Math.floor(50 + normalized * 205);
    const r = Math.floor(normalized * 100);
    return `rgba(${r}, ${g}, 50, ${alpha})`;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#001a0d';
    ctx.fillRect(0, 0, width, height);

    if (type === 'ppi') {
      drawPPI(ctx, readings, detections, maxRange, heading, width, height);
    } else {
      drawBScan(ctx, readings, maxRange, width, height);
    }
  }, [readings, detections, maxRange, heading, width, height, type]);

  const drawPPI = (
    ctx: CanvasRenderingContext2D,
    readings: SensorReading[],
    detections: Detection[],
    maxRange: number,
    heading: number,
    width: number,
    height: number
  ) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 10;

    // Draw range rings
    ctx.strokeStyle = 'rgba(0, 100, 50, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      const r = (radius * i) / 4;
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.stroke();

      // Range label
      ctx.fillStyle = 'rgba(0, 150, 75, 0.7)';
      ctx.font = '10px monospace';
      ctx.fillText(
        `${((maxRange * i) / 4 / 1000).toFixed(1)}km`,
        centerX + 5,
        centerY - r + 12
      );
    }

    // Draw bearing lines
    for (let i = 0; i < 12; i++) {
      const angle = ((i * 30 - 90) * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius
      );
      ctx.stroke();

      // Bearing label
      const labelAngle = i * 30;
      ctx.fillText(
        `${labelAngle}°`,
        centerX + Math.cos(angle) * (radius + 15) - 10,
        centerY + Math.sin(angle) * (radius + 15) + 3
      );
    }

    // Draw heading indicator
    const headingRad = ((heading - 90) * Math.PI) / 180;
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + Math.cos(headingRad) * radius * 0.9,
      centerY + Math.sin(headingRad) * radius * 0.9
    );
    ctx.stroke();

    // Draw readings as dots
    readings.forEach((reading) => {
      const r = (reading.range / maxRange) * radius;
      const angle = ((reading.bearing - 90) * Math.PI) / 180;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;

      // Intensity-based size and color
      const normalized = Math.max(0, Math.min(1, (reading.intensity + 100) / 200));
      const size = 2 + normalized * 4;

      ctx.fillStyle = getColor(normalized * 255, 0.6);
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw detections
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    detections.forEach((detection) => {
      const r = (detection.range / maxRange) * radius;
      const angle = ((detection.bearing - 90) * Math.PI) / 180;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;

      // Draw target marker
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x - 10, y);
      ctx.lineTo(x + 10, y);
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x, y + 10);
      ctx.stroke();
    });

    // Center marker (own ship)
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawBScan = (
    ctx: CanvasRenderingContext2D,
    readings: SensorReading[],
    maxRange: number,
    width: number,
    height: number
  ) => {
    // B-Scan: Bearing on X-axis, Range on Y-axis
    const margin = 30;
    const plotWidth = width - margin * 2;
    const plotHeight = height - margin * 2;

    // Axis labels
    ctx.fillStyle = 'rgba(0, 150, 75, 0.7)';
    ctx.font = '10px monospace';
    ctx.fillText('Bearing (°)', width / 2 - 25, height - 5);
    ctx.save();
    ctx.translate(10, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Range (m)', -25, 0);
    ctx.restore();

    // Draw grid
    ctx.strokeStyle = 'rgba(0, 100, 50, 0.3)';
    ctx.lineWidth = 1;

    // Vertical lines (bearing)
    for (let b = 0; b <= 360; b += 30) {
      const x = margin + (b / 360) * plotWidth;
      ctx.beginPath();
      ctx.moveTo(x, margin);
      ctx.lineTo(x, height - margin);
      ctx.stroke();
      ctx.fillText(`${b}`, x - 8, height - margin + 12);
    }

    // Horizontal lines (range)
    for (let r = 0; r <= 4; r++) {
      const y = margin + (r / 4) * plotHeight;
      const rangeLabel = ((maxRange * r) / 4).toFixed(0);
      ctx.beginPath();
      ctx.moveTo(margin, y);
      ctx.lineTo(width - margin, y);
      ctx.stroke();
      ctx.fillText(rangeLabel, 5, y + 3);
    }

    // Draw readings
    readings.forEach((reading) => {
      const x = margin + ((reading.bearing % 360) / 360) * plotWidth;
      const y = margin + (reading.range / maxRange) * plotHeight;

      const normalized = Math.max(0, Math.min(1, (reading.intensity + 100) / 200));
      ctx.fillStyle = getColor(normalized * 255, 0.7);
      ctx.fillRect(x - 2, y - 2, 4, 4);
    });
  };

  return (
    <Paper
      sx={{
        p: 1,
        backgroundColor: '#001a0d',
        border: '1px solid #004d26',
        borderRadius: 1,
      }}
    >
      <Typography
        variant="caption"
        sx={{ color: '#00aa55', display: 'block', mb: 0.5 }}
      >
        {type === 'ppi' ? 'PPI Display' : 'B-Scan Display'}
      </Typography>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          display: 'block',
          borderRadius: type === 'ppi' ? '50%' : '4px',
          border: '1px solid #004d26',
        }}
      />
    </Paper>
  );
}



