/**
 * Validation tests for active sonar equation (DOSITS reference)
 * Reference: docs/single_reference_validation.md.pdf
 *
 * Expected: SL=220, 2×TL=170, TS=25, NL_total=73, AG=20, DT=0
 * SNR = 220 - 170 + 25 - (73 - 20) = 22 dB → positive detection
 */

import { describe, it, expect } from 'vitest';
import { activeSonarEquation } from './SonarProcessor';

describe('DOSITS validation: active sonar equation', () => {
  it('SNR = 22 dB for reference parameters (detection positive)', () => {
    const params = {
      sourceLevel: 220,
      transmissionLoss: 85,
      targetStrength: 25,
      noiseLevel: 63, // dB re 1 μPa/√Hz (per Hz)
      directivityIndex: 20,
      detectionThreshold: 0,
      bandwidth: 10, // 1/T, T=0.1 s
    };
    const SNR = activeSonarEquation(params);
    expect(SNR).toBeCloseTo(22, 1);
  });

  it('detection is positive when SNR > 0', () => {
    const params = {
      sourceLevel: 220,
      transmissionLoss: 85,
      targetStrength: 25,
      noiseLevel: 63,
      directivityIndex: 20,
      detectionThreshold: 0,
      bandwidth: 10,
    };
    const SE = activeSonarEquation(params);
    expect(SE).toBeGreaterThan(0);
  });

  it('SNR within ±3 dB of 22 dB (acceptance criterion)', () => {
    const params = {
      sourceLevel: 220,
      transmissionLoss: 85,
      targetStrength: 25,
      noiseLevel: 63,
      directivityIndex: 20,
      detectionThreshold: 0,
      bandwidth: 10,
    };
    const SNR = activeSonarEquation(params);
    expect(SNR).toBeGreaterThanOrEqual(19);
    expect(SNR).toBeLessThanOrEqual(25);
  });
});
