import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useEnvironmentStore } from '../../store';

function NumberField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  const [inputText, setInputText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setInputText(String(value));
  }, [value, focused]);

  const commitValue = (raw: string) => {
    const parsed = parseFloat(raw);
    if (!Number.isNaN(parsed)) {
      const clamped = Math.min(max, Math.max(min, parsed));
      const stepped = step < 1
        ? Math.round(clamped / step) * step
        : Math.round(clamped / step) * step;
      const final = Math.min(max, Math.max(min, stepped));
      onChange(final);
      setInputText(String(final));
    } else {
      setInputText(String(value));
    }
    setFocused(false);
  };

  return (
    <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 90 }}>
        {label}
      </Typography>
      <TextField
        size="small"
        value={focused ? inputText : value}
        onChange={(e) => {
          if (focused) setInputText(e.target.value);
          else {
            const v = parseFloat(e.target.value);
            if (!Number.isNaN(v)) {
              const clamped = Math.min(max, Math.max(min, v));
              onChange(clamped);
            }
          }
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => commitValue(inputText)}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        inputProps={{
          type: 'number',
          min,
          max,
          step,
          style: { width: 80, textAlign: 'right', fontSize: '0.875rem' },
        }}
        sx={{
          '& .MuiInputBase-root': { backgroundColor: 'rgba(0,0,0,0.2)' },
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(79, 195, 247, 0.4)' },
        }}
      />
      {unit && (
        <Typography variant="caption" color="primary">
          {unit}
        </Typography>
      )}
    </Box>
  );
}

export function EnvironmentPanel() {
  const { environment, setWaterProperties, generateNewBathymetry } =
    useEnvironmentStore();

  const [bathymetrySettings, setBathymetrySettings] = useState({
    width: environment.bathymetry.width,
    height: environment.bathymetry.height,
    resolution: environment.bathymetry.resolution,
    maxDepth: environment.bathymetry.maxDepth,
  });

  const handleWaterPropertyChange = (
    property: keyof typeof environment.waterProperties,
    value: number
  ) => {
    setWaterProperties({ [property]: value });
  };

  const handleGenerateBathymetry = () => {
    generateNewBathymetry(
      bathymetrySettings.width,
      bathymetrySettings.height,
      bathymetrySettings.resolution,
      bathymetrySettings.maxDepth
    );
  };

  return (
    <Box>
      {/* Water Properties */}
      <Accordion
        defaultExpanded
        sx={{
          backgroundColor: 'rgba(26, 58, 90, 0.3)',
          '&:before': { display: 'none' },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#6b8cae' }} />}>
          <Typography variant="subtitle2" sx={{ color: '#81d4fa' }}>
            Water Properties
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <NumberField
            label="Temperature"
            value={environment.waterProperties.temperature}
            min={0}
            max={30}
            step={0.5}
            unit="°C"
            onChange={(v) => handleWaterPropertyChange('temperature', v)}
          />
          <NumberField
            label="Salinity"
            value={environment.waterProperties.salinity}
            min={0}
            max={45}
            step={0.5}
            unit="PSU"
            onChange={(v) => handleWaterPropertyChange('salinity', v)}
          />
          <NumberField
            label="Sea State"
            value={environment.waterProperties.seaState}
            min={0}
            max={9}
            step={1}
            unit=""
            onChange={(v) => handleWaterPropertyChange('seaState', v)}
          />
          <NumberField
            label="pH"
            value={environment.waterProperties.pH}
            min={7.0}
            max={8.5}
            step={0.1}
            unit=""
            onChange={(v) => handleWaterPropertyChange('pH', v)}
          />
        </AccordionDetails>
      </Accordion>

      {/* Bathymetry Settings */}
      <Accordion
        sx={{
          backgroundColor: 'rgba(26, 58, 90, 0.3)',
          '&:before': { display: 'none' },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#6b8cae' }} />}>
          <Typography variant="subtitle2" sx={{ color: '#81d4fa' }}>
            Bathymetry
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              label="Width (m)"
              type="number"
              size="small"
              fullWidth
              value={bathymetrySettings.width}
              onChange={(e) =>
                setBathymetrySettings({
                  ...bathymetrySettings,
                  width: Number(e.target.value),
                })
              }
              sx={{ '& .MuiInputBase-input': { fontSize: '0.875rem' } }}
            />
            <TextField
              label="Height (m)"
              type="number"
              size="small"
              fullWidth
              value={bathymetrySettings.height}
              onChange={(e) =>
                setBathymetrySettings({
                  ...bathymetrySettings,
                  height: Number(e.target.value),
                })
              }
              sx={{ '& .MuiInputBase-input': { fontSize: '0.875rem' } }}
            />
            <TextField
              label="Resolution"
              type="number"
              size="small"
              fullWidth
              value={bathymetrySettings.resolution}
              onChange={(e) =>
                setBathymetrySettings({
                  ...bathymetrySettings,
                  resolution: Number(e.target.value),
                })
              }
              sx={{ '& .MuiInputBase-input': { fontSize: '0.875rem' } }}
            />
            <TextField
              label="Max Depth (m)"
              type="number"
              size="small"
              fullWidth
              value={bathymetrySettings.maxDepth}
              onChange={(e) =>
                setBathymetrySettings({
                  ...bathymetrySettings,
                  maxDepth: Number(e.target.value),
                })
              }
              sx={{ '& .MuiInputBase-input': { fontSize: '0.875rem' } }}
            />
          </Box>

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleGenerateBathymetry}
            fullWidth
            sx={{
              mt: 2,
              borderColor: '#4fc3f7',
              color: '#4fc3f7',
              '&:hover': {
                borderColor: '#81d4fa',
                backgroundColor: 'rgba(79, 195, 247, 0.1)',
              },
            }}
          >
            Generate New Terrain
          </Button>

          <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />

          {/* Current Stats */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Min Depth:
            </Typography>
            <Typography variant="caption" color="primary">
              {environment.bathymetry.minDepth.toFixed(1)} m
            </Typography>

            <Typography variant="caption" color="text.secondary">
              Max Depth:
            </Typography>
            <Typography variant="caption" color="primary">
              {environment.bathymetry.maxDepth.toFixed(1)} m
            </Typography>

            <Typography variant="caption" color="text.secondary">
              Area:
            </Typography>
            <Typography variant="caption" color="primary">
              {(
                (environment.bathymetry.width * environment.bathymetry.height) /
                1e6
              ).toFixed(2)}{' '}
              km²
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Sound Speed Profile (computed from config) */}
      <Accordion
        sx={{
          backgroundColor: 'rgba(26, 58, 90, 0.3)',
          '&:before': { display: 'none' },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#6b8cae' }} />}>
          <Typography variant="subtitle2" sx={{ color: '#81d4fa' }}>
            Sound Speed Profile
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
            Computed in real time from water properties (temperature, salinity) and bathymetry max depth. All sonar and ray-tracing calculations use this profile.
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            {environment.soundSpeedProfile.layers.length} layers · 0–{environment.bathymetry.maxDepth} m
          </Typography>

          {environment.soundSpeedProfile.layers.slice(0, 5).map((layer, idx) => (
            <Box
              key={idx}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                py: 0.5,
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {layer.depth}m
              </Typography>
              <Typography variant="caption" color="primary">
                {layer.speed.toFixed(1)} m/s
              </Typography>
            </Box>
          ))}

          {environment.soundSpeedProfile.layers.length > 5 && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: 'block' }}
            >
              ... and {environment.soundSpeedProfile.layers.length - 5} more layers
            </Typography>
          )}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}

