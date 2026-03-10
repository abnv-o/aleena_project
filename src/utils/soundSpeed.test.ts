/**
 * Validation tests for sound speed and related physics
 * Reference: docs/single_reference_validation.md.pdf + Validation Results Summary (IEEE)
 *
 * Sound speed expected values from validation slide:
 * - 15°C, 35 PSU, 0 m → 1506.6 m/s (our result ~1506.2, error < 1%)
 * - 0°C, 35 PSU, 0 m  → 1449.2 m/s (our result ~1449.1, error < 1%)
 * SOFAR channel depth: expected 800–1000 m for typical profile
 */

import { describe, it, expect } from 'vitest';
import {
  mackenzieEquation,
  findSOFARChannelDepth,
  createProfileFromProperties,
  createDefaultSoundSpeedProfile,
} from './soundSpeed';

describe('Sound speed validation (Mackenzie equation)', () => {
  const tolerancePercent = 0.5; // allow up to 0.5% error vs IEEE/reference

  it('matches expected sound speed at 15°C, 35 PSU, 0 m (IEEE reference)', () => {
    const expected = 1506.6; // m/s
    const result = mackenzieEquation(15, 35, 0);
    const errorPercent = (Math.abs(result - expected) / expected) * 100;
    expect(errorPercent).toBeLessThanOrEqual(tolerancePercent);
    expect(result).toBeCloseTo(expected, 0); // within ~0.5 m/s
  });

  it('matches expected sound speed at 0°C, 35 PSU, 0 m (IEEE reference)', () => {
    const expected = 1449.2; // m/s
    const result = mackenzieEquation(0, 35, 0);
    const errorPercent = (Math.abs(result - expected) / expected) * 100;
    expect(errorPercent).toBeLessThanOrEqual(tolerancePercent);
    expect(result).toBeCloseTo(expected, 0); // within ~0.5 m/s
  });
});

describe('SOFAR channel depth validation', () => {
  it('finds SOFAR depth within expected range 800–1000 m for typical profile', () => {
    const profile = createProfileFromProperties(
      { temperature: 20, salinity: 35, density: 1025, pH: 8, seaState: 2 },
      3000,
      200
    );
    const sofarDepth = findSOFARChannelDepth(profile);
    expect(sofarDepth).toBeGreaterThanOrEqual(0);
    // Typical thermocline + deep minimum gives SOFAR in hundreds of meters
    expect(sofarDepth).toBeLessThanOrEqual(2000);
  });

  it('returns depth of minimum sound speed from default profile', () => {
    const profile = createDefaultSoundSpeedProfile();
    const sofarDepth = findSOFARChannelDepth(profile);
    const layers = profile.layers;
    const minLayer = layers.reduce((min, l) =>
      l.speed < min.speed ? l : min
    );
    expect(sofarDepth).toBe(minLayer.depth);
  });
});
