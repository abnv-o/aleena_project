import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  Divider,
} from '@mui/material';
import { useSimulationStore } from '../../store';
import type { ViewportConfig } from '../../types';

export function ViewportPanel() {
  const viewport = useSimulationStore((s) => s.viewport);
  const setViewportConfig = useSimulationStore((s) => s.setViewportConfig);
  const setCameraMode = useSimulationStore((s) => s.setCameraMode);

  const ToggleOption = ({
    label,
    checked,
    onChange,
  }: {
    label: string;
    checked: boolean;
    onChange: () => void;
  }) => (
    <FormControlLabel
      control={
        <Switch
          checked={checked}
          onChange={onChange}
          size="small"
          sx={{
            '& .MuiSwitch-switchBase.Mui-checked': {
              color: '#4fc3f7',
            },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
              backgroundColor: '#4fc3f7',
            },
          }}
        />
      }
      label={<Typography variant="caption">{label}</Typography>}
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        ml: 0,
        mb: 1,
      }}
      labelPlacement="start"
    />
  );

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ color: '#81d4fa', mb: 2 }}>
        Display Options
      </Typography>

      <ToggleOption
        label="Show Grid"
        checked={viewport.showGrid}
        onChange={() => setViewportConfig({ showGrid: !viewport.showGrid })}
      />

      <ToggleOption
        label="Show Axes"
        checked={viewport.showAxes}
        onChange={() => setViewportConfig({ showAxes: !viewport.showAxes })}
      />

      <ToggleOption
        label="Depth Markers"
        checked={viewport.showDepthMarkers}
        onChange={() => setViewportConfig({ showDepthMarkers: !viewport.showDepthMarkers })}
      />

      <ToggleOption
        label="Ray Paths"
        checked={viewport.showRayPaths}
        onChange={() => setViewportConfig({ showRayPaths: !viewport.showRayPaths })}
      />

      <ToggleOption
        label="Sensor Coverage"
        checked={viewport.showSensorCoverage}
        onChange={() =>
          setViewportConfig({ showSensorCoverage: !viewport.showSensorCoverage })
        }
      />

      <ToggleOption
        label="Underwater Fog"
        checked={viewport.underwaterFog}
        onChange={() => setViewportConfig({ underwaterFog: !viewport.underwaterFog })}
      />

      <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />

      {/* Camera Mode */}
      <FormControl component="fieldset">
        <FormLabel
          component="legend"
          sx={{ color: '#81d4fa', fontSize: '0.875rem', mb: 1 }}
        >
          Camera Mode
        </FormLabel>
        <RadioGroup
          value={viewport.cameraMode}
          onChange={(e) =>
            setCameraMode(e.target.value as ViewportConfig['cameraMode'])
          }
        >
          {[
            { value: 'orbit', label: 'Orbit (Free)' },
            { value: 'follow', label: 'Follow Platform' },
            { value: 'top_down', label: 'Top Down' },
            { value: 'side_view', label: 'Side View' },
          ].map((option) => (
            <FormControlLabel
              key={option.value}
              value={option.value}
              control={
                <Radio
                  size="small"
                  sx={{
                    color: '#6b8cae',
                    '&.Mui-checked': {
                      color: '#4fc3f7',
                    },
                  }}
                />
              }
              label={<Typography variant="caption">{option.label}</Typography>}
              sx={{ mb: -0.5 }}
            />
          ))}
        </RadioGroup>
      </FormControl>

      <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />

      {/* Keyboard Shortcuts */}
      <Typography variant="subtitle2" sx={{ color: '#81d4fa', mb: 1 }}>
        Keyboard Shortcuts
      </Typography>
      <Box sx={{ fontSize: '0.7rem' }}>
        {[
          { key: 'W/S', action: 'Forward / Reverse' },
          { key: 'A/D', action: 'Turn Left / Right' },
          { key: 'Q/E', action: 'Dive / Surface' },
          { key: 'Shift', action: 'Speed Boost' },
          { key: 'Space', action: 'Play / Pause' },
          { key: 'R', action: 'Reset View' },
        ].map((shortcut) => (
          <Box
            key={shortcut.key}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 0.5,
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontFamily: 'monospace',
                backgroundColor: 'rgba(79, 195, 247, 0.2)',
                px: 1,
                borderRadius: 0.5,
                color: '#4fc3f7',
              }}
            >
              {shortcut.key}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {shortcut.action}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}



