import { useEffect, useState, useRef } from 'react';
import { Box, Typography, Paper, LinearProgress } from '@mui/material';
import { useSimulationStore, usePlatformStore, useSensorStore } from '../../store';

interface MetricProps {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  progress?: number;
}

function Metric({ label, value, unit, color = '#4fc3f7', progress }: MetricProps) {
  return (
    <Box sx={{ mb: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color, fontFamily: 'monospace', fontWeight: 600 }}
        >
          {value}
          {unit && (
            <Typography component="span" sx={{ fontSize: '0.65rem', ml: 0.5, opacity: 0.7 }}>
              {unit}
            </Typography>
          )}
        </Typography>
      </Box>
      {progress !== undefined && (
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 3,
            borderRadius: 1,
            backgroundColor: 'rgba(255,255,255,0.1)',
            '& .MuiLinearProgress-bar': {
              backgroundColor: color,
            },
          }}
        />
      )}
    </Box>
  );
}

export function SimulationMetrics() {
  const simulation = useSimulationStore((state) => state.simulation);
  const platform = usePlatformStore((state) => state.platform);
  const detections = useSensorStore((state) => state.detections);

  const [fps, setFps] = useState(0);
  const lastFrameTimeRef = useRef(Date.now());
  const frameCountRef = useRef(0);

  // Calculate FPS
  useEffect(() => {
    const now = Date.now();
    const delta = now - lastFrameTimeRef.current;
    frameCountRef.current += 1;

    if (delta >= 1000) {
      setFps(Math.round((frameCountRef.current * 1000) / delta));
      frameCountRef.current = 0;
      lastFrameTimeRef.current = now;
    }
  }, [simulation.frameCount]);

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Paper
      sx={{
        p: 1.5,
        backgroundColor: 'rgba(10, 20, 40, 0.9)',
        border: '1px solid #1a3a5a',
        borderRadius: 1,
        minWidth: 200,
      }}
    >
      <Typography
        variant="caption"
        sx={{ color: '#81d4fa', fontWeight: 600, display: 'block', mb: 1.5 }}
      >
        Simulation Status
      </Typography>

      {/* Status Indicator */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: simulation.isRunning
              ? simulation.isPaused
                ? '#ffb74d'
                : '#4caf50'
              : '#666',
            boxShadow: simulation.isRunning
              ? `0 0 10px ${simulation.isPaused ? '#ffb74d' : '#4caf50'}`
              : 'none',
            animation: simulation.isRunning && !simulation.isPaused
              ? 'pulse 1s infinite'
              : 'none',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.5 },
            },
          }}
        />
        <Typography variant="body2" sx={{ color: '#fff' }}>
          {simulation.isRunning
            ? simulation.isPaused
              ? 'Paused'
              : 'Running'
            : 'Stopped'}
        </Typography>
      </Box>

      <Metric
        label="Simulation Time"
        value={formatTime(simulation.time)}
        color="#4fc3f7"
      />

      <Metric
        label="Time Step"
        value={simulation.timeStep * 1000}
        unit="ms"
        color="#90caf9"
      />

      <Metric
        label="Speed"
        value={`${simulation.speed}x`}
        color="#81d4fa"
      />

      <Metric
        label="FPS"
        value={fps}
        color={fps > 30 ? '#81c784' : fps > 15 ? '#ffb74d' : '#f44336'}
        progress={(fps / 60) * 100}
      />

      <Metric
        label="Frame Count"
        value={simulation.frameCount.toLocaleString()}
        color="#90caf9"
      />

      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', my: 1.5, pt: 1.5 }}>
        <Typography
          variant="caption"
          sx={{ color: '#81d4fa', fontWeight: 600, display: 'block', mb: 1 }}
        >
          Platform
        </Typography>

        <Metric
          label="Depth"
          value={platform.depth.toFixed(1)}
          unit="m"
          color="#ff7043"
          progress={(platform.depth / platform.config.maxDepth) * 100}
        />

        <Metric
          label="Speed"
          value={platform.speed.toFixed(1)}
          unit="m/s"
          color="#81c784"
          progress={(Math.abs(platform.speed) / platform.config.maxSpeed) * 100}
        />

        <Metric
          label="Heading"
          value={platform.heading.toFixed(0)}
          unit="°"
          color="#4fc3f7"
        />
      </Box>

      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', my: 1.5, pt: 1.5 }}>
        <Typography
          variant="caption"
          sx={{ color: '#81d4fa', fontWeight: 600, display: 'block', mb: 1 }}
        >
          Detections
        </Typography>

        <Metric
          label="Active Detections"
          value={detections.length}
          color={detections.length > 0 ? '#ffeb3b' : '#666'}
        />
      </Box>
    </Paper>
  );
}

