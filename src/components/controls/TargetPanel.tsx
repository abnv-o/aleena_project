import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Place as PlaceIcon,
  Clear as ClearIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Delete as DeleteIcon,
  MyLocation as MyLocationIcon,
} from '@mui/icons-material';
import { useTargetStore, usePlatformStore, useEnvironmentStore, useSensorStore } from '../../store';
import { vec3 } from '../../utils/math';
import { TARGET_TYPE_DISPLAY_NAMES, type TargetTypeKey } from '../../utils/targetFactory';
import { getDepthAtPosition } from '../../utils/bathymetryGenerator';
import type { SearchArea } from '../../utils/coveragePath';

// Emoji per target type for quick identification
const TARGET_TYPE_ICONS: Record<TargetTypeKey, string> = {
  submarine: '🟦',
  surface_vessel: '🚢',
  biological: '🐳',
  mine: '💣',
};

export function TargetPanel() {
  const {
    targets,
    addTarget,
    removeTarget,
    clearTarget,
    coverageActive,
    startAreaCoverage,
    stopAreaCoverage,
  } = useTargetStore();

  const platform = usePlatformStore((s) => s.platform);
  const waypointQueueLength = usePlatformStore((s) => s.waypointQueue.length);
  const isAutopilot = usePlatformStore((s) => s.isAutopilot);
  const detections = useSensorStore((s) => s.detections);
  const sensors = useSensorStore((s) => s.sensors);
  const bathymetry = useEnvironmentStore((s) => s.environment.bathymetry);
  const bounds = useEnvironmentStore((s) => s.environment.bounds);

  const [placeX, setPlaceX] = useState('500');
  const [placeY, setPlaceY] = useState('500');
  const [placeDepth, setPlaceDepth] = useState('100');
  const [targetType, setTargetType] = useState<TargetTypeKey>('submarine');

  // Search area coordinates
  const [areaMinX, setAreaMinX] = useState(String(bounds.minX));
  const [areaMaxX, setAreaMaxX] = useState(String(bounds.maxX));
  const [areaMinY, setAreaMinY] = useState(String(bounds.minY));
  const [areaMaxY, setAreaMaxY] = useState(String(bounds.maxY));
  const [trackSpacing, setTrackSpacing] = useState('80');
  const [surveyDepth, setSurveyDepth] = useState('50');

  const coverageFinishedHandledRef = useRef(false);
  const hadWaypointsThisRunRef = useRef(false);

  // When platform finishes all waypoints, mark coverage as finished (once per coverage run)
  useEffect(() => {
    if (!coverageActive || !isAutopilot) {
      coverageFinishedHandledRef.current = false;
      hadWaypointsThisRunRef.current = false;
      return;
    }
    if (waypointQueueLength > 0) {
      hadWaypointsThisRunRef.current = true;
      coverageFinishedHandledRef.current = false;
      return;
    }
    if (!hadWaypointsThisRunRef.current) return;
    if (!coverageFinishedHandledRef.current) {
      coverageFinishedHandledRef.current = true;
      stopAreaCoverage();
    }
  }, [coverageActive, isAutopilot, waypointQueueLength, stopAreaCoverage]);

  const handlePlace = () => {
    const x = parseFloat(placeX) || 0;
    const y = parseFloat(placeY) || 0;
    const depthM = Math.max(0, parseFloat(placeDepth) || 0);
    addTarget(targetType, { x, y, z: -depthM });
  };

  // Place target at current platform position
  const handlePlaceAtPlatform = () => {
    const { x, y } = platform.position;
    setPlaceX(x.toFixed(0));
    setPlaceY(y.toFixed(0));
    setPlaceDepth(platform.depth.toFixed(0));
  };

  const handleSetAreaAndStartCoverage = () => {
    const minX = parseFloat(areaMinX) ?? bounds.minX;
    const maxX = parseFloat(areaMaxX) ?? bounds.maxX;
    const minY = parseFloat(areaMinY) ?? bounds.minY;
    const maxY = parseFloat(areaMaxY) ?? bounds.maxY;
    const trackSpacingM = Math.max(10, parseFloat(trackSpacing) || 50);
    const surveyDepthM = Math.max(0, parseFloat(surveyDepth) || 50);
    const area: SearchArea = {
      minX: Math.min(minX, maxX),
      maxX: Math.max(minX, maxX),
      minY: Math.min(minY, maxY),
      maxY: Math.max(minY, maxY),
    };
    startAreaCoverage({ trackSpacingM, surveyDepthM, area });
  };

  // Get the first active sensor world position (mount offset + platform)
  const activeSensorPosition = useMemo(() => {
    const activeSensor = Array.from(sensors.values()).find((s) => s.isActive);
    if (!activeSensor) return platform.position;
    return vec3.add(platform.position, activeSensor.mountPosition);
  }, [sensors, platform.position]);

  const latestDetectionsByTarget = useMemo(() => {
    const byTarget = new Map<string, (typeof detections)[0]>();
    for (let i = detections.length - 1; i >= 0; i--) {
      const d = detections[i];
      const tid = d.targetId ?? (d.id.split('-')[2]);
      if (tid && !byTarget.has(tid)) byTarget.set(tid, d);
    }
    return byTarget;
  }, [detections]);

  const activeDetectionCount = useMemo(
    () => new Set(detections.map((d) => d.targetId ?? d.id.split('-')[2]).filter(Boolean)).size,
    [detections]
  );

  // Build enriched rows: add depth-from-seabed and depth-from-sensor
  const detectionTableRows = useMemo(() => {
    return targets.map((t) => {
      const distanceM = vec3.distance(platform.position, t.position);
      const latest = latestDetectionsByTarget.get(t.id);
      const detected = !!latest;
      const detectionLevel = latest?.detectionLevel ?? null;
      const confidence = latest?.confidence ?? null;
      const displayName = TARGET_TYPE_DISPLAY_NAMES[t.type as TargetTypeKey] ?? t.type;

      // Depth of target below sea surface (positive = deeper)
      const targetDepthM = -t.position.z; // position.z is negative

      // Seabed depth at target's XY position
      const seabedDepthM = getDepthAtPosition(bathymetry, t.position.x, t.position.y);

      // Distance from target to seabed (clearance above seabed)
      const heightAboveSeabedM = Math.max(0, seabedDepthM - targetDepthM);

      // Vertical distance from the active sensor down to the target
      const sensorDepthM = -activeSensorPosition.z;
      const verticalDistToSensorM = Math.abs(targetDepthM - sensorDepthM);

      return {
        target: t,
        displayName,
        distanceM,
        detectionLevel,
        confidence,
        detected,
        targetDepthM,
        seabedDepthM,
        heightAboveSeabedM,
        verticalDistToSensorM,
      };
    });
  }, [targets, platform.position, latestDetectionsByTarget, bathymetry, activeSensorPosition]);

  return (
    <Box>
      {/* ── Target Placement ── */}
      <Typography variant="subtitle2" sx={{ color: '#81d4fa', mb: 0.5 }}>
        Place target
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
        Fill in coordinates and click <strong>Add</strong>. Repeat for multiple targets.
      </Typography>

      <Paper
        sx={{
          p: 2,
          mb: 2,
          backgroundColor: 'rgba(26, 58, 90, 0.3)',
          border: '1px solid rgba(79, 195, 247, 0.2)',
        }}
      >
        <FormControl size="small" fullWidth sx={{ mb: 1.5 }}>
          <InputLabel id="target-type-label">Target type</InputLabel>
          <Select
            labelId="target-type-label"
            value={targetType}
            label="Target type"
            onChange={(e) => setTargetType(e.target.value as TargetTypeKey)}
            sx={{ fontSize: '0.875rem' }}
          >
            {(Object.keys(TARGET_TYPE_DISPLAY_NAMES) as TargetTypeKey[]).map((key) => (
              <MenuItem key={key} value={key}>
                {TARGET_TYPE_ICONS[key]} {TARGET_TYPE_DISPLAY_NAMES[key]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 1.5 }}>
          <TextField
            size="small"
            label="X (m)"
            type="number"
            value={placeX}
            onChange={(e) => setPlaceX(e.target.value)}
            inputProps={{ min: bounds.minX, max: bounds.maxX, step: 1 }}
            sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem' } }}
          />
          <TextField
            size="small"
            label="Y (m)"
            type="number"
            value={placeY}
            onChange={(e) => setPlaceY(e.target.value)}
            inputProps={{ min: bounds.minY, max: bounds.maxY, step: 1 }}
            sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem' } }}
          />
        </Box>

        <TextField
          size="small"
          fullWidth
          label="Depth below surface (m)"
          type="number"
          value={placeDepth}
          onChange={(e) => setPlaceDepth(e.target.value)}
          inputProps={{ min: 0, max: bathymetry.maxDepth, step: 1 }}
          sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { fontSize: '0.875rem' }, '& .MuiInputLabel-root': { fontSize: '0.85rem' } }}
        />

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            size="small"
            variant="contained"
            startIcon={<PlaceIcon />}
            onClick={handlePlace}
            sx={{ backgroundColor: '#4fc3f7', color: '#0a1420', '&:hover': { backgroundColor: '#81d4fa' } }}
          >
            Add target
          </Button>
          <Tooltip title="Copy platform's current XY and depth into the fields above">
            <Button
              size="small"
              variant="outlined"
              startIcon={<MyLocationIcon />}
              onClick={handlePlaceAtPlatform}
              sx={{ borderColor: '#4fc3f7', color: '#4fc3f7', fontSize: '0.75rem' }}
            >
              Use platform pos
            </Button>
          </Tooltip>
          {targets.length > 0 && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={clearTarget}
              sx={{ borderColor: '#ef5350', color: '#ef5350', ml: 'auto' }}
            >
              Clear all ({targets.length})
            </Button>
          )}
        </Box>
      </Paper>

      {/* ── Active Targets List ── */}
      {targets.length > 0 && (
        <>
          <Typography variant="subtitle2" sx={{ color: '#81d4fa', mb: 1 }}>
            Placed targets&nbsp;
            <Chip label={targets.length} size="small" sx={{ backgroundColor: '#1a3a5a', color: '#81d4fa', height: 18, fontSize: '0.7rem' }} />
          </Typography>
          <Paper
            sx={{
              mb: 2,
              overflow: 'hidden',
              backgroundColor: 'rgba(26, 58, 90, 0.25)',
              border: '1px solid rgba(79, 195, 247, 0.2)',
            }}
          >
            {targets.map((t, idx) => {
              const row = detectionTableRows[idx];
              return (
                <Box
                  key={t.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    px: 1.5,
                    py: 0.75,
                    borderBottom: idx < targets.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    gap: 1,
                  }}
                >
                  <Typography sx={{ fontSize: '1rem', lineHeight: 1 }}>
                    {TARGET_TYPE_ICONS[t.type as TargetTypeKey] ?? '❓'}
                  </Typography>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.8rem', color: '#e0e0e0', fontWeight: 500 }}>
                      {t.name}
                    </Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: '#90a4ae', fontFamily: 'monospace' }}>
                      X:{t.position.x.toFixed(0)} Y:{t.position.y.toFixed(0)} D:{row.targetDepthM.toFixed(0)} m
                    </Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: '#78909c', fontFamily: 'monospace' }}>
                      Seabed:{row.seabedDepthM.toFixed(0)} m &nbsp;|&nbsp; ↑seabed:{row.heightAboveSeabedM.toFixed(0)} m &nbsp;|&nbsp; Δsensor:{row.verticalDistToSensorM.toFixed(0)} m
                    </Typography>
                  </Box>
                  <Chip
                    label={row.detected ? '✓ Det.' : 'Undet.'}
                    size="small"
                    sx={{
                      fontSize: '0.68rem',
                      height: 18,
                      backgroundColor: row.detected ? 'rgba(129,199,132,0.2)' : 'rgba(255,255,255,0.05)',
                      color: row.detected ? '#81c784' : '#78909c',
                      border: row.detected ? '1px solid rgba(129,199,132,0.4)' : '1px solid rgba(255,255,255,0.1)',
                    }}
                  />
                  <Tooltip title="Remove this target">
                    <IconButton
                      size="small"
                      onClick={() => removeTarget(t.id)}
                      sx={{ color: '#ef5350', p: 0.5, '&:hover': { backgroundColor: 'rgba(239,83,80,0.12)' } }}
                    >
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              );
            })}
          </Paper>
        </>
      )}

      <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />

      {/* ── Detection Table ── */}
      <Typography variant="subtitle2" sx={{ color: '#81d4fa', mb: 0.5 }}>
        Detection report
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        Active detections: <strong style={{ color: '#81c784' }}>{activeDetectionCount}</strong> / {targets.length}
      </Typography>

      {targets.length > 0 ? (
        <Paper
          sx={{
            overflow: 'auto',
            backgroundColor: 'rgba(26, 58, 90, 0.25)',
            border: '1px solid rgba(79, 195, 247, 0.2)',
          }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: '#81d4fa', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>Target</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#81d4fa', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>Depth</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#81d4fa', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                  <Tooltip title="Height above the seabed at the target's XY position">
                    <span>↑Seabed</span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#81d4fa', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                  <Tooltip title="Vertical distance from the active sensor down to target">
                    <span>Δ Sensor</span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#81d4fa', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>Slant rng</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#81d4fa', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>Lvl (dB)</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#81d4fa', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>Conf</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#81d4fa', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {detectionTableRows.map((row) => (
                <TableRow
                  key={row.target.id}
                  sx={{
                    '&:hover': { backgroundColor: 'rgba(79,195,247,0.05)' },
                    backgroundColor: row.detected ? 'rgba(129,199,132,0.04)' : 'transparent',
                  }}
                >
                  <TableCell sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {TARGET_TYPE_ICONS[row.target.type as TargetTypeKey]} {row.displayName}
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {row.targetDepthM.toFixed(0)} m
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    <Tooltip title={`Seabed at this XY: ${row.seabedDepthM.toFixed(0)} m`}>
                      <span style={{ color: row.heightAboveSeabedM < 20 ? '#ffb74d' : '#e0e0e0' }}>
                        {row.heightAboveSeabedM.toFixed(0)} m
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {row.verticalDistToSensorM.toFixed(0)} m
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {row.distanceM.toFixed(0)} m
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                    {row.detectionLevel != null ? `${row.detectionLevel.toFixed(1)}` : '—'}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>
                    {row.confidence != null ? `${Math.round(row.confidence * 100)}%` : '—'}
                  </TableCell>
                  <TableCell
                    sx={{
                      fontSize: '0.78rem',
                      fontWeight: row.detected ? 600 : 400,
                      color: row.detected ? '#81c784' : '#90a4ae',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row.detected ? '✓ Detected' : 'Not det.'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : (
        <Typography variant="caption" color="text.secondary">
          Place targets to see detection report.
        </Typography>
      )}

      <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />

      {/* ── Area Coverage ── */}
      <Typography variant="subtitle2" sx={{ color: '#81d4fa', mb: 0.5 }}>
        Area coverage (autonomous search)
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        Define a rectangle. The platform will run a lawnmower pattern; sonar will detect placed targets in range and beam.
      </Typography>
      <Paper
        sx={{
          p: 2,
          mb: 2,
          backgroundColor: 'rgba(26, 58, 90, 0.25)',
          border: '1px solid rgba(79, 195, 247, 0.2)',
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Search area (global X,Y bounds, m)
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
          <TextField size="small" label="Min X" type="number" value={areaMinX} onChange={(e) => setAreaMinX(e.target.value)} inputProps={{ step: 10 }} sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem' } }} />
          <TextField size="small" label="Max X" type="number" value={areaMaxX} onChange={(e) => setAreaMaxX(e.target.value)} inputProps={{ step: 10 }} sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem' } }} />
          <TextField size="small" label="Min Y" type="number" value={areaMinY} onChange={(e) => setAreaMinY(e.target.value)} inputProps={{ step: 10 }} sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem' } }} />
          <TextField size="small" label="Max Y" type="number" value={areaMaxY} onChange={(e) => setAreaMaxY(e.target.value)} inputProps={{ step: 10 }} sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem' } }} />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
          <TextField size="small" label="Track spacing (m)" type="number" value={trackSpacing} onChange={(e) => setTrackSpacing(e.target.value)} inputProps={{ min: 10, step: 10 }} sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem' } }} />
          <TextField size="small" label="Survey depth (m)" type="number" value={surveyDepth} onChange={(e) => setSurveyDepth(e.target.value)} inputProps={{ min: 0, max: bathymetry.maxDepth, step: 5 }} sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem' } }} />
        </Box>
        {coverageActive ? (
          <Box>
            <Typography variant="caption" sx={{ color: '#81c784', display: 'block', mb: 1 }}>
              Coverage in progress — {waypointQueueLength} waypoint{waypointQueueLength !== 1 ? 's' : ''} remaining
            </Typography>
            <Button size="small" variant="outlined" startIcon={<StopIcon />} onClick={stopAreaCoverage} sx={{ borderColor: '#ffb74d', color: '#ffb74d' }}>
              Stop coverage
            </Button>
          </Box>
        ) : (
          <Button size="small" variant="contained" startIcon={<PlayIcon />} onClick={handleSetAreaAndStartCoverage} sx={{ backgroundColor: '#81c784', color: '#0a1420', '&:hover': { backgroundColor: '#a5d6a7' } }}>
            Start area coverage
          </Button>
        )}
      </Paper>
    </Box>
  );
}
