import { useMemo, memo } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useSensorStore, usePlatformStore } from '../../store';
import type { BathymetryData } from '../../types';

const MAX_GRID = 48;
const OUTSIDE_COLOR = 'rgba(30, 40, 60, 0.5)';

/** Depth color scale: shallow (light) → deep (dark) with distinct bands. t in [0,1]. */
const DEPTH_COLORS: { t: number; r: number; g: number; b: number }[] = [
  { t: 0, r: 126, g: 200, b: 227 },   // Shallow — light cyan
  { t: 0.2, r: 79, g: 195, b: 247 },  // Shallow–medium
  { t: 0.4, r: 33, g: 150, b: 243 },  // Medium — blue
  { t: 0.6, r: 25, g: 118, b: 210 },  // Deep — dark blue
  { t: 0.8, r: 13, g: 71, b: 161 },   // Very deep
  { t: 1, r: 10, g: 40, b: 80 },      // Abyssal — navy
];

function depthToColor(depth: number, minDepth: number, maxDepth: number): string {
  const t = Math.max(0, Math.min(1, (depth - minDepth) / (maxDepth - minDepth || 1)));
  let i = 0;
  for (; i < DEPTH_COLORS.length - 1 && t > DEPTH_COLORS[i + 1].t; i++) {}
  const a = DEPTH_COLORS[i];
  const b = DEPTH_COLORS[Math.min(i + 1, DEPTH_COLORS.length - 1)];
  const s = (t - a.t) / (b.t - a.t || 1);
  const r = Math.round(a.r + s * (b.r - a.r));
  const g = Math.round(a.g + s * (b.g - a.g));
  const bVal = Math.round(a.b + s * (b.b - a.b));
  return `rgb(${r},${g},${bVal})`;
}

/** Check if world point (x, y) is inside the sensor coverage sector (platform, heading, horizontal width, max range). Heading 0 = +X, 90 = +Y. */
function isInsideSensorSector(
  x: number,
  y: number,
  platformX: number,
  platformY: number,
  headingDeg: number,
  horizontalWidthDeg: number,
  maxRange: number
): boolean {
  const dx = x - platformX;
  const dy = y - platformY;
  const range = Math.sqrt(dx * dx + dy * dy);
  if (range > maxRange || range < 1e-6) return false;
  const bearingRad = Math.atan2(dy, dx);
  const headingRad = (headingDeg * Math.PI) / 180;
  let rel = bearingRad - headingRad;
  while (rel > Math.PI) rel -= 2 * Math.PI;
  while (rel < -Math.PI) rel += 2 * Math.PI;
  const halfWidthRad = (horizontalWidthDeg * Math.PI) / 180 * 0.5;
  return Math.abs(rel) <= halfWidthRad;
}

/** Stable key for sensor coverage (platform rounded + first active sensor config). */
function getCoverageKey(
  sensors: Map<string, { isActive: boolean; beamPattern: { horizontalWidth: number }; maxRange: number }>,
  px: number,
  py: number,
  heading: number
): string {
  const active = Array.from(sensors.values()).find((s) => s.isActive);
  if (!active) return `none-${Math.round(px)}-${Math.round(py)}`;
  return `${Math.round(px)}-${Math.round(py)}-${heading}-${active.beamPattern.horizontalWidth}-${active.maxRange}`;
}

interface BathymetryChartProps {
  bathymetry: BathymetryData;
  platformPosition?: { x: number; y: number };
  height?: number;
}

