# Math Utilities (`src/utils/math.ts`)

Shared math for angles, vectors, decibels, and sonar-related geometry (bearing, range, elevation, Doppler). Used across platform control, ray tracing, and sonar processing.

---

## Angle Conversion

### `degToRad(degrees)`
- **What:** Converts degrees to radians.
- **Why:** Many APIs (e.g. `Math.sin`, ray angles) use radians.
- **Where used:** `src/core/platform/PlatformController.ts`, `src/core/raytracing/RayTracer.ts`, `euler.fromDegrees` (this file).

### `radToDeg(radians)`
- **What:** Converts radians to degrees.
- **Why:** UI and config often use degrees.
- **Where used:** `euler.toDegrees`, `calculateBearing`, `calculateElevation`, `normalizeAngle` (this file).

---

## Scalar Math

### `clamp(value, min, max)`
- **What:** Clamps a number to [min, max].
- **Why:** Keeps values in valid ranges (e.g. interpolation, angles).
- **Where used:** `smoothstep`, `vec3.toSpherical` (this file).

### `lerp(a, b, t)`
- **What:** Linear interpolation: `a + (b - a) * t`.
- **Why:** Interpolation between values and in `vec3.lerp`.
- **Where used:** `vec3.lerp` (this file).

### `smoothstep(edge0, edge1, x)`
- **What:** Smooth interpolation in [0, 1] between edges, with smooth derivative.
- **Why:** Smoother transitions than linear (e.g. UI, procedural generation).
- **Where used:** Re-exported; `bathymetryGenerator` uses similar logic internally.

---

## Vector3 (`vec3`)

### `vec3.add`, `vec3.subtract`, `vec3.multiply`, `vec3.divide`
- **What:** Component-wise add, subtract, multiply by scalar, divide by scalar.
- **Why:** Standard vector arithmetic for positions and directions.
- **Where used:** `RayTracer` (subtract, distance, normalize), `SonarProcessor` (Doppler), `App.tsx` (vec3 usage).

### `vec3.dot`, `vec3.cross`
- **What:** Dot product and cross product.
- **Why:** Angles, projections, normals, reflection/refraction.
- **Where used:** `RayTracer` (direction, reflection), `SonarProcessor` (Doppler), `reflect`, `refract`, `rotateAroundAxis`.

### `vec3.length`, `vec3.lengthSquared`, `vec3.normalize`
- **What:** Length, length², unit vector (or zero if length 0).
- **Why:** Distances and normalized directions.
- **Where used:** `RayTracer` (distance, normalize), `calculateSlantRange`, `calculateDopplerShift`, `reflect`, `refract`, etc.

### `vec3.distance(a, b)`
- **What:** 3D distance between two points.
- **Why:** Range and step length in ray tracing and sonar.
- **Where used:** `RayTracer`, `SonarProcessor` (via `calculateSlantRange`), `calculateDopplerShift`.

### `vec3.lerp(a, b, t)`
- **What:** Component-wise linear interpolation.
- **Why:** Smooth motion and interpolation between positions/directions.
- **Where used:** Re-exported; available for animations and interpolation.

### `vec3.zero`, `vec3.one`, `vec3.up`, `vec3.down`, `vec3.forward`, `vec3.right`
- **What:** Constant vectors for axes and defaults.
- **Why:** Conventions (e.g. z-up) and default values.
- **Where used:** `RayTracer` (e.g. down for bottom), other code that needs axis vectors.

### `vec3.reflect(incident, normal)`
- **What:** Reflection of incident vector about a unit normal.
- **Why:** Surface and bottom reflections in acoustics.
- **Where used:** Re-exported; available for reflection logic (e.g. future bottom reflection in `RayTracer`).

### `vec3.refract(incident, normal, eta)`
- **What:** Refraction; returns `null` for total internal reflection.
- **Why:** Snell’s law at boundaries (e.g. surface/bottom).
- **Where used:** Re-exported; available for refraction modeling.

