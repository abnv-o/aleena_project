# How We Test: Inputs, Outputs, and Expected vs Real Results

This document explains **how testing works**, **where inputs come from**, **what each test outputs**, and **expected vs actual results** for every validation test.

---

## 1. How we test

- **Framework:** Vitest. We run `npm run test`; Vitest loads the test files, runs each `it(...)` block, and reports pass/fail.
- **Process:**
  1. **Inputs** are set in the test (numbers or objects from the reference document).
  2. We **call the simulation function** (e.g. `mackenzieEquation(15, 35, 0)` or `transmissionLoss(...)`).
  3. The function returns a **real output** (one number or value).
  4. We **compare** that to the **expected output** from the reference (IEEE / DOSITS).
  5. We **assert** that the real output meets the **pass condition** (e.g. within 0.5% or within 0.1 dB).
- **Where inputs come from:** They are **hardcoded in the test file** using values from:
  - **IEEE / validation slide** for sound speed (1506.6 m/s, 1449.2 m/s).
  - **DOSITS “Sonar Equation Example: Active Sonar”** (docs/single_reference_validation.md.pdf) for TL and SNR (80 dB, 85 dB, 22 dB, etc.).
- **No UI or config:** Tests do not read from the app’s UI or config; they call the same functions the app uses, with fixed inputs written in code.

---

## 2. All inputs used in the tests

### Shared inputs (used in several tests)

| Input | Value | Unit | Source / meaning |
|------|--------|------|-------------------|
| **waterProperties** | temperature: 12, salinity: 35, density: 1025, pH: 8, seaState: 2 | — | Typical ocean; used for TL and absorption |
| **Range (acoustics)** | 10 000 (and 1000 in one test) | m | Distance from source (DOSITS: 10 km) |
| **Frequency (DOSITS)** | 8 000 | Hz | DOSITS example: 8 kHz |
| **Frequency (other)** | 10 000, 50 000 | Hz | 10 kHz and 50 kHz test cases |
| **Spreading mode** | `'spherical'` | — | Geometric spreading type |
| **Absorption override** | 0.5 (when used) | dB/km | DOSITS value at 8 kHz |

### Per-test inputs (summary)

- **Sound speed:** `(temperature, salinity, depth)` → (15, 35, 0) and (0, 35, 0).
- **SOFAR:** Profile from `createProfileFromProperties(waterProperties, 3000, 200)` or `createDefaultSoundSpeedProfile()`.
- **Spreading:** `(range, mode)` → (10_000, 'spherical').
- **Transmission loss:** `(range, frequency, waterProperties, spreadingMode, absorptionDbPerKm?)` with values above; one test uses range 1000, frequency 10_000, no absorption override.
- **Absorption (FG):** `(frequency, temperature, salinity, depth, pH)` → (50_000, 12, 35, 250, 8).
- **Active sonar equation:** one object with SL, TL, TS, NL, DI, DT, bandwidth (see table below).

---

## 3. Test-by-test: inputs, output, expected, real, pass condition

Each row is one test. **Inputs** = what we pass in. **Output** = what the function returns. **Expected** = from reference. **Real** = simulation result. **Pass** = condition that must hold.

---

### Sound speed (Mackenzie)

| Test | Inputs | Output | Expected | Real | Pass? |
|------|--------|--------|----------|------|------|
| **1. 15°C, 35 PSU, 0 m** | `temperature=15`, `salinity=35`, `depth=0` | Sound speed (m/s) | 1506.6 | ~1506.69 | Yes: error ≤ 0.5%, within 0.5 m/s |
| **2. 0°C, 35 PSU, 0 m** | `temperature=0`, `salinity=35`, `depth=0` | Sound speed (m/s) | 1449.2 | 1448.96 | Yes: error ≤ 0.5%, within 0.5 m/s |

**How inputs are given:** Direct arguments: `mackenzieEquation(15, 35, 0)` and `mackenzieEquation(0, 35, 0)`.

---

### SOFAR channel depth

| Test | Inputs | Output | Expected | Real | Pass? |
|------|--------|--------|----------|------|------|
| **3. Plausible range** | Profile from `createProfileFromProperties({ temperature:20, salinity:35, density:1025, pH:8, seaState:2 }, 3000, 200)` | SOFAR depth (m) | In [0, 2000] | Depends on profile (e.g. hundreds of m) | Yes: 0 ≤ depth ≤ 2000 |
| **4. Min-speed depth** | Profile from `createDefaultSoundSpeedProfile()` | SOFAR depth (m) | Depth of layer with min speed | Same as min-speed layer depth | Yes: equal |

**How inputs are given:** We build a profile (water properties + max depth + number of layers) in code; no user input.

---

### Geometric spreading

| Test | Inputs | Output | Expected | Real | Pass? |
|------|--------|--------|----------|------|------|
| **5. Spreading 10 km** | `range=10_000`, `mode='spherical'` | Spreading loss (dB) | 80 | 80 | Yes: within 0.1 dB |

**How inputs are given:** `geometricSpreadingLoss(10_000, 'spherical')`.

---

### Transmission loss (with constant α)

