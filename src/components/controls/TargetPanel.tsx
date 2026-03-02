import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Divider,
} from '@mui/material';
import { Place as PlaceIcon, Clear as ClearIcon, PlayArrow as PlayIcon, Stop as StopIcon } from '@mui/icons-material';
import { useTargetStore, usePlatformStore, useEnvironmentStore, useSensorStore } from '../../store';
import { getDepthAtPosition } from '../../utils/bathymetryGenerator';
import { vec3 } from '../../utils/math';
import type { SearchArea } from '../../utils/coveragePath';

export function TargetPanel() {
  const {
    target,
    setTargetPosition,
    clearTarget,
    searchArea,
    setSearchArea,
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

  // Sync form when target is set externally
  useEffect(() => {
    if (target) {
      setPlaceX(target.position.x.toFixed(0));
      setPlaceY(target.position.y.toFixed(0));
      setPlaceDepth((-target.position.z).toFixed(0));
    }
  }, [target?.position.x, target?.position.y, target?.position.z]);

  const handlePlace = () => {
    const x = parseFloat(placeX) || 0;
    const y = parseFloat(placeY) || 0;
    const depthM = Math.max(0, parseFloat(placeDepth) || 0);
    setTargetPosition({ x, y, z: -depthM });
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
    console.log('[Coverage] Start clicked:', {
      area,
      trackSpacingM,
      surveyDepthM,
      platformPos: platform.position,
    });
    startAreaCoverage({ trackSpacingM, surveyDepthM, area });
  };

  // Object is only "detected" when sonar has actually reported it (SE > 0 in sonar equation)
  const isTargetDetectedBySonar =
    target && detections.some((d) => d.id.includes(target.id));

  // Computed target metrics (scientific: global coords, depths, ranges)
  const targetMetrics = target
    ? (() => {
        const { position } = target;
        const depthFromSurfaceM = -position.z; // positive = meters below surface
        const seabedDepthAtTargetM = getDepthAtPosition(bathymetry, position.x, position.y);
        const heightAboveSeabedM = seabedDepthAtTargetM - depthFromSurfaceM; // positive = target above bottom
        const slantRangeM = vec3.distance(platform.position, position);
        const verticalOffsetM = position.z - platform.position.z; // positive = target below sonar
        return {
          depthFromSurfaceM,
          seabedDepthAtTargetM,
          heightAboveSeabedM,
          slantRangeM,
          verticalOffsetM,
        };
      })()
    : null;

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ color: '#81d4fa', mb: 2 }}>
        Target placement
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        Place a single target in global coordinates. Sonar will detect it when in range and beam.
      </Typography>

      <Paper
        sx={{
          p: 2,
          mb: 2,
          backgroundColor: 'rgba(26, 58, 90, 0.3)',
          border: '1px solid rgba(79, 195, 247, 0.2)',
        }}
      >
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          <TextField
            size="small"
            label="X (m)"
            type="number"
            value={placeX}
            onChange={(e) => setPlaceX(e.target.value)}
            inputProps={{ min: bounds.minX, max: bounds.maxX, step: 1 }}
            sx={{
              '& .MuiOutlinedInput-root': { fontSize: '0.875rem' },
              '& .MuiInputLabel-root': { fontSize: '0.8rem' },
            }}
          />
          <TextField
            size="small"
            label="Y (m)"
            type="number"
            value={placeY}
            onChange={(e) => setPlaceY(e.target.value)}
            inputProps={{ min: bounds.minY, max: bounds.maxY, step: 1 }}
            sx={{
              '& .MuiOutlinedInput-root': { fontSize: '0.875rem' },
              '& .MuiInputLabel-root': { fontSize: '0.8rem' },
            }}
          />
          <TextField
            size="small"
            label="Depth (m, below surface)"
            type="number"
            value={placeDepth}
            onChange={(e) => setPlaceDepth(e.target.value)}
            inputProps={{ min: 0, max: bathymetry.maxDepth, step: 1 }}
            sx={{
              '& .MuiOutlinedInput-root': { fontSize: '0.875rem' },
              '& .MuiInputLabel-root': { fontSize: '0.8rem' },
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Button
            size="small"
            variant="contained"
            startIcon={<PlaceIcon />}
            onClick={handlePlace}
            sx={{
              backgroundColor: '#4fc3f7',
              color: '#0a1420',
              '&:hover': { backgroundColor: '#81d4fa' },
            }}
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
            Clear
          </Button>
        </Box>
      </Paper>

      <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
      <Typography variant="subtitle2" sx={{ color: '#81d4fa', mb: 2 }}>
        Area coverage (autonomous search)
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        Define a rectangle by coordinates. The platform will move automatically in a lawnmower pattern to cover the area while the sonar detects the placed object.
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

      {target && (
        <>
          <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
          {isTargetDetectedBySonar ? (
            <>
              <Typography variant="subtitle2" sx={{ color: '#81d4fa', mb: 2 }}>
                Target detection readings (sonar detected)
              </Typography>
          <Paper
            sx={{
              p: 2,
              backgroundColor: 'rgba(26, 58, 90, 0.2)',
              border: '1px solid rgba(255, 193, 7, 0.3)',
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Global coordinates
            </Typography>
            <Box sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#ffb74d', mb: 2 }}>
              <Box>X: {target.position.x.toFixed(2)} m</Box>
              <Box>Y: {target.position.y.toFixed(2)} m</Box>
              <Box>Z: {target.position.z.toFixed(2)} m</Box>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Depth from sea surface
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#90caf9', mb: 1.5 }}>
              {targetMetrics.depthFromSurfaceM.toFixed(2)} m
            </Typography>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Depth from seabed (height above bottom)
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#90caf9', mb: 1.5 }}>
              {targetMetrics.heightAboveSeabedM.toFixed(2)} m
              <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                (seabed at {targetMetrics.seabedDepthAtTargetM.toFixed(1)} m)
              </Typography>
            </Typography>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Distance from sonar to target (slant range)
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#81c784', mb: 1.5 }}>
              {targetMetrics.slantRangeM.toFixed(2)} m
            </Typography>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Depth from sonar to target (vertical offset)
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#81c784' }}>
              {targetMetrics.verticalOffsetM >= 0 ? '+' : ''}{targetMetrics.verticalOffsetM.toFixed(2)} m
              <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                {targetMetrics.verticalOffsetM > 0 ? '(target below sonar)' : '(target above sonar)'}
              </Typography>
            </Typography>
          </Paper>
            </>
          ) : (
            <Paper sx={{ p: 2, backgroundColor: 'rgba(26, 58, 90, 0.2)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <Typography variant="caption" color="text.secondary">
                Target placed — waiting for sonar detection
              </Typography>
              <Typography variant="body2" sx={{ color: '#90a4ae', mt: 0.5 }}>
                Move the platform so the target is in range and within the sonar beam. Readings will appear when the sonar equation detects the object.
              </Typography>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
}
