import {
  Box,
  IconButton,
  Typography,
  ButtonGroup,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Replay as ReplayIcon,
  Speed as SpeedIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useSimulationStore } from '../../store';
import { useDataExport } from '../../hooks/useDataExport';
import type { SimulationSpeed } from '../../types';

const SPEED_OPTIONS: SimulationSpeed[] = [0.25, 0.5, 1, 2, 4, 10];

export function SimulationControls() {
  const simulation = useSimulationStore((state) => state.simulation);
  const start = useSimulationStore((state) => state.start);
  const pause = useSimulationStore((state) => state.pause);
  const resume = useSimulationStore((state) => state.resume);
  const stop = useSimulationStore((state) => state.stop);
  const reset = useSimulationStore((state) => state.reset);
  const setSpeed = useSimulationStore((state) => state.setSpeed);
  const { exportToJSON, exportToCSV } = useDataExport();

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (!simulation.isRunning) {
      start();
    } else if (simulation.isPaused) {
      resume();
    } else {
      pause();
    }
  };

  const handleStop = () => {
    stop();
  };

  const handleReset = () => {
    reset();
  };

  const cycleSpeed = () => {
    const currentIndex = SPEED_OPTIONS.indexOf(simulation.speed);
    const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length;
    setSpeed(SPEED_OPTIONS[nextIndex]);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {/* Time Display */}
      <Chip
        label={`T: ${formatTime(simulation.time)}`}
        size="small"
        sx={{
          fontFamily: 'monospace',
          fontSize: '0.9rem',
          backgroundColor: 'rgba(79, 195, 247, 0.15)',
          color: '#4fc3f7',
          border: '1px solid rgba(79, 195, 247, 0.3)',
        }}
      />

      {/* Speed Indicator */}
      <Tooltip title="Click to cycle speed">
        <Chip
          icon={<SpeedIcon sx={{ fontSize: 16 }} />}
          label={`${simulation.speed}x`}
          size="small"
          onClick={cycleSpeed}
          sx={{
            cursor: 'pointer',
            fontFamily: 'monospace',
            backgroundColor: 'rgba(129, 212, 250, 0.15)',
            color: '#81d4fa',
            border: '1px solid rgba(129, 212, 250, 0.3)',
            '&:hover': {
              backgroundColor: 'rgba(129, 212, 250, 0.25)',
            },
          }}
        />
      </Tooltip>

      {/* Control Buttons */}
      <ButtonGroup size="small" sx={{ '& .MuiIconButton-root': { borderRadius: 1 } }}>
        <Tooltip title={simulation.isRunning && !simulation.isPaused ? 'Pause' : 'Play'}>
          <IconButton
            onClick={handlePlayPause}
            sx={{
              color: simulation.isRunning && !simulation.isPaused ? '#ffb74d' : '#4caf50',
              '&:hover': {
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
              },
            }}
          >
            {simulation.isRunning && !simulation.isPaused ? <PauseIcon /> : <PlayIcon />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Stop">
          <span>
            <IconButton
              onClick={handleStop}
              disabled={!simulation.isRunning}
              sx={{
                color: '#f44336',
                '&:hover': {
                  backgroundColor: 'rgba(244, 67, 54, 0.1)',
                },
                '&.Mui-disabled': {
                  color: 'rgba(255,255,255,0.3)',
                },
              }}
            >
              <StopIcon />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Reset">
          <IconButton
            onClick={handleReset}
            sx={{
              color: '#90caf9',
              '&:hover': {
                backgroundColor: 'rgba(144, 202, 249, 0.1)',
              },
            }}
          >
            <ReplayIcon />
          </IconButton>
        </Tooltip>
      </ButtonGroup>

      {/* Export Button */}
      <Tooltip title="Export Data">
        <IconButton
          onClick={() => exportToJSON({ includeSensorReadings: true })}
          sx={{
            color: '#81d4fa',
            '&:hover': {
              backgroundColor: 'rgba(129, 212, 250, 0.1)',
            },
          }}
        >
          <DownloadIcon />
        </IconButton>
      </Tooltip>

      {/* Status Indicator */}
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: simulation.isRunning
            ? simulation.isPaused
              ? '#ffb74d'
              : '#4caf50'
            : '#666',
          boxShadow: simulation.isRunning
            ? `0 0 8px ${simulation.isPaused ? '#ffb74d' : '#4caf50'}`
            : 'none',
        }}
      />
    </Box>
  );
}