| Test | Inputs | Output | Expected | Real | Pass? |
|------|--------|--------|----------|------|------|
| **6. Absorption + TL** | `range=10_000`, `frequency=8000`, `waterProperties`, `'spherical'`, `absorptionDbPerKm=0.5` | Spreading (dB), absorption (dB), total TL (dB) | 80, 5, 85 | 80, 5, 85 | Yes: all within 0.1 dB |
| **7. Total TL** | Same as above | Total TL (dB) | 85 | 85 | Yes: within 0.1 dB |

**How inputs are given:** `transmissionLoss(10_000, 8000, waterProperties, 'spherical', 0.5)`. The `0.5` is the DOSITS absorption in dB/km.

---

### Transmission loss (Francois-Garrison, no override)

| Test | Inputs | Output | Expected | Real | Pass? |
|------|--------|--------|----------|------|------|
| **8. TL 1 km, 10 kHz** | `range=1000`, `frequency=10_000`, `waterProperties`, `'spherical'` (no 5th arg) | Total TL (dB) | In [55, 70] | Computed by FG (e.g. ~62) | Yes: 55 ≤ TL ≤ 70 |

**How inputs are given:** `transmissionLoss(1000, 10_000, waterProperties, 'spherical')`.

---

### Francois-Garrison absorption

| Test | Inputs | Output | Expected | Real | Pass? |
|------|--------|--------|----------|------|------|
| **9. 50 kHz, 500 m** | `frequency=50_000`, `temperature=12`, `salinity=35`, `depth=250`, `pH=8` | α (dB/m), then α×500 (dB) | α>0, absorption in [0, 60] dB | α>0, absorption ~7.5 dB (example) | Yes: >0 and ≤60 dB |

**How inputs are given:** `francoisGarrisonAbsorption(50_000, waterProperties.temperature, waterProperties.salinity, 250, waterProperties.pH)` then multiply by 500.

---

### Active sonar equation (SNR)

**Inputs (one object used in all three tests):**

| Parameter | Symbol | Value | Unit |
|-----------|--------|--------|------|
| sourceLevel | SL | 220 | dB re 1 μPa @ 1 m |
| transmissionLoss | TL | 85 | dB (one-way) |
| targetStrength | TS | 25 | dB |
| noiseLevel | NL | 63 | dB re 1 μPa/√Hz (per Hz) |
| directivityIndex | AG | 20 | dB |
| detectionThreshold | DT | 0 | dB |
| bandwidth | BW | 10 | Hz |

**How inputs are given:** An object is passed: `activeSonarEquation({ sourceLevel: 220, transmissionLoss: 85, targetStrength: 25, noiseLevel: 63, directivityIndex: 20, detectionThreshold: 0, bandwidth: 10 })`.

| Test | Output | Expected | Real | Pass? |
|------|--------|----------|------|------|
| **10. SNR = 22 dB** | Signal excess / SNR (dB) | 22 | 22 | Yes: within 0.1 dB |
| **11. Detection positive** | Same (SE) | SE > 0 | 22 > 0 | Yes |
| **12. SNR in band** | Same (SNR) | In [19, 25] | 22 | Yes: 19 ≤ 22 ≤ 25 |

**Formula used in code:**  
`NL_bw = 63 + 10*log10(10) = 73 dB`;  
`SE = 220 - 2*85 + 25 - (73 - 20) - 0 = 22 dB`.

---

## 4. Quick reference: expected vs real output

| # | Test | Expected output | Real output |
|---|------|------------------|-------------|
| 1 | Sound speed 15°C, 35 PSU, 0 m | 1506.6 m/s | ~1506.69 m/s |
| 2 | Sound speed 0°C, 35 PSU, 0 m | 1449.2 m/s | 1448.96 m/s |
| 3 | SOFAR depth (range) | 0–2000 m | Profile-dependent (e.g. 400–1200 m) |
| 4 | SOFAR = min depth | = min-speed layer depth | Same |
| 5 | Spreading 10 km | 80 dB | 80 dB |
| 6 | Spreading + absorption + TL | 80, 5, 85 dB | 80, 5, 85 dB |
| 7 | Total TL 10 km, α=0.5 | 85 dB | 85 dB |
| 8 | TL 1 km, 10 kHz | 55–70 dB | ~62 dB (example) |
| 9 | FG absorption 50 kHz, 500 m | >0, ≤60 dB | ~7.5 dB (example) |
| 10 | SNR (DOSITS) | 22 dB | 22 dB |
| 11 | Detection positive | SE > 0 | 22 > 0 |
| 12 | SNR acceptance | 19–25 dB | 22 dB |

---

## 5. Where this is documented in code

- **Input values:** In the test files: `src/utils/soundSpeed.test.ts`, `src/core/physics/acoustics.test.ts`, `src/core/sensors/SonarProcessor.test.ts`.
- **Expected values:** In the same files as `expected` constants or in `expect(...)` calls.
- **Reference:** DOSITS “Sonar Equation Example: Active Sonar” and `docs/single_reference_validation.md.pdf`; IEEE / validation slide for sound speed.

This is how we test: **fixed inputs from the reference → simulation output → compare to expected → assert pass condition.**
