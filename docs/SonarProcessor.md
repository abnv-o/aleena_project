# Sonar Processor (`src/core/sensors/SonarProcessor.ts`)

Sonar signal processing: sonar equations (active and passive), beam pattern, ping processing (readings and detections), synthetic returns, and detection probability. Used by the simulation loop and UI to run sonar and show detections.

---

## Sonar Equations

### `activeSonarEquation(params)`
- **What:** Active sonar signal excess (dB): SE = SL − 2·TL + TS − (NL_bw − DI) − DT. Uses `params`: sourceLevel (SL), transmissionLoss (TL), targetStrength (TS), noiseLevel (NL), directivityIndex (DI), detectionThreshold (DT), bandwidth (for NL_bw). Positive SE = detected.
- **Why:** Standard active sonar detection criterion.
- **Where used:** `processSonarPing` (this file) when sensor type is active.

### `passiveSonarEquation(sourceLevel, transmissionLoss, noiseLevel, arrayGain, detectionThreshold, bandwidth)`
- **What:** Passive signal excess (dB): SE = SL − TL − (NL_bw − AG) − DT. sourceLevel is target radiated noise; arrayGain used as AG. Positive SE = detected.
- **Why:** Standard passive sonar detection criterion.
- **Where used:** `processSonarPing` (this file) when sensor type is passive.

---

## Beam Pattern

### `beamPatternResponse(angle, beamWidth)`
- **What:** Beam pattern response (dB) at off-axis angle (radians); 0 at boresight, negative off-axis. Uses sinc-like pattern; beamWidth is 3 dB width (radians). Capped at -40 dB.
- **Why:** Beam gain/loss for bearing-dependent signal level.
- **Where used:** `processSonarPing` (beam loss for each target), `calculate2DBeamPattern` (this file).

### `calculate2DBeamPattern(horizontalWidth, verticalWidth, resolution?)`
- **What:** Returns array of { bearing, elevation, intensity } for visualization; currently elevation fixed at 0, intensity from `beamPatternResponse` in horizontal plane. resolution default 360.
- **Why:** Beam shape for display (e.g. polar or 2D plot).
- **Where used:** Re-exported only; no internal callers yet.

---

## Ping Processing

### `processSonarPing(sensor, sensorWorldPosition, sensorVelocity, sensorHeading, targets, waterProperties, soundSpeedProfile, simulationTime)`
- **What:** For each target: bearing, slant range, beam pattern loss, transmission loss, Doppler shift, then active or passive SE. Builds `SensorReading[]` (bearing, range, intensity, doppler) and `Detection[]` when SE > 0 (position, bearing, range, signalExcess, classification, confidence).
- **Why:** Main entry point to “ping” once and get readings + detections.
- **Where used:** `src/App.tsx` — when simulating a sonar ping (e.g. on demand or in loop).

---

## Synthetic Returns

### `generateSonarReturns(sensor, sensorPosition, sensorHeading, targets, numBearingBins?, numRangeBins?)`
- **What:** Builds a Float32Array (bearing × range) with background noise, target blobs (with beam-like spread), and random clutter. Used for display imagery, not for detection logic.
- **Why:** Realistic-looking sonar display when no raw beamformed data is available.
- **Where used:** Re-exported only; available for waterfall/sonar display components.

---

## Detection Probability

### `detectionProbability(signalExcess)`
- **What:** Detection probability from signal excess using an approximation to 0.5·(1 + erf(SE/√2)) (complementary error function). Pd increases with SE.
- **Why:** Probabilistic detection for analysis or display (e.g. Pd vs range).
- **Where used:** Re-exported only; no internal callers yet.

---

## Dependencies

- **`vec3`, `calculateBearing`, `calculateSlantRange`, `calculateDopplerShift`, `dbToLinear`, `linearToDb`** (`utils/math`) — geometry and Doppler for each target; dB conversions for levels.
- **`transmissionLoss`, `ambientNoiseLevel`, `arrayGain`** (`core/physics/acoustics`) — path loss, NL, and (optionally) array gain for sonar equation.
- **`getSoundSpeedAtDepth`** (`utils/soundSpeed`) — sound speed at sensor depth for Doppler.

---

## Types (from `../../types`)

- **`Sensor`:** id, type (active/passive), frequency, sourceLevel, beamPattern, directivityIndex, detectionThreshold, bandwidth, maxRange, etc.
- **`Target`:** id, position, velocity, targetStrength, noiseLevel, type.
- **`SensorReading`:** sensorId, timestamp, bearing, range, intensity, doppler.
- **`Detection`:** id, sensorId, timestamp, position, bearing, range, signalExcess, classification, confidence.

---

## Summary

| Function                 | Purpose                    | Used in     |
|--------------------------|----------------------------|-------------|
| `activeSonarEquation`    | Active SE                  | processSonarPing |
| `passiveSonarEquation`   | Passive SE                | processSonarPing |
| `beamPatternResponse`    | Beam gain/loss (dB)        | processSonarPing, calculate2DBeamPattern |
| `processSonarPing`       | Readings + detections      | App.tsx     |
| `calculate2DBeamPattern` | Beam for display           | Exported only |
| `generateSonarReturns`   | Synthetic display data     | Exported only |
| `detectionProbability`   | Pd from SE                 | Exported only |
