import type { BathymetryData } from '../types';

/**
 * Simple noise function for procedural generation
 */
function noise2D(x: number, y: number, seed: number = 12345): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Smoothed noise with interpolation
 */
function smoothNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;

  const sx = x - x0;
  const sy = y - y0;

  // Smoothstep interpolation
  const smoothX = sx * sx * (3 - 2 * sx);
  const smoothY = sy * sy * (3 - 2 * sy);

  const n00 = noise2D(x0, y0, seed);
  const n10 = noise2D(x1, y0, seed);
  const n01 = noise2D(x0, y1, seed);
  const n11 = noise2D(x1, y1, seed);

  const nx0 = n00 * (1 - smoothX) + n10 * smoothX;
  const nx1 = n01 * (1 - smoothX) + n11 * smoothX;

  return nx0 * (1 - smoothY) + nx1 * smoothY;
}

/**
 * Fractal Brownian Motion for realistic terrain
 */
function fbm(x: number, y: number, octaves: number, seed: number): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * smoothNoise(x * frequency, y * frequency, seed + i * 100);
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / maxValue;
}

/**
 * Generate procedural bathymetry data
 * @param width Width in meters
 * @param height Height in meters
 * @param resolution Points per unit (higher = more detail)
 * @param maxDepth Maximum depth in meters
 * @returns BathymetryData object
 */
export function generateProceduralBathymetry(
  width: number,
  height: number,
  resolution: number,
  maxDepth: number
): BathymetryData {
  const gridWidth = Math.floor(width / resolution);
  const gridHeight = Math.floor(height / resolution);
  const numPoints = gridWidth * gridHeight;
  const depths = new Float32Array(numPoints);

  const seed = Math.random() * 10000;
  let minDepth = maxDepth;
  let actualMaxDepth = 0;

  // Generate terrain features
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const idx = y * gridWidth + x;
      
      // Normalize coordinates for noise
      const nx = x / gridWidth;
      const ny = y / gridHeight;

      // Base terrain using FBM
      let depth = fbm(nx * 4, ny * 4, 6, seed) * 0.6;

      // Add some larger features (underwater mountains/valleys)
      depth += fbm(nx * 1.5, ny * 1.5, 3, seed + 1000) * 0.25;

      // Add continental shelf effect (shallower near edges)
      const edgeX = Math.min(nx, 1 - nx) * 2;
      const edgeY = Math.min(ny, 1 - ny) * 2;
      const edgeFactor = Math.min(edgeX, edgeY);
      depth = depth * 0.7 + edgeFactor * 0.3;

      // Add some random seafloor features
      const feature = fbm(nx * 10, ny * 10, 2, seed + 2000);
      if (feature > 0.7) {
        // Seamount
        depth -= (feature - 0.7) * 0.5;
      } else if (feature < 0.3) {
        // Trench
        depth += (0.3 - feature) * 0.3;
      }

      // Scale to actual depth range (ensure minimum depth of 10m)
      const scaledDepth = 10 + depth * (maxDepth - 10);
      depths[idx] = scaledDepth;

      minDepth = Math.min(minDepth, scaledDepth);
      actualMaxDepth = Math.max(actualMaxDepth, scaledDepth);
    }
  }

  return {
    width,
    height,
    resolution,
    depths,
    minDepth,
    maxDepth: actualMaxDepth,
  };
}

/**
 * Get depth at a specific world position
 */
export function getDepthAtPosition(
  bathymetry: BathymetryData,
  x: number,
  y: number
): number {
  const gridWidth = Math.floor(bathymetry.width / bathymetry.resolution);
  const gridHeight = Math.floor(bathymetry.height / bathymetry.resolution);

  // Convert world coordinates to grid coordinates
  const gx = Math.max(0, Math.min(gridWidth - 1, x / bathymetry.resolution));
  const gy = Math.max(0, Math.min(gridHeight - 1, y / bathymetry.resolution));

  // Bilinear interpolation
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const x1 = Math.min(x0 + 1, gridWidth - 1);
  const y1 = Math.min(y0 + 1, gridHeight - 1);

  const sx = gx - x0;
  const sy = gy - y0;

  const d00 = bathymetry.depths[y0 * gridWidth + x0];
  const d10 = bathymetry.depths[y0 * gridWidth + x1];
  const d01 = bathymetry.depths[y1 * gridWidth + x0];
  const d11 = bathymetry.depths[y1 * gridWidth + x1];

  const dx0 = d00 * (1 - sx) + d10 * sx;
  const dx1 = d01 * (1 - sx) + d11 * sx;

  return dx0 * (1 - sy) + dx1 * sy;
}

/**
 * Get surface normal at a position (for reflections)
 */
export function getSurfaceNormal(
  bathymetry: BathymetryData,
  x: number,
  y: number
): { x: number; y: number; z: number } {
  const eps = bathymetry.resolution;
  
  const d0 = getDepthAtPosition(bathymetry, x, y);
  const dx = getDepthAtPosition(bathymetry, x + eps, y) - d0;
  const dy = getDepthAtPosition(bathymetry, x, y + eps) - d0;

  // Cross product to get normal
  const nx = -dx / eps;
  const ny = -dy / eps;
  const nz = 1;

  // Normalize
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  return { x: nx / len, y: ny / len, z: nz / len };
}

/**
 * Create a flat bathymetry for testing
 */
export function createFlatBathymetry(
  width: number,
  height: number,
  resolution: number,
  uniformDepth: number
): BathymetryData {
  const gridWidth = Math.floor(width / resolution);
  const gridHeight = Math.floor(height / resolution);
  const numPoints = gridWidth * gridHeight;
  const depths = new Float32Array(numPoints).fill(uniformDepth);

  return {
    width,
    height,
    resolution,
    depths,
    minDepth: uniformDepth,
    maxDepth: uniformDepth,
  };
}

/**
 * Create a sloped bathymetry (for testing refraction)
 */
export function createSlopedBathymetry(
  width: number,
  height: number,
  resolution: number,
  shallowDepth: number,
  deepDepth: number,
  slopeDirection: 'x' | 'y' = 'x'
): BathymetryData {
  const gridWidth = Math.floor(width / resolution);
  const gridHeight = Math.floor(height / resolution);
  const numPoints = gridWidth * gridHeight;
  const depths = new Float32Array(numPoints);

  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const idx = y * gridWidth + x;
      const t = slopeDirection === 'x' ? x / (gridWidth - 1) : y / (gridHeight - 1);
      depths[idx] = shallowDepth + t * (deepDepth - shallowDepth);
    }
  }

  return {
    width,
    height,
    resolution,
    depths,
    minDepth: shallowDepth,
    maxDepth: deepDepth,
  };
}


