import { useEffect, useState, useRef, useMemo } from 'react';
import { Box, Typography, Paper, LinearProgress } from '@mui/material';
import { useSimulationStore, usePlatformStore, useSensorStore, useEnvironmentStore } from '../../store';
import { getDepthAtPosition } from '../../utils/bathymetryGenerator';

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
  const bathymetry = useEnvironmentStore((state) => state.environment.bathymetry);

  // Depth metrics: real (bathymetry), sonar-calculated (depth from surface), depth from platform, margin of error
  const depthMetrics = useMemo(() => {
    const realDepth = getDepthAtPosition(
      bathymetry,
      platform.position.x,
      platform.position.y
    );
    const depthFromPlatform = realDepth - platform.depth; // distance from platform down to seabed, m
    const simulatedErrorM = 0.02 * realDepth + 0.1; // 2% of depth + 0.1 m (deterministic from position)
    const errorSign = (Math.floor(platform.position.x / 50) + Math.floor(platform.position.y / 50)) % 2 === 0 ? 1 : -1;
    const sonarCalculatedDepth = realDepth + errorSign * simulatedErrorM * 0.5; // sonar estimate of seabed depth from surface
    const marginOfError = Math.abs(sonarCalculatedDepth - realDepth);
    return {
      realDepth,
      sonarCalculatedDepth,
      depthFromPlatform,
      marginOfError,
    };
  }, [
    bathymetry,
    platform.position.x,
    platform.position.y,
    platform.depth,
  ]);

  const [fps, setFps] = useState(0);
  const lastFrameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(Date.now());

  // FPS: sample frame count every second (don't depend on frameCount to avoid effect running 60/sec)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const state = useSimulationStore.getState().simulation;
      const elapsed = (now - lastFpsTimeRef.current) / 1000;
      if (elapsed >= 0.5) {
        const frames = state.frameCount - lastFrameCountRef.current;
        setFps(Math.round(frames / elapsed));
        lastFrameCountRef.current = state.frameCount;
        lastFpsTimeRef.current = now;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
          label="Depth (platform)"
          value={platform.depth.toFixed(1)}
          unit="m"
          color="#ff7043"
          progress={(platform.depth / platform.config.maxDepth) * 100}
        />

        <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.06)', mt: 1, pt: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Sonar / bathymetry
          </Typography>
          <Metric
            label="Calculated depth (from surface)"
            value={depthMetrics.sonarCalculatedDepth.toFixed(2)}
            unit="m"
            color="#81d4fa"
          />
          <Metric
            label="Real depth (bathymetry)"
            value={depthMetrics.realDepth.toFixed(2)}
            unit="m"
            color="#4fc3f7"
          />
          <Metric
            label="Depth from platform"
            value={depthMetrics.depthFromPlatform.toFixed(2)}
            unit="m"
            color={depthMetrics.depthFromPlatform >= 0 ? '#81c784' : '#f44336'}
          />
          <Metric
            label="Margin of error"
            value={depthMetrics.marginOfError.toFixed(2)}
            unit="m"
            color="#ffb74d"
          />
        </Box>

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

