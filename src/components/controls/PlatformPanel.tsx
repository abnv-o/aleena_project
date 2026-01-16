import {
  Box,
  Typography,
  Slider,
  Chip,
  Divider,
  Paper,
} from '@mui/material';
import {
  Navigation as NavigationIcon,
  Speed as SpeedIcon,
  Height as DepthIcon,
} from '@mui/icons-material';
import { usePlatformStore } from '../../store';

export function PlatformPanel() {
  const { platform, controls, setControls, setDepth, setHeading } = usePlatformStore();

  const handleControlChange = (control: 'throttle' | 'rudder' | 'dive', value: number) => {
    setControls({ [control]: value });
  };

  const ControlSlider = ({
    label,
    value,
    onChange,
    icon,
    leftLabel,
    rightLabel,
    color = '#4fc3f7',
  }: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    icon: React.ReactNode;
    leftLabel: string;
    rightLabel: string;
    color?: string;
  }) => (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        {icon}
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography
          variant="caption"
          color="primary"
          sx={{ ml: 'auto', fontFamily: 'monospace' }}
        >
          {value > 0 ? '+' : ''}
          {(value * 100).toFixed(0)}%
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ width: 50, textAlign: 'right' }}>
          {leftLabel}
        </Typography>
        <Slider
          value={value}
          min={-1}
          max={1}
          step={0.1}
          onChange={(_, v) => onChange(v as number)}
          size="small"
          sx={{
            color,
            '& .MuiSlider-thumb': { width: 14, height: 14 },
            '& .MuiSlider-track': { height: 4 },
            '& .MuiSlider-rail': { height: 4 },
          }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ width: 50 }}>
          {rightLabel}
        </Typography>
      </Box>
    </Box>
  );

  const StatDisplay = ({
    label,
    value,
    unit,
    icon,
    color = '#4fc3f7',
  }: {
    label: string;
    value: string | number;
    unit: string;
    icon: React.ReactNode;
    color?: string;
  }) => (
    <Box sx={{ textAlign: 'center' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
        {icon}
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
      </Box>
      <Typography
        variant="h6"
        sx={{ color, fontFamily: 'monospace', fontWeight: 600 }}
      >
        {value}
        <Typography component="span" variant="caption" sx={{ ml: 0.5, opacity: 0.7 }}>
          {unit}
        </Typography>
      </Typography>
    </Box>
  );

  return (
    <Box>
      {/* Platform Info */}
      <Paper
        sx={{
          p: 2,
          mb: 2,
          backgroundColor: 'rgba(26, 58, 90, 0.3)',
          border: '1px solid rgba(79, 195, 247, 0.2)',
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ color: '#81d4fa', mb: 2, textAlign: 'center' }}
        >
          {platform.name} ({platform.config.type})
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 2,
          }}
        >
          <StatDisplay
            label="Heading"
            value={platform.heading.toFixed(0)}
            unit="°"
            icon={<NavigationIcon sx={{ fontSize: 14, color: '#4fc3f7' }} />}
          />
          <StatDisplay
            label="Speed"
            value={platform.speed.toFixed(1)}
            unit="m/s"
            icon={<SpeedIcon sx={{ fontSize: 14, color: '#81c784' }} />}
            color="#81c784"
          />
          <StatDisplay
            label="Depth"
            value={platform.depth.toFixed(0)}
            unit="m"
            icon={<DepthIcon sx={{ fontSize: 14, color: '#ffb74d' }} />}
            color="#ffb74d"
          />
        </Box>
      </Paper>

      {/* Position Display */}
      <Paper
        sx={{
          p: 2,
          mb: 2,
          backgroundColor: 'rgba(26, 58, 90, 0.2)',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Position
        </Typography>
        <Box sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#90caf9' }}>
          X: {platform.position.x.toFixed(1)} m | Y: {platform.position.y.toFixed(1)} m
        </Box>
      </Paper>

      {/* Manual Controls */}
      <Typography variant="subtitle2" sx={{ color: '#81d4fa', mb: 2 }}>
        Manual Controls
      </Typography>

      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
        Use WASD keys for movement, Q/E for depth. Hold Shift for speed boost.
      </Typography>

      <ControlSlider
        label="Throttle"
        value={controls.throttle}
        onChange={(v) => handleControlChange('throttle', v)}
        icon={<SpeedIcon sx={{ fontSize: 14, color: '#81c784' }} />}
        leftLabel="Rev"
        rightLabel="Fwd"
        color="#81c784"
      />

      <ControlSlider
        label="Rudder"
        value={controls.rudder}
        onChange={(v) => handleControlChange('rudder', v)}
        icon={<NavigationIcon sx={{ fontSize: 14, color: '#4fc3f7' }} />}
        leftLabel="Port"
        rightLabel="Stbd"
      />

      <ControlSlider
        label="Dive"
        value={controls.dive}
        onChange={(v) => handleControlChange('dive', v)}
        icon={<DepthIcon sx={{ fontSize: 14, color: '#ffb74d' }} />}
        leftLabel="Up"
        rightLabel="Down"
        color="#ffb74d"
      />

      <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />

      {/* Quick Depth Presets */}
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        Quick Depth
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {[0, 50, 100, 150, 200, 300].map((depth) => (
          <Chip
            key={depth}
            label={`${depth}m`}
            size="small"
            onClick={() => setDepth(depth)}
            variant={Math.abs(platform.depth - depth) < 5 ? 'filled' : 'outlined'}
            sx={{
              fontSize: '0.7rem',
              height: 24,
              borderColor: '#4fc3f7',
              color: '#4fc3f7',
              '&.MuiChip-filled': {
                backgroundColor: '#4fc3f7',
                color: '#000',
              },
            }}
          />
        ))}
      </Box>

      <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />

      {/* Platform Specs */}
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        Platform Specifications
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, fontSize: '0.7rem' }}>
        <Typography variant="caption" color="text.secondary">
          Max Speed:
        </Typography>
        <Typography variant="caption" color="primary">
          {platform.config.maxSpeed} m/s
        </Typography>

        <Typography variant="caption" color="text.secondary">
          Max Depth:
        </Typography>
        <Typography variant="caption" color="primary">
          {platform.config.maxDepth} m
        </Typography>

        <Typography variant="caption" color="text.secondary">
          Turn Rate:
        </Typography>
        <Typography variant="caption" color="primary">
          {platform.config.turnRate}°/s
        </Typography>

        <Typography variant="caption" color="text.secondary">
          Dive Rate:
        </Typography>
        <Typography variant="caption" color="primary">
          {platform.config.diveRate} m/s
        </Typography>
      </Box>
    </Box>
  );
}