### `vec3.rotateAroundAxis(v, axis, angle)`
- **What:** Rotates vector `v` by `angle` (radians) around unit `axis` (Rodrigues formula).
- **Why:** Orienting beams and platform heading.
- **Where used:** Re-exported; available for 3D rotations.

### `vec3.fromSpherical(radius, theta, phi)`, `vec3.toSpherical(v)`
- **What:** Convert between Cartesian and spherical (radius, theta, phi).
- **Why:** Beam patterns and spherical geometry.
- **Where used:** Re-exported; available for spherical representations.

---

## Euler Angles (`euler`)

### `euler.zero`, `euler.fromDegrees(x, y, z)`, `euler.toDegrees(e)`
- **What:** Zero orientation and conversion between degrees and radians for Euler angles.
- **Why:** Platform/orientation often in degrees; math in radians.
- **Where used:** Re-exported; used where orientation is in Euler form.

---

## Decibels

### `linearToDb(linear)`, `dbToLinear(db)`
- **What:** Amplitude ↔ dB (20·log₁₀ and 10^(dB/20)).
- **Why:** Sonar levels and beam patterns are usually in dB.
- **Where used:** `SonarProcessor` (imports `dbToLinear`, `linearToDb` for level handling).

### `powerToDb(power)`, `dbToPower(db)`
- **What:** Power ↔ dB (10·log₁₀ and 10^(dB/10)).
- **Why:** Intensity/power in sonar equations.
- **Where used:** Re-exported; available for power-based calculations.

---

## Angles (Degrees)

### `normalizeAngle(degrees)`
- **What:** Wraps angle to [-180, 180].
- **Why:** Display and comparison of angles.
- **Where used:** Re-exported; used where symmetric angle range is needed.

### `normalizeAngle360(degrees)`
- **What:** Wraps angle to [0, 360).
- **Why:** Compass-style bearing.
- **Where used:** `calculateBearing` (this file); useful for bearing display.

---

## Geometry (Positions → Angles and Ranges)

### `calculateBearing(from, to)`
- **What:** Bearing from `from` to `to` in degrees [0, 360), using atan2(dx, dy).
- **Why:** Sonar bearing and beam pointing.
- **Where used:** `src/core/sensors/SonarProcessor.ts` (bearing to target, relative bearing, beam).

### `calculateRange(from, to)`
- **What:** Horizontal distance (ignores z).
- **Why:** Horizontal range when depth is separate.
- **Where used:** `calculateElevation` (this file).

### `calculateSlantRange(from, to)`
- **What:** 3D distance between two points.
- **Why:** Sonar range and propagation loss.
- **Where used:** `src/core/sensors/SonarProcessor.ts` (range to target, display).

### `calculateElevation(from, to)`
- **What:** Elevation/depression angle (degrees) from horizontal.
- **Why:** Vertical angle to target for 3D sonar.
- **Where used:** Re-exported; available for elevation display and beam logic.

### `calculateDopplerShift(frequency, sourcePosition, sourceVelocity, receiverPosition, receiverVelocity, soundSpeed)`
- **What:** Doppler shift in Hz from relative radial velocity and sound speed; positive when approaching.
- **Why:** Active/passive sonar need Doppler for classification and display.
- **Where used:** `src/core/sensors/SonarProcessor.ts` (Doppler in `processSonarPing` and readings).

---

## Summary

| Function / Object | Purpose                     | Used in                          |
|-------------------|-----------------------------|----------------------------------|
| `degToRad`        | Degrees → radians           | PlatformController, RayTracer    |
| `vec3.*`          | Vector math                 | RayTracer, SonarProcessor, App   |
| `calculateBearing`| Bearing between positions   | SonarProcessor                   |
| `calculateSlantRange` | 3D range                 | SonarProcessor                   |
| `calculateDopplerShift` | Doppler shift           | SonarProcessor                   |
| `dbToLinear`, `linearToDb` | dB ↔ linear           | SonarProcessor                   |
| `clamp`, `normalizeAngle360` | Platform/orientation  | PlatformController, bearing      |
