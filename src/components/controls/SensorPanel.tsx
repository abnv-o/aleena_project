import { useState } from 'react';
import {
  Box,
  Typography,
  Slider,
  Switch,
  TextField,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Sensors as SensorsIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useSensorStore } from '../../store';
import type { Sensor } from '../../types';

export function SensorPanel() {
  const { sensors, addSensor, updateSensor, setSensorActive, setActiveSensor, activeSensorId } =
    useSensorStore();

  const sensorArray = Array.from(sensors.values());

  const handleSensorUpdate = (id: string, field: keyof Sensor, value: any) => {
    updateSensor(id, { [field]: value });
  };

  const SliderControl = ({
    label,
    value,
    min,
    max,
    step,
    unit,
    onChange,
    logarithmic = false,
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit: string;
    onChange: (value: number) => void;
    logarithmic?: boolean;
  }) => (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="caption" color="primary">
          {logarithmic
            ? value >= 1000
              ? `${(value / 1000).toFixed(1)} k${unit}`
              : `${value} ${unit}`
            : `${value.toFixed(step < 1 ? 1 : 0)} ${unit}`}
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
          '& .MuiSlider-thumb': { width: 12, height: 12 },
        }}
      />
    </Box>
  );

  return (
    <Box>
      {/* Active Sensors List */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2" sx={{ color: '#81d4fa' }}>
            <SensorsIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
            Active Sensors ({sensorArray.filter((s) => s.isActive).length})
          </Typography>
          <Tooltip title="Add Sensor">
            <IconButton
              size="small"
              sx={{ color: '#4fc3f7' }}
              onClick={() => addSensor()}
              aria-label="Add sensor"
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {sensorArray.map((sensor) => (
            <Chip
              key={sensor.id}
              label={sensor.name}
              size="small"
              color={sensor.isActive ? 'primary' : 'default'}
              variant={activeSensorId === sensor.id ? 'filled' : 'outlined'}
              onClick={() => setActiveSensor(sensor.id)}
              sx={{
                borderColor: sensor.isActive ? '#4fc3f7' : '#666',
                '&:hover': {
                  backgroundColor: 'rgba(79, 195, 247, 0.2)',
                },
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Sensor Configuration */}
      {sensorArray.map((sensor) => (
        <Accordion
          key={sensor.id}
          expanded={activeSensorId === sensor.id}
          onChange={() => setActiveSensor(activeSensorId === sensor.id ? null : sensor.id)}
          sx={{
            backgroundColor: 'rgba(26, 58, 90, 0.3)',
            '&:before': { display: 'none' },
            mb: 1,
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#6b8cae' }} />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: sensor.isActive ? '#4caf50' : '#666',
                }}
              />
              <Typography variant="subtitle2" sx={{ color: '#81d4fa', flexGrow: 1 }}>
                {sensor.name}
              </Typography>
              <Chip
                label={sensor.type}
                size="small"
                sx={{
                  fontSize: '0.65rem',
                  height: 18,
                  backgroundColor:
                    sensor.type === 'active'
                      ? 'rgba(76, 175, 80, 0.2)'
                      : 'rgba(33, 150, 243, 0.2)',
                  color: sensor.type === 'active' ? '#81c784' : '#64b5f6',
                }}
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {/* Name */}
            <TextField
              size="small"
              fullWidth
              label="Name"
              value={sensor.name}
              onChange={(e) => handleSensorUpdate(sensor.id, 'name', e.target.value)}
              sx={{ mb: 1.5, '& .MuiInputBase-input': { fontSize: '0.875rem' } }}
            />

            {/* Active Toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={sensor.isActive}
                  onChange={(e) => setSensorActive(sensor.id, e.target.checked)}
                  size="small"
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#4caf50',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#4caf50',
                    },
                  }}
                />
              }
              label={<Typography variant="caption">Sensor Active</Typography>}
              sx={{ mb: 1 }}
            />

            {/* Frequency */}
            <SliderControl
              label="Frequency"
              value={sensor.frequency}
              min={100}
              max={50000}
              step={100}
              unit="Hz"
              logarithmic
              onChange={(v) => handleSensorUpdate(sensor.id, 'frequency', v)}
            />

            {/* Source Level (Active only) */}
            {sensor.type === 'active' && (
              <SliderControl
                label="Source Level"
                value={sensor.sourceLevel}
                min={180}
                max={240}
                step={1}
                unit="dB"
                onChange={(v) => handleSensorUpdate(sensor.id, 'sourceLevel', v)}
              />
            )}

            {/* Beam Widths (side-scan: horizontal + vertical) */}
            <SliderControl
              label="Horizontal Beam Width"
              value={sensor.beamPattern.horizontalWidth}
              min={5}
              max={360}
              step={5}
              unit="°"
              onChange={(v) =>
                handleSensorUpdate(sensor.id, 'beamPattern', {
                  ...sensor.beamPattern,
                  horizontalWidth: v,
                })
              }
            />
            <SliderControl
              label="Vertical Beam Width"
              value={sensor.beamPattern.verticalWidth}
              min={1}
              max={90}
              step={1}
              unit="°"
              onChange={(v) =>
                handleSensorUpdate(sensor.id, 'beamPattern', {
                  ...sensor.beamPattern,
                  verticalWidth: v,
                })
              }
            />
            <SliderControl
              label="Vertical Beam Angle (depression)"
              value={sensor.beamPattern.verticalBeamAngle ?? 45}
              min={0}
              max={90}
              step={5}
              unit="°"
              onChange={(v) =>
                handleSensorUpdate(sensor.id, 'beamPattern', {
                  ...sensor.beamPattern,
                  verticalBeamAngle: v,
                })
              }
            />

            {/* Max Range */}
            <SliderControl
              label="Max Range"
              value={sensor.maxRange}
              min={100}
              max={50000}
              step={100}
              unit="m"
              logarithmic
              onChange={(v) => handleSensorUpdate(sensor.id, 'maxRange', v)}
            />

            {/* Ping Interval (Active only) */}
            {sensor.type === 'active' && (
              <SliderControl
                label="Ping Interval"
                value={sensor.pingInterval}
                min={1}
                max={30}
                step={0.5}
                unit="s"
                onChange={(v) => handleSensorUpdate(sensor.id, 'pingInterval', v)}
              />
            )}

            {/* Detection Threshold */}
            <SliderControl
              label="Detection Threshold"
              value={sensor.detectionThreshold}
              min={0}
              max={30}
              step={1}
              unit="dB"
              onChange={(v) => handleSensorUpdate(sensor.id, 'detectionThreshold', v)}
            />
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}



