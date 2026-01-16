import { useState } from 'react';
import {
  Box,
  Typography,
  Slider,
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

  const SliderWithLabel = ({
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
  }) => (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="caption" color="primary">
          {value.toFixed(step < 1 ? 1 : 0)} {unit}
        </Typography>
      </Box>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(_, v) => onChange(v as number)}
        size="small"
        sx={{
          color: '#4fc3f7',
          '& .MuiSlider-thumb': {
            width: 14,
            height: 14,
          },
        }}
      />
    </Box>
  );

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
          <SliderWithLabel
            label="Temperature"
            value={environment.waterProperties.temperature}
            min={0}
            max={30}
            step={0.5}
            unit="°C"
            onChange={(v) => handleWaterPropertyChange('temperature', v)}
          />

          <SliderWithLabel
            label="Salinity"
            value={environment.waterProperties.salinity}
            min={0}
            max={45}
            step={0.5}
            unit="PSU"
            onChange={(v) => handleWaterPropertyChange('salinity', v)}
          />

          <SliderWithLabel
            label="Sea State"
            value={environment.waterProperties.seaState}
            min={0}
            max={9}
            step={1}
            unit=""
            onChange={(v) => handleWaterPropertyChange('seaState', v)}
          />

          <SliderWithLabel
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

      {/* Sound Speed Profile Info */}
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
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            {environment.soundSpeedProfile.layers.length} layers defined
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

