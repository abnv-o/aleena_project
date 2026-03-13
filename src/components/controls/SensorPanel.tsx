import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Switch,
  TextField,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Sensors as SensorsIcon,
  Add as AddIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';
import { useSensorStore, useEnvironmentStore } from '../../store';
import type { Sensor } from '../../types';
import { transmissionLoss, geometricSpreadingLoss, ambientNoiseLevel } from '../../core/physics/acoustics';

/** Stable component so React doesn't remount on parent re-render and revert value to store default (e.g. 3500). */
function NumberField({
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
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 140 }}>
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
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        inputProps={{
          type: 'number',
          min,
          max,
          step,
          style: { width: 88, textAlign: 'right', fontSize: '0.875rem' },
        }}
        sx={{
          '& .MuiInputBase-root': { backgroundColor: 'rgba(0,0,0,0.2)' },
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(79, 195, 247, 0.4)' },
        }}
      />
      <Typography variant="caption" color="primary">
        {logarithmic && value >= 1000 ? `k${unit}` : unit}
      </Typography>
    </Box>
  );
}

function useAcousticMetrics(sensor: Sensor | null) {
  const environment = useEnvironmentStore((s) => s.environment);
  const detections = useSensorStore((s) => s.detections);
  const wp = environment.waterProperties;
  const seaState = wp.seaState ?? 2;
  const shippingLevel = 4;

  return useMemo(() => {
    if (!sensor) return null;
    const rangeMax = sensor.maxRange;
    const freq = sensor.frequency;
    const TL_dB = transmissionLoss(rangeMax, freq, wp, 'spherical');
    const spreadingLoss_dB = geometricSpreadingLoss(rangeMax, 'spherical');
    const absorptionLoss_dB = TL_dB - spreadingLoss_dB;
    const NL_dB = ambientNoiseLevel(freq, seaState, shippingLevel);
    const totalNoiseLevel_dB = NL_dB + 10 * Math.log10(sensor.bandwidth);
    const sensorDetections = detections.filter((d) => d.sensorId === sensor.id);
    const latestDet = sensorDetections[sensorDetections.length - 1];
    const snr_dB = latestDet
      ? latestDet.signalExcess + sensor.detectionThreshold
      : null;

    const round2 = (v: number) => Math.round(v * 100) / 100;
    return {
      transmissionLoss_dB: round2(TL_dB),
      spreadingLoss_dB: round2(spreadingLoss_dB),
      absorptionLoss_dB: round2(absorptionLoss_dB),
      totalNoiseLevel_dB: round2(totalNoiseLevel_dB),
      maxDetectionRange_m: sensor.maxRange,
      detectionCount: sensorDetections.length,
      detectionResult: sensorDetections.length > 0 ? 'detected' : 'no_detections',
      snr_dB: snr_dB != null ? round2(snr_dB) : null,
    };
  }, [sensor, wp, seaState, shippingLevel, detections]);
}

function AcousticMetricsBlock({ sensor }: { sensor: Sensor }) {
  const metrics = useAcousticMetrics(sensor);
  if (!metrics) return null;

  const rows: { label: string; value: string | number }[] = [
    { label: 'Transmission loss (at max range)', value: `${metrics.transmissionLoss_dB} dB` },
    { label: 'Spreading loss', value: `${metrics.spreadingLoss_dB} dB` },
    { label: 'Absorption loss', value: `${metrics.absorptionLoss_dB} dB` },
    { label: 'Total noise level', value: `${metrics.totalNoiseLevel_dB} dB` },
    { label: 'Max detection range', value: `${metrics.maxDetectionRange_m} m` },
    { label: 'Detection result', value: metrics.detectionResult },
    { label: 'Active detections', value: metrics.detectionCount },
    { label: 'Signal-to-noise ratio', value: metrics.snr_dB != null ? `${metrics.snr_dB} dB` : '—' },
  ];

  return (
    <Box sx={{ mt: 2 }}>
      <Divider sx={{ mb: 1.5, borderColor: 'rgba(79, 195, 247, 0.3)' }} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        <AnalyticsIcon sx={{ fontSize: 16, color: '#4fc3f7' }} />
        <Typography variant="caption" sx={{ color: '#81d4fa', fontWeight: 600 }}>
          Acoustic metrics
        </Typography>
      </Box>
      <Box
        sx={{
          backgroundColor: 'rgba(0,0,0,0.2)',
          borderRadius: 1,
          p: 1.25,
          border: '1px solid rgba(79, 195, 247, 0.2)',
        }}
      >
        {rows.map(({ label, value }) => (
          <Box
            key={label}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              py: 0.35,
              gap: 1,
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              {label}
            </Typography>
            <Typography variant="caption" sx={{ color: '#81d4fa', fontFamily: 'monospace', fontSize: '0.75rem' }}>
              {value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export function SensorPanel() {
  // Subscribe only to sensors map and active id so we don't re-render on every reading/detection
  const sensors = useSensorStore((s) => s.sensors);
  const addSensor = useSensorStore((s) => s.addSensor);
  const updateSensor = useSensorStore((s) => s.updateSensor);
  const setSensorActive = useSensorStore((s) => s.setSensorActive);
  const setActiveSensor = useSensorStore((s) => s.setActiveSensor);
  const activeSensorId = useSensorStore((s) => s.activeSensorId);

  const sensorArray = Array.from(sensors.values());

  const handleSensorUpdate = (id: string, field: keyof Sensor, value: any) => {
    updateSensor(id, { [field]: value });
  };

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
            <NumberField
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
              <NumberField
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
            <NumberField
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
            <NumberField
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
            <NumberField
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
            <NumberField
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
              <NumberField
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
            <NumberField
              label="Detection Threshold"
              value={sensor.detectionThreshold}
              min={0}
              max={30}
              step={1}
              unit="dB"
              onChange={(v) => handleSensorUpdate(sensor.id, 'detectionThreshold', v)}
            />

            {/* Acoustic metrics (TL, spreading, absorption, noise, max range, detection result, SNR) */}
            <AcousticMetricsBlock sensor={sensor} />
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}



