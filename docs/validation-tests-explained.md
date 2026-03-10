# Validation Tests: What They Are, How They Passed, and Pass Conditions

Reference: **DOSITS “Sonar Equation Example: Active Sonar”** and **docs/single_reference_validation.md.pdf**.

---

## 1. Sound speed (Mackenzie equation) — 2 tests

### Test 1: Sound speed at 15°C, 35 PSU, 0 m

| | |
|---|---|
| **What was tested** | `mackenzieEquation(15, 35, 0)` — sound speed in m/s at 15°C, 35 PSU salinity, surface (0 m depth). |
| **Expected (IEEE)** | 1506.6 m/s |
| **How it passed** | The code returns ~1506.69 m/s. Error ≈ 0.006%, and the value is within 0.5 m/s of 1506.6. |
| **Pass conditions** | (1) Percent error ≤ 0.5%. (2) Result within ~0.5 m/s of 1506.6. |

### Test 2: Sound speed at 0°C, 35 PSU, 0 m

| | |
|---|---|
| **What was tested** | `mackenzieEquation(0, 35, 0)` — sound speed at 0°C, 35 PSU, 0 m. |
| **Expected (IEEE)** | 1449.2 m/s |
| **How it passed** | The code returns 1448.96 m/s (Mackenzie constant term at S=35, D=0). Error ≈ 0.017%, within 0.5 m/s of 1449.2. |
| **Pass conditions** | (1) Percent error ≤ 0.5%. (2) Result within ~0.5 m/s of 1449.2. |

---

## 2. SOFAR channel depth — 2 tests

### Test 3: SOFAR depth in plausible range

| | |
|---|---|
| **What was tested** | `findSOFARChannelDepth(profile)` for a profile built from typical water properties (20°C, 35 PSU) up to 3000 m. |
| **Expected** | SOFAR (depth of minimum sound speed) in a reasonable range for a typical ocean profile. |
| **How it passed** | The function returns the depth (in m) where sound speed is minimum. The test checks that this depth is ≥ 0 and ≤ 2000 m. |
| **Pass conditions** | SOFAR depth ≥ 0 m and ≤ 2000 m. |

### Test 4: SOFAR = depth of minimum speed

| | |
|---|---|
| **What was tested** | For the default sound-speed profile, `findSOFARChannelDepth(profile)` is the same as the depth of the layer with the smallest speed. |
| **How it passed** | The code scans all layers, finds the minimum speed, and returns that layer’s depth. The test compares that to the depth of the minimum-speed layer computed separately. |
| **Pass conditions** | Returned depth equals the depth of the layer with minimum sound speed. |

---

## 3. Acoustics / transmission loss — 5 tests

### Test 5: Spreading loss at 10 km = 80 dB

| | |
|---|---|
| **What was tested** | `geometricSpreadingLoss(10_000, 'spherical')` — spherical spreading: 20·log₁₀(R) dB. |
| **Expected (DOSITS)** | 20·log₁₀(10 000) = 80 dB |
| **How it passed** | Code uses `20 * Math.log10(10000)` → 80 dB exactly. |
| **Pass conditions** | Result within 0.1 dB of 80 dB. |

### Test 6: Absorption 0.5 dB/km over 10 km = 5 dB, total TL = 85 dB

| | |
|---|---|
| **What was tested** | `transmissionLoss(10_000, 8000, waterProperties, 'spherical', 0.5)` — TL with fixed absorption α = 0.5 dB/km (DOSITS value). |
| **Expected (DOSITS)** | Spreading 80 dB + absorption 5 dB = **85 dB** total one-way TL. |
| **How it passed** | With the optional 5th argument `0.5`, the code uses (0.5/1000)·10 000 = 5 dB absorption and 80 dB spreading → total 85 dB. |
| **Pass conditions** | Spreading ≈ 80 dB, absorption ≈ 5 dB, total TL ≈ 85 dB (all within 0.1 dB). |

### Test 7: Total TL at 10 km with α = 0.5 dB/km = 85 dB

| | |
|---|---|
| **What was tested** | Same as Test 6: total one-way transmission loss with α = 0.5 dB/km at 10 km. |
| **How it passed** | Sum of spreading + absorption equals 85 dB. |
| **Pass conditions** | Total TL within 0.1 dB of 85 dB. |

### Test 8: TL at 1 km, 10 kHz in typical range

