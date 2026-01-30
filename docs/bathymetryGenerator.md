# Bathymetry Generator (`src/utils/bathymetryGenerator.ts`)

Procedural seafloor (bathymetry) generation and sampling for the underwater sonar simulation. Produces depth grids and supports depth/normal lookups for ray tracing and 3D visualization.

---

## Internal Helpers (not exported)

### `noise2D(x, y, seed?)`
- **What:** 2D pseudo-random value in [0, 1] from coordinates and optional seed.
- **Why:** Base for procedural terrain; deterministic and fast.
- **Used by:** `smoothNoise`.

### `smoothNoise(x, y, seed)`
- **What:** Smoothed 2D noise using smoothstep interpolation between four `noise2D` samples.
- **Why:** Reduces blockiness and gives continuous terrain.
- **Used by:** `fbm`.

### `fbm(x, y, octaves, seed)`
- **What:** Fractal Brownian Motion: sum of `smoothNoise` at multiple frequencies/amplitudes, normalized.
- **Why:** Produces natural-looking terrain (hills, valleys) at multiple scales.
- **Used by:** `generateProceduralBathymetry` (for base terrain and features).

---

## Exported Functions

### `generateProceduralBathymetry(width, height, resolution, maxDepth)`
- **What:** Builds a `BathymetryData` grid: width/height in meters, resolution (points per unit), max depth (m). Uses FBM for base terrain, edge shelf, and seamount/trench features.
- **Why:** Main way to get a realistic, editable seafloor when no real data is loaded.
- **Where used:**
  - `src/store/environmentStore.ts` — initial bathymetry and when updating environment size/resolution/depth.

### `getDepthAtPosition(bathymetry, x, y)`
- **What:** Returns depth (meters) at world (x, y) via bilinear interpolation of the depth grid.
- **Why:** Ray tracer and other code need depth at arbitrary (x, y), not only grid nodes.
- **Where used:**
  - `src/core/raytracing/RayTracer.ts` — bottom depth for surface/bottom reflection and intersection.
  - `getSurfaceNormal` (this file) — depth samples for normal calculation.

### `getSurfaceNormal(bathymetry, x, y)`
- **What:** Returns unit normal `{ x, y, z }` at (x, y) using finite differences of depth (via `getDepthAtPosition`).
- **Why:** Bottom reflection in ray tracing needs the seafloor normal for correct reflection direction.
- **Where used:**
  - `src/core/raytracing/RayTracer.ts` — bottom normal at reflection point (for future use; reflection is currently simplified).

### `createFlatBathymetry(width, height, resolution, uniformDepth)`
- **What:** Builds `BathymetryData` with constant depth everywhere.
- **Why:** Testing, benchmarks, and simple scenarios without terrain variation.
- **Where used:** Re-exported from `src/utils/index.ts`; no other internal usage yet.

### `createSlopedBathymetry(width, height, resolution, shallowDepth, deepDepth, slopeDirection?)`
- **What:** Builds `BathymetryData` with a linear slope from shallow to deep along `'x'` or `'y'` (default `'x'`).
- **Why:** Testing refraction and ray bending over a known slope.
- **Where used:** Re-exported from `src/utils/index.ts`; no other internal usage yet.

---

## Types

- **`BathymetryData`** (from `../types`): `width`, `height`, `resolution`, `depths` (Float32Array), `minDepth`, `maxDepth`.

---

## Summary

| Function                         | Purpose                         | Used in                          |
|----------------------------------|---------------------------------|----------------------------------|
| `generateProceduralBathymetry`   | Procedural seafloor generation  | `environmentStore`                |
| `getDepthAtPosition`             | Depth at (x, y)                 | `RayTracer`, `getSurfaceNormal`   |
| `getSurfaceNormal`               | Seafloor normal at (x, y)       | `RayTracer`                      |
| `createFlatBathymetry`           | Flat bottom for tests           | Exported only                    |
| `createSlopedBathymetry`        | Sloped bottom for tests         | Exported only                    |
