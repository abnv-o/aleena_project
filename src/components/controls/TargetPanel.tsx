import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Divider,
} from '@mui/material';
import { Place as PlaceIcon, Clear as ClearIcon } from '@mui/icons-material';
import { useTargetStore, usePlatformStore, useEnvironmentStore } from '../../store';
import { getDepthAtPosition } from '../../utils/bathymetryGenerator';
import { vec3 } from '../../utils/math';

export function TargetPanel() {
  const { target, setTargetPosition, clearTarget } = useTargetStore();
  const platform = usePlatformStore((s) => s.platform);
  const bathymetry = useEnvironmentStore((s) => s.environment.bathymetry);

  const [placeX, setPlaceX] = useState('500');
  const [placeY, setPlaceY] = useState('500');
  const [placeDepth, setPlaceDepth] = useState('100');

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

  const bounds = useEnvironmentStore((s) => s.environment.bounds);

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

      {target && targetMetrics && (
        <>
          <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
          <Typography variant="subtitle2" sx={{ color: '#81d4fa', mb: 2 }}>
            Target detection readings
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
      )}
    </Box>
  );
}
