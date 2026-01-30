# Acoustics (`src/core/physics/acoustics.ts`)

Underwater acoustic propagation: absorption, spreading loss, reflection, ambient noise, and array gain. Used by the ray tracer and sonar processor for transmission loss, reflections, and detection.

---

## Absorption

### `thorpAbsorption(frequency)`
- **What:** Absorption coefficient (dB/km) from Thorp; frequency in kHz. Valid for f &lt; ~50 kHz (boric acid, magnesium sulfate, pure water terms).
- **Why:** Simple frequency-dependent loss for quick estimates.
- **Where used:** Re-exported from `src/core/physics/index.ts`; no internal callers (simulation uses Francois-Garrison).

### `francoisGarrisonAbsorption(frequency, temperature, salinity, depth, pH?)`
- **What:** Absorption (dB/m) from Francois-Garrison; frequency in Hz, depth in m, pH default 8.0. More accurate over wider frequency and depth.
- **Why:** Realistic propagation loss for ray tracing and sonar.
- **Where used:**
  - `src/core/raytracing/RayTracer.ts` — constructor (precomputed dB/m) and along-ray absorption.
  - `transmissionLoss` (this file) — absorption term in total TL.

---

## Spreading and Total Transmission Loss

### `geometricSpreadingLoss(range, mode?)`
- **What:** Spreading loss (dB): spherical `20·log10(range)` or cylindrical `10·log10(range)`; range in m. Returns 0 if range ≤ 1.
- **Why:** Geometric loss is the main range-dependent term in the sonar equation.
- **Where used:** `transmissionLoss` (this file).

### `transmissionLoss(range, frequency, waterProperties, spreadingMode?)`
- **What:** Total transmission loss (dB) = geometric spreading + absorption. Uses `francoisGarrisonAbsorption` at ~50 m depth for absorption.
- **Why:** Single call for “path loss” in active/passive sonar equations.
- **Where used:** `src/core/sensors/SonarProcessor.ts` — TL in `processSonarPing` for each target (active and passive).

---

## Reflection

### `rayleighReflection(incidentAngle, densityRatio, speedRatio)`
- **What:** Magnitude of plane-wave reflection coefficient (0–1) at a fluid–fluid interface; grazing angle in radians. Handles total internal reflection when appropriate.
- **Why:** Theoretical reflection at surface/bottom for ray amplitude.
- **Where used:** Imported in `RayTracer.ts` but not called in current code (reserved for future reflection coefficient use).

### `seaSurfaceReflectionLoss(frequency, grazingAngle, seaState)`
- **What:** Surface reflection loss (dB) from Beckmann-Spizzichino–style roughness; sea state 0–9 (Douglas). Roughness parameter R ∝ wave height and sin(grazing angle)/wavelength.
- **Why:** Surface bounces in ray tracing should reduce intensity with sea state and angle.
- **Where used:** `src/core/raytracing/RayTracer.ts` — at each surface reflection in `traceRay`.

### `bottomReflectionLoss(grazingAngle, bottomType?)`
- **What:** Bottom reflection loss (dB) from empirical curves; bottomType in `'sand' | 'mud' | 'rock' | 'gravel'` (default `'sand'`). Loss depends on angle and type.
- **Why:** Bottom bounces in ray tracing should reduce intensity.
- **Where used:** `src/core/raytracing/RayTracer.ts` — at each bottom reflection in `traceRay`.

---

## Noise and Arrays

### `ambientNoiseLevel(frequency, seaState?, shippingLevel?)`
- **What:** Ambient noise spectral density (dB re 1 μPa²/Hz) from Wenz-style model: thermal, sea state (wind/waves), shipping, and a simple bio term. seaState 0–9, shipping 0–7.
- **Why:** Sonar equation needs NL for detection threshold and signal excess.
- **Where used:** `src/core/sensors/SonarProcessor.ts` — NL in `processSonarPing` (seaState from env, shipping fixed at 4).

### `arrayGain(numElements, spacing?, steeringAngle?)`
- **What:** Array gain (dB) for a uniform linear array: 10·log10(N) scaled by cos(steeringAngle). spacing (wavelengths) not used in this simplified form.
- **Why:** DI/AG term in sonar equation for array sensors.
- **Where used:** Re-exported from `src/core/physics/index.ts`; `SonarProcessor` uses `directivityIndex` from sensor config rather than computing array gain here (this is available for synthetic or simplified sensors).

---

## Dependencies

- **`getSoundSpeedAtDepth`** from `../../utils/soundSpeed` — imported but not used in current acoustics code (available for depth-dependent absorption).
- **`WaterProperties`** from `../../types` — used by `transmissionLoss`.

---

## Summary

| Function                       | Purpose              | Used in        |
|------------------------------|----------------------|----------------|
| `francoisGarrisonAbsorption` | Absorption (dB/m)    | RayTracer, TL  |
| `geometricSpreadingLoss`     | Spreading loss       | transmissionLoss |
| `transmissionLoss`           | Spreading + absorption | SonarProcessor |
| `seaSurfaceReflectionLoss`    | Surface loss         | RayTracer      |
| `bottomReflectionLoss`       | Bottom loss          | RayTracer      |
| `ambientNoiseLevel`          | Ambient NL           | SonarProcessor |
| `rayleighReflection`          | Interface coefficient| Imported in RayTracer (unused) |
| `thorpAbsorption`            | Simple absorption    | Exported only  |
| `arrayGain`                  | Linear array gain    | Exported only  |
