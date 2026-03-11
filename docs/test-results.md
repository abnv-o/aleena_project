# Validation Test Results  
**Underwater Sonar Simulation Platform**

**Run date:** 2025-03-10  
**Test framework:** Vitest 4.x  
**Reference:** DOSITS “Sonar Equation Example: Active Sonar” + single_reference_validation.md.pdf

**How we test, inputs, outputs, and expected vs real:** see **[how-we-test.md](how-we-test.md)** for a full explanation (how inputs are given, what each test outputs, expected vs actual results).

---

## Summary

| Metric | Value |
|--------|--------|
| **Total tests** | 12 |
| **Passed** | 12 |
| **Failed** | 0 |
| **Status** | **All tests passed** |

---

## Results by file

### 1. Sound speed (`src/utils/soundSpeed.test.ts`) — 4 tests ✓

| Test | Status |
|------|--------|
| Sound speed at 15°C, 35 PSU, 0 m matches IEEE reference (1506.6 m/s) | ✓ PASS |
| Sound speed at 0°C, 35 PSU, 0 m matches IEEE reference (1449.2 m/s) | ✓ PASS |
| SOFAR depth within expected range for typical profile | ✓ PASS |
| SOFAR depth = depth of minimum sound speed in default profile | ✓ PASS |

### 2. Active sonar equation (`src/core/sensors/SonarProcessor.test.ts`) — 3 tests ✓

| Test | Status |
|------|--------|
| SNR = 22 dB for DOSITS reference parameters | ✓ PASS |
| Detection positive when SNR > 0 | ✓ PASS |
| SNR within ±3 dB of 22 dB (acceptance criterion) | ✓ PASS |

### 3. Acoustics / transmission loss (`src/core/physics/acoustics.test.ts`) — 5 tests ✓

| Test | Status |
|------|--------|
| Spreading loss at 10 km spherical = 80 dB | ✓ PASS |
| Absorption 0.5 dB/km over 10 km = 5 dB | ✓ PASS |
| Total TL at 10 km with α = 0.5 dB/km = 85 dB | ✓ PASS |
| TL at 1 km, 10 kHz in typical 60–65 dB range | ✓ PASS |
| Francois-Garrison absorption (50 kHz, 500 m) in plausible range | ✓ PASS |

---

## Test breakdown: what was tested, expected, how it passed, pass conditions

### 1. Sound speed (Mackenzie equation) — Tests 1–2

**Test 1: Sound speed at 15°C, 35 PSU, 0 m**

| | |
|---|---|
| **What was tested** | `mackenzieEquation(15, 35, 0)` — sound speed in m/s at 15°C, 35 PSU salinity, surface (0 m depth). |
| **Expected (IEEE)** | 1506.6 m/s |
| **How it passed** | Code returns ~1506.69 m/s. Error ≈ 0.006%, within 0.5 m/s of 1506.6. |
| **Pass conditions** | Percent error ≤ 0.5%; result within ~0.5 m/s of 1506.6. |

**Test 2: Sound speed at 0°C, 35 PSU, 0 m**

| | |
|---|---|
| **What was tested** | `mackenzieEquation(0, 35, 0)` — sound speed at 0°C, 35 PSU, 0 m. |
| **Expected (IEEE)** | 1449.2 m/s |
| **How it passed** | Code returns 1448.96 m/s. Error ≈ 0.017%, within 0.5 m/s of 1449.2. |
| **Pass conditions** | Percent error ≤ 0.5%; result within ~0.5 m/s of 1449.2. |

---

### 2. SOFAR channel depth — Tests 3–4

**Test 3: SOFAR depth in plausible range**

| | |
|---|---|
| **What was tested** | `findSOFARChannelDepth(profile)` for a profile from typical water properties (20°C, 35 PSU) up to 3000 m. |
| **Expected** | SOFAR (depth of minimum sound speed) in a reasonable range. |
| **How it passed** | Function returns depth where sound speed is minimum; test checks depth ≥ 0 and ≤ 2000 m. |
| **Pass conditions** | SOFAR depth ≥ 0 m and ≤ 2000 m. |

**Test 4: SOFAR = depth of minimum speed**

| | |
|---|---|
| **What was tested** | For default sound-speed profile, `findSOFARChannelDepth(profile)` equals the depth of the layer with smallest speed. |
| **How it passed** | Code finds minimum speed across layers and returns that layer’s depth; test compares to independently computed min-speed depth. |
| **Pass conditions** | Returned depth equals depth of layer with minimum sound speed. |

---

### 3. Acoustics / transmission loss — Tests 5–9

**Test 5: Spreading loss at 10 km = 80 dB**