| | |
|---|---|
| **What was tested** | `transmissionLoss(1000, 10_000, waterProperties, 'spherical')` — no absorption override; uses Francois-Garrison. |
| **Expected** | Typical one-way TL at 1 km and 10 kHz is often quoted in the 60–65 dB range; we allow a wider band. |
| **How it passed** | Computed TL falls between 55 dB and 70 dB. |
| **Pass conditions** | TL ≥ 55 dB and TL ≤ 70 dB. |

### Test 9: Francois-Garrison absorption (50 kHz, 500 m)

| | |
|---|---|
| **What was tested** | `francoisGarrisonAbsorption(50_000, T, S, 250, pH)` then absorption (dB) = α·500 over 500 m. |
| **Expected** | Positive, plausible absorption (reference slide ~30 dB; exact value depends on T/S/pH). |
| **How it passed** | α > 0 and total absorption over 500 m is between 0 and 60 dB. |
| **Pass conditions** | α > 0, absorption (dB) > 0, absorption ≤ 60 dB. |

---

## 4. Active sonar equation (SNR) — 3 tests

**Reference inputs (DOSITS):**  
SL = 220 dB, TL = 85 dB (one-way), TS = 25 dB, NL = 63 dB (per 1 Hz), bandwidth = 10 Hz → NL_total = 73 dB, AG (directivity) = 20 dB, DT = 0 dB.

**Formula:**  
SNR = SL − 2·TL + TS − (NL_total − AG) − DT  
= 220 − 170 + 25 − (73 − 20) − 0 = **22 dB**.

### Test 10: SNR = 22 dB

| | |
|---|---|
| **What was tested** | `activeSonarEquation({ sourceLevel: 220, transmissionLoss: 85, targetStrength: 25, noiseLevel: 63, directivityIndex: 20, detectionThreshold: 0, bandwidth: 10 })`. |
| **Expected (DOSITS)** | 22 dB. |
| **How it passed** | Code computes NL_bw = 63 + 10·log₁₀(10) = 73 dB, then SE = 220 − 2·85 + 25 − (73 − 20) − 0 = 22 dB. |
| **Pass conditions** | SNR within 0.1 dB of 22 dB. |

### Test 11: Detection positive when SNR > 0

| | |
|---|---|
| **What was tested** | Same inputs as above; detection is “positive” when signal excess (SE) > 0. |
| **How it passed** | SE = 22 dB > 0. |
| **Pass conditions** | SE > 0. |

### Test 12: SNR within ±3 dB (acceptance band)

| | |
|---|---|
| **What was tested** | Same DOSITS parameters; reference says acceptance is ±3 dB around 22 dB. |
| **Expected** | SNR in [19, 25] dB. |
| **How it passed** | Computed SNR = 22 dB lies in that range. |
| **Pass conditions** | SNR ≥ 19 dB and SNR ≤ 25 dB. |

---

## Summary table

| # | Test | Expected / criterion | Pass condition |
|---|------|----------------------|----------------|
| 1 | Sound speed 15°C, 35 PSU, 0 m | 1506.6 m/s | Error ≤ 0.5%, within 0.5 m/s |
| 2 | Sound speed 0°C, 35 PSU, 0 m | 1449.2 m/s | Error ≤ 0.5%, within 0.5 m/s |
| 3 | SOFAR depth (typical profile) | Plausible range | 0 ≤ depth ≤ 2000 m |
| 4 | SOFAR = min-speed depth | Consistency | Equals depth of min-speed layer |
| 5 | Spreading 10 km | 80 dB | Within 0.1 dB |
| 6 | Absorption + TL (α=0.5, 10 km) | 5 dB + 85 dB | Within 0.1 dB |
| 7 | Total TL 10 km, α=0.5 | 85 dB | Within 0.1 dB |
| 8 | TL 1 km, 10 kHz | Typical range | 55–70 dB |
| 9 | FG absorption 50 kHz, 500 m | Plausible | > 0, ≤ 60 dB |
| 10 | SNR (DOSITS params) | 22 dB | Within 0.1 dB |
| 11 | Detection positive | SE > 0 | SE > 0 |
| 12 | SNR acceptance band | 19–25 dB | 19 ≤ SNR ≤ 25 |

All 12 tests use these conditions; your run had **12 passed, 0 failed**.
