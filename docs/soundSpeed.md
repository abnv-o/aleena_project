# Sound Speed (`src/utils/soundSpeed.ts`)

Sound speed and temperature vs depth for the ocean. Provides empirical equations, profile construction, and depth-based lookups used by ray tracing, acoustics, and environment setup.

---

## Sound Speed Equations

### `mackenzieEquation(temperature, salinity, depth)`
- **What:** Sound speed (m/s) from Mackenzie (1981): temperature (°C), salinity (PSU), depth (m). Valid for T ≈ 2–30°C, S ≈ 25–40 PSU, D ≈ 0–8000 m.
- **Why:** Standard, simple formula for ocean sound speed in the simulation.
- **Where used:** `createProfileFromProperties` (this file) to build profile layers.

### `unescoSoundSpeed(temperature, salinity, pressure)`
- **What:** Sound speed (m/s) from UNESCO (Chen & Millero, 1977); pressure in dbar (≈ depth in m).
- **Why:** Alternative, more accurate option for research or validation.
- **Where used:** Re-exported only; no internal callers yet.

---

## Profile Creation

### `createDefaultSoundSpeedProfile()`
- **What:** Returns a `SoundSpeedProfile` with fixed layers approximating a deep-ocean profile (thermocline, SOFAR channel, deep layer).
- **Why:** Sensible default when no environment or CSV is loaded.
- **Where used:** `src/store/environmentStore.ts` — initial environment state.

### `createProfileFromProperties(waterProperties, maxDepth, numLayers?)`
- **What:** Builds `SoundSpeedProfile` from surface temperature/salinity and a simple thermocline model up to `maxDepth` with `numLayers` (default 20). Uses `mackenzieEquation` per layer.
- **Why:** Environment-driven profile when user sets water properties.
- **Where used:** Re-exported; available for UI or env updates that create profile from properties.

---

## Depth-Based Lookups

### `getSoundSpeedAtDepth(profile, depth)`
- **What:** Sound speed (m/s) at a given depth by linear interpolation between profile layers; extrapolates at top/bottom.
- **Why:** Ray tracing and propagation need local sound speed at each depth.
- **Where used:**
  - `src/core/raytracing/RayTracer.ts` — speed along ray and in Snell’s law.
  - `src/core/sensors/SonarProcessor.ts` — speed at sensor depth for Doppler.
  - `src/core/physics/acoustics.ts` — imported but not used in current snippet (available for absorption/depth-dependent models).

### `getTemperatureAtDepth(profile, depth)`
- **What:** Temperature (°C) at depth by linear interpolation between layers.
- **Why:** Absorption and other depth/temperature-dependent acoustics.
- **Where used:** Re-exported only; no internal callers yet.

### `getSoundSpeedGradient(profile, depth, epsilon?)`
- **What:** Numerical derivative of sound speed with respect to depth at `depth`, using ±`epsilon` (default 1 m).
- **Why:** Ray bending (Snell’s law) depends on dc/dz.
- **Where used:** `src/core/raytracing/RayTracer.ts` — gradient at current depth in `applySnellsLaw`.

### `findSOFARChannelDepth(profile)`
- **What:** Depth (m) of the layer with minimum sound speed in the profile.
- **Why:** SOFAR channel depth is important for long-range propagation and display.
- **Where used:** Re-exported only; no internal callers yet.

---

## Types (from `../types`)

- **`SoundSpeedProfile`:** `{ layers: SoundSpeedLayer[] }`.
- **`SoundSpeedLayer`:** `depth`, `speed`, `temperature`, `salinity`.
- **`WaterProperties`:** e.g. `temperature`, `salinity`, `pH` (used by `createProfileFromProperties`).

---

## Summary

| Function                         | Purpose                    | Used in                    |
|----------------------------------|----------------------------|----------------------------|
| `mackenzieEquation`              | c(T, S, D)                 | `createProfileFromProperties` |
| `createDefaultSoundSpeedProfile` | Default ocean profile      | `environmentStore`         |
| `getSoundSpeedAtDepth`           | c at depth                 | RayTracer, SonarProcessor  |
| `getSoundSpeedGradient`          | dc/dz at depth             | RayTracer                  |
| `createProfileFromProperties`    | Profile from water props   | Exported only              |
| `getTemperatureAtDepth`          | T at depth                 | Exported only              |
| `findSOFARChannelDepth`          | SOFAR depth                | Exported only              |
| `unescoSoundSpeed`               | UNESCO c(T, S, P)          | Exported only              |