function BathymetryChartInner({
  bathymetry,
  platformPosition,
  height = 220,
}: BathymetryChartProps) {
  const platform = usePlatformStore((state) => state.platform);
  const sensors = useSensorStore((state) => state.sensors);

  const gridWidth = Math.floor(bathymetry.width / bathymetry.resolution);
  const gridHeight = Math.floor(bathymetry.height / bathymetry.resolution);
  const stepX = Math.max(1, Math.floor(gridWidth / MAX_GRID));
  const stepY = Math.max(1, Math.floor(gridHeight / MAX_GRID));

  const coverageKey = getCoverageKey(
    sensors,
    platformPosition?.x ?? platform.position.x,
    platformPosition?.y ?? platform.position.y,
    platform.heading
  );

  const { cells, platformCell, nCols, nRows } = useMemo(() => {
    const px = platformPosition?.x ?? platform.position.x;
    const py = platformPosition?.y ?? platform.position.y;
    const heading = platform.heading;
    const activeSensor = Array.from(sensors.values()).find((s) => s.isActive);
    const horizontalWidth = activeSensor?.beamPattern.horizontalWidth ?? 120;
    const maxRange = activeSensor?.maxRange ?? 5000;

    const cells: { x: number; y: number; depth: number; color: string; inCoverage: boolean }[] = [];
    const minD = bathymetry.minDepth;
    const maxD = bathymetry.maxDepth;

    for (let gy = 0; gy < gridHeight; gy += stepY) {
      for (let gx = 0; gx < gridWidth; gx += stepX) {
        const idx = gy * gridWidth + gx;
        if (idx >= bathymetry.depths.length) continue;
        const depth = bathymetry.depths[idx];
        const x = gx * bathymetry.resolution;
        const y = gy * bathymetry.resolution;
        const inCoverage = isInsideSensorSector(
          x,
          y,
          px,
          py,
          heading,
          horizontalWidth,
          maxRange
        );
        cells.push({
          x,
          y,
          depth,
          color: inCoverage ? depthToColor(depth, minD, maxD) : OUTSIDE_COLOR,
          inCoverage,
        });
      }
    }

    const nCols = Math.ceil(gridWidth / stepX);
    const nRows = Math.ceil(gridHeight / stepY);
    const platformCell = { x: px, y: py };

    return { cells, platformCell, nCols, nRows };
  }, [bathymetry, gridWidth, gridHeight, stepX, stepY, coverageKey]);

  return (
    <Paper
      sx={{
        p: 1.5,
        backgroundColor: 'rgba(10, 20, 40, 0.8)',
        border: '1px solid #1a3a5a',
        borderRadius: 1,
      }}
    >
      <Typography
        variant="caption"
        sx={{ color: '#4fc3f7', display: 'block', mb: 1 }}
      >
        Sea Bottom — Sensor Coverage Area Only
      </Typography>

      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height,
          borderRadius: 1,
          overflow: 'hidden',
          border: '1px solid rgba(79, 195, 247, 0.3)',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${nCols}, 1fr)`,
            gridTemplateRows: `repeat(${nRows}, 1fr)`,
            width: '100%',
            height: '100%',
            gap: 0,
          }}
        >
          {cells.map((cell) => (
            <Box
              key={`${cell.x}-${cell.y}`}
              sx={{
                backgroundColor: cell.color,
                minWidth: 2,
                minHeight: 2,
              }}
              title={
                cell.inCoverage
                  ? `X: ${cell.x.toFixed(0)} m, Y: ${cell.y.toFixed(0)} m, Depth: ${cell.depth.toFixed(1)} m (in coverage)`
                  : `X: ${cell.x.toFixed(0)} m, Y: ${cell.y.toFixed(0)} m (outside sensor coverage)`
              }
            />
          ))}
        </Box>

        {platformCell && (
          <Box
            sx={{
              position: 'absolute',
              left: `${(platformCell.x / bathymetry.width) * 100}%`,
              top: `${(platformCell.y / bathymetry.height) * 100}%`,
              transform: 'translate(-50%, -50%)',
              width: 10,
              height: 10,
              borderRadius: '50%',
              border: '2px solid #00ff00',
              backgroundColor: 'rgba(0,255,0,0.4)',
              boxShadow: '0 0 8px #00ff00',
            }}
            title={`Platform: X ${platformCell.x.toFixed(0)} m, Y ${platformCell.y.toFixed(0)} m`}
          />
        )}
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mt: 1,
          pt: 1,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          fontSize: '0.7rem',
          color: '#6b8cae',
        }}
      >
        <span>X: 0 – {bathymetry.width} m</span>
        <span>Y: 0 – {bathymetry.height} m</span>
        <span>Depth: {bathymetry.minDepth.toFixed(0)} – {bathymetry.maxDepth.toFixed(0)} m</span>
      </Box>
    </Paper>
  );
}

export const BathymetryChart = memo(BathymetryChartInner);
