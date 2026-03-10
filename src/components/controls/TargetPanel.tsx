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
} from '@mui/material';
import { Place as PlaceIcon, Clear as ClearIcon, PlayArrow as PlayIcon, Stop as StopIcon } from '@mui/icons-material';
import { useTargetStore, usePlatformStore, useEnvironmentStore, useSensorStore } from '../../store';
import { vec3 } from '../../utils/math';
import { TARGET_TYPE_DISPLAY_NAMES, type TargetTypeKey } from '../../utils/targetFactory';
import type { SearchArea } from '../../utils/coveragePath';

export function TargetPanel() {
  const {
    targets,
    addTarget,
    clearTarget,
    coverageActive,
    startAreaCoverage,
    stopAreaCoverage,
  } = useTargetStore();
  const platform = usePlatformStore((s) => s.platform);
  const waypointQueueLength = usePlatformStore((s) => s.waypointQueue.length);
  const isAutopilot = usePlatformStore((s) => s.isAutopilot);
  const detections = useSensorStore((s) => s.detections);
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
      coverageFinishedHandledRef.current = false; // still in progress
      return;
    }
    // waypointQueueLength === 0: only treat as "finished" if we had waypoints this run (avoids stopping immediately after Start due to store update order)
    if (!hadWaypointsThisRunRef.current) return;
    if (!coverageFinishedHandledRef.current) {
      coverageFinishedHandledRef.current = true;
      stopAreaCoverage();
    }
  }, [coverageActive, isAutopilot, waypointQueueLength, stopAreaCoverage]);

  // Sync form when first target exists (optional)
  useEffect(() => {
    const first = targets[0];
    if (first) {
      setPlaceX(first.position.x.toFixed(0));
      setPlaceY(first.position.y.toFixed(0));
      setPlaceDepth((-first.position.z).toFixed(0));
    }
  }, [targets.length === 0 ? null : targets[0]?.position.x, targets[0]?.position.y, targets[0]?.position.z]);

  const handlePlace = () => {
    const x = parseFloat(placeX) || 0;
    const y = parseFloat(placeY) || 0;
    const depthM = Math.max(0, parseFloat(placeDepth) || 0);
    addTarget(targetType, { x, y, z: -depthM });
  };

  const handleClear = () => {
    clearTarget();
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

  const detectionTableRows = useMemo(() => {
    return targets.map((t) => {
      const distanceM = vec3.distance(platform.position, t.position);
      const latest = latestDetectionsByTarget.get(t.id);
      const detected = !!latest;
      const detectionLevel = latest?.detectionLevel ?? null;
      const confidence = latest?.confidence ?? null;
      const displayName = TARGET_TYPE_DISPLAY_NAMES[t.type as TargetTypeKey] ?? t.type;
      return { target: t, displayName, distanceM, detectionLevel, confidence, detected };
    });
  }, [targets, platform.position, latestDetectionsByTarget]);

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ color: '#81d4fa', mb: 2 }}>
        Target placement
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        Choose target type and place in global coordinates. Sonar detects using the sonar equation (SL − 2·TL + TS − NL).
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
            <MenuItem value="submarine">{TARGET_TYPE_DISPLAY_NAMES.submarine}</MenuItem>
            <MenuItem value="surface_vessel">{TARGET_TYPE_DISPLAY_NAMES.surface_vessel}</MenuItem>
            <MenuItem value="biological">{TARGET_TYPE_DISPLAY_NAMES.biological}</MenuItem>
            <MenuItem value="mine">{TARGET_TYPE_DISPLAY_NAMES.mine}</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          <TextField
            size="small"
            label="X (m)"
            type="number"
            value={placeX}
            onChange={(e) => setPlaceX(e.target.value)}
            inputProps={{ min: bounds.minX, max: bounds.maxX, step: 1 }}
            sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }}
          />
          <TextField
            size="small"
            label="Y (m)"
            type="number"
            value={placeY}
            onChange={(e) => setPlaceY(e.target.value)}
            inputProps={{ min: bounds.minY, max: bounds.maxY, step: 1 }}
            sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }}
          />
          <TextField
            size="small"
            label="Depth (m, below surface)"
            type="number"
            value={placeDepth}
            onChange={(e) => setPlaceDepth(e.target.value)}
            inputProps={{ min: 0, max: bathymetry.maxDepth, step: 1 }}
            sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Button
            size="small"
            variant="contained"
            startIcon={<PlaceIcon />}
            onClick={handlePlace}
            sx={{ backgroundColor: '#4fc3f7', color: '#0a1420', '&:hover': { backgroundColor: '#81d4fa' } }}
          >
            Place target
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ClearIcon />}
            onClick={handleClear}
            sx={{ borderColor: '#6b8cae', color: '#90a4ae' }}
          >
            Clear all
          </Button>
        </Box>
      </Paper>

      <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
      <Typography variant="subtitle2" sx={{ color: '#81d4fa', mb: 2 }}>
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

      <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
      <Typography variant="subtitle2" sx={{ color: '#81d4fa', mb: 1 }}>
        Detection output
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        Active detections: {activeDetectionCount}
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
                <TableCell sx={{ fontWeight: 600, color: '#81d4fa', fontSize: '0.75rem' }}>Target</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#81d4fa', fontSize: '0.75rem' }}>Distance</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#81d4fa', fontSize: '0.75rem' }}>Detection level</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#81d4fa', fontSize: '0.75rem' }}>Confidence</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#81d4fa', fontSize: '0.75rem' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {detectionTableRows.map((row) => (
                <TableRow key={row.target.id}>
                  <TableCell sx={{ fontSize: '0.8rem' }}>{row.displayName}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{row.distanceM.toFixed(0)} m</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {row.detectionLevel != null ? `${row.detectionLevel.toFixed(1)} dB` : '—'}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8rem' }}>
                    {row.confidence != null ? `${Math.round(row.confidence * 100)}%` : '—'}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', color: row.detected ? '#81c784' : '#90a4ae' }}>
                    {row.detected ? 'Detected' : 'Not detected'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : (
        <Typography variant="caption" color="text.secondary">
          Place targets to see detection table.
        </Typography>
      )}
    </Box>
  );
}