| | |
|---|---|
| **What was tested** | `geometricSpreadingLoss(10_000, 'spherical')` — spherical spreading: 20·log₁₀(R) dB. |
| **Expected (DOSITS)** | 20·log₁₀(10 000) = 80 dB |
| **How it passed** | Code uses `20 * Math.log10(10000)` → 80 dB. |
| **Pass conditions** | Result within 0.1 dB of 80 dB. |

**Test 6: Absorption 0.5 dB/km over 10 km = 5 dB, total TL = 85 dB**

| | |
|---|---|
| **What was tested** | `transmissionLoss(10_000, 8000, waterProperties, 'spherical', 0.5)` — TL with fixed α = 0.5 dB/km (DOSITS). |
| **Expected (DOSITS)** | Spreading 80 dB + absorption 5 dB = **85 dB** total one-way TL. |
| **How it passed** | With 5th argument `0.5`, code uses (0.5/1000)·10 000 = 5 dB absorption + 80 dB spreading → 85 dB. |
| **Pass conditions** | Spreading ≈ 80 dB, absorption ≈ 5 dB, total TL ≈ 85 dB (within 0.1 dB). |

**Test 7: Total TL at 10 km with α = 0.5 dB/km = 85 dB**

| | |
|---|---|
| **What was tested** | Same as Test 6: total one-way transmission loss at 10 km with α = 0.5 dB/km. |
| **How it passed** | Spreading + absorption = 85 dB. |
| **Pass conditions** | Total TL within 0.1 dB of 85 dB. |

**Test 8: TL at 1 km, 10 kHz in typical range**

| | |
|---|---|
| **What was tested** | `transmissionLoss(1000, 10_000, waterProperties, 'spherical')` — no override; uses Francois-Garrison. |
| **Expected** | Typical one-way TL at 1 km, 10 kHz often in 60–65 dB range; wider band allowed. |
| **How it passed** | Computed TL between 55 dB and 70 dB. |
| **Pass conditions** | TL ≥ 55 dB and TL ≤ 70 dB. |

**Test 9: Francois-Garrison absorption (50 kHz, 500 m)**

| | |
|---|---|
| **What was tested** | `francoisGarrisonAbsorption(50_000, T, S, 250, pH)` then absorption (dB) = α·500 over 500 m. |
| **Expected** | Positive, plausible absorption (reference ~30 dB; depends on T/S/pH). |
| **How it passed** | α > 0 and absorption over 500 m between 0 and 60 dB. |
| **Pass conditions** | α > 0, absorption (dB) > 0, absorption ≤ 60 dB. |

---

### 4. Active sonar equation (SNR) — Tests 10–12

**Reference inputs (DOSITS):**  
SL = 220 dB, TL = 85 dB (one-way), TS = 25 dB, NL = 63 dB (per 1 Hz), bandwidth = 10 Hz → NL_total = 73 dB, AG = 20 dB, DT = 0 dB.

**Formula:**  
SNR = SL − 2·TL + TS − (NL_total − AG) − DT = 220 − 170 + 25 − (73 − 20) − 0 = **22 dB**.

**Test 10: SNR = 22 dB**

| | |
|---|---|
| **What was tested** | `activeSonarEquation({ sourceLevel: 220, transmissionLoss: 85, targetStrength: 25, noiseLevel: 63, directivityIndex: 20, detectionThreshold: 0, bandwidth: 10 })`. |
| **Expected (DOSITS)** | 22 dB. |
| **How it passed** | Code computes NL_bw = 63 + 10·log₁₀(10) = 73 dB, then SE = 220 − 2·85 + 25 − (73 − 20) − 0 = 22 dB. |
| **Pass conditions** | SNR within 0.1 dB of 22 dB. |

**Test 11: Detection positive when SNR > 0**

| | |
|---|---|
| **What was tested** | Same inputs; detection is “positive” when signal excess (SE) > 0. |
| **How it passed** | SE = 22 dB > 0. |
| **Pass conditions** | SE > 0. |

**Test 12: SNR within ±3 dB (acceptance band)**

| | |
|---|---|
| **What was tested** | Same DOSITS parameters; reference acceptance ±3 dB around 22 dB. |
| **Expected** | SNR in [19, 25] dB. |
| **How it passed** | Computed SNR = 22 dB in that range. |
| **Pass conditions** | SNR ≥ 19 dB and SNR ≤ 25 dB. |

---

## Summary table (all 12 tests)

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

---

## Validation criteria (from reference)

- **Sound speed:** Error &lt; 0.5% vs IEEE expected values  
- **Transmission loss:** Spreading 80 dB, absorption 5 dB, total 85 dB at 10 km, 8 kHz, α = 0.5 dB/km  
- **SNR:** 22 dB (acceptance 19–25 dB), detection positive  
- **SOFAR:** Depth of minimum sound speed identified correctly  

**Conclusion:** Simulation values match the validation reference within the specified tolerances. All 12 tests passed.
