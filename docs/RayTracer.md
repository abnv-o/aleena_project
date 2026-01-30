# Ray Tracer (`src/core/raytracing/RayTracer.ts`)

Acoustic ray tracing through a stratified ocean with depth-varying sound speed. Uses Snell’s law for bending and models surface/bottom reflections and absorption. Produces ray paths and supports eigenray search for source–receiver links.

---

## Class: `RayTracer`

### Constructor `RayTracer(options)`
- **What:** Builds a ray tracer from `soundSpeedProfile`, `bathymetry`, `waterProperties` (temperature, salinity, pH, seaState), and `frequency`. Precomputes absorption (dB/m) with Francois-Garrison.
- **Why:** Central object for acoustic propagation; encapsulates environment and frequency.
- **Where used:** Created via `createRayTracer` from `useSimulationLoop` and `App.tsx`.

### `trace(sourcePosition, config)`
- **What:** Traces `config.numRays` rays from `sourcePosition` over angles from `config.minAngle` to `config.maxAngle` (degrees). Returns `RayTracingResult`: rays, source position, timestamp, config.
- **Why:** Main entry point for fan of rays from a sensor or source.
- **Where used:** `src/hooks/useSimulationLoop.ts`, `src/App.tsx` — when running ray tracing for a sensor.

### `traceRay(source, launchAngleDeg, config)` (private)
- **What:** Traces one ray: launch angle in degrees (positive = up), step-by-step march using Snell’s law, surface/bottom reflection (with reflection loss), absorption, and termination (max range, max bounces, absorbed, out of bounds). Returns a single `Ray` with points, total distance/time, bounces, and termination reason.
- **Why:** Core propagation logic; used by `trace` for each ray.
- **Used by:** `trace`.

### `applySnellsLaw(direction, soundSpeed, gradient, stepSize)` (private)
- **What:** Updates ray direction for one step in a stratified medium: uses vertical sound speed gradient to compute dθ/ds and advances ray angle, keeping horizontal bearing.
- **Why:** Ray bending in depth-varying sound speed (Snell’s law in stratified medium).
- **Used by:** `traceRay` when gradient is non-negligible.

### `findEigenrays(source, receiver, angleTolerance?, maxIterations?)`
- **What:** Finds rays that pass near `receiver`: coarse fan from source, then selects rays whose segments come within ~5% of range of receiver. angleTolerance and maxIterations reserved for future refinement.
- **Why:** Source–receiver paths for propagation loss and display.
- **Where used:** Re-exported; available for eigenray-based TL or visualization.

### `pointToSegmentDistance(point, start, end)` (private)
- **What:** Shortest distance from point to line segment (start–end); uses projection onto segment.
- **Why:** Eigenray search needs “distance from receiver to ray segment.”
- **Used by:** `findEigenrays`.

---

## Factory and Config

### `createRayTracer(soundSpeedProfile, bathymetry, waterProperties, frequency)`
- **What:** Returns a new `RayTracer` with the given options.
- **Why:** Convenience factory so callers don’t construct the class directly.
- **Where used:** `src/hooks/useSimulationLoop.ts`, `src/App.tsx` — when creating the ray tracer for a sensor.

### `getDefaultRayTracingConfig(maxRange?)`
- **What:** Returns default `RayTracingConfig`: 31 rays, -30° to 30°, given maxRange, 10 bounces, step size from maxRange/1000, absorption threshold 0.001.
- **Why:** Consistent defaults for ray tracing runs.
- **Where used:** `src/hooks/useSimulationLoop.ts`, `src/App.tsx` — when running ray tracing (optionally with sensor max range or 5000 m).

---

## Dependencies

- **`getSoundSpeedAtDepth`, `getSoundSpeedGradient`** (`utils/soundSpeed`) — local sound speed and gradient for Snell’s law and ray points.
- **`getDepthAtPosition`, `getSurfaceNormal`** (`utils/bathymetryGenerator`) — bottom depth and normal for bottom reflection.
- **`vec3`, `degToRad`** (`utils/math`) — vector math and angle conversion.
- **`rayleighReflection`, `seaSurfaceReflectionLoss`, `bottomReflectionLoss`, `francoisGarrisonAbsorption`** (`core/physics/acoustics`) — reflection losses and absorption; `rayleighReflection` is imported but not used in current code.

---

## Types (from `../../types`)

- **`RayTracingConfig`:** numRays, minAngle, maxAngle, maxRange, maxBounces, stepSize, absorptionThreshold.
- **`Ray`, `RayPoint`, `RayTracingResult`:** Ray path, per-point data (position, time, intensity, soundSpeed), and result bundle.

---

## Summary

| Export / Method           | Purpose                         | Used in              |
|--------------------------|----------------------------------|----------------------|
| `RayTracer`              | Ray tracing engine              | createRayTracer      |
| `trace`                  | Fan of rays from source          | useSimulationLoop, App |
| `createRayTracer`        | Factory for RayTracer            | useSimulationLoop, App |
| `getDefaultRayTracingConfig` | Default config              | useSimulationLoop, App |
| `findEigenrays`          | Rays near receiver               | Exported only        |
