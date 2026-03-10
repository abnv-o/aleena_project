/**
 * Underwater Acoustics Physics Module
 * 
 * Implements core acoustic propagation physics for underwater sonar simulation.
 */

import type { SoundSpeedProfile, WaterProperties } from '../../types';
import { getSoundSpeedAtDepth } from '../../utils/soundSpeed';

/**
 * Thorp's equation for acoustic absorption coefficient
 * Returns absorption in dB/km
 * 
 * @param frequency Frequency in kHz
 * @returns Absorption coefficient in dB/km
 */
export function thorpAbsorption(frequency: number): number {
  const f = frequency; // frequency in kHz
  const f2 = f * f;

  // Thorp's equation (valid for f < 50 kHz)
  const alpha =
    0.11 * f2 / (1 + f2) +      // Relaxation of boric acid
    44 * f2 / (4100 + f2) +      // Relaxation of magnesium sulfate
    2.75e-4 * f2 +               // Pure water absorption
    0.003;                        // Additional losses

  return alpha;
}

/**
 * Francois-Garrison equation for acoustic absorption
 * More accurate than Thorp for wider frequency and depth ranges
 * 
 * @param frequency Frequency in Hz
 * @param temperature Temperature in Celsius
 * @param salinity Salinity in PSU
 * @param depth Depth in meters
 * @param pH Water pH (typically 7.7-8.3)
 * @returns Absorption coefficient in dB/m
 */
export function francoisGarrisonAbsorption(
  frequency: number,
  temperature: number,
  salinity: number,
  depth: number,
  pH: number = 8.0
): number {
  const f = frequency / 1000; // Convert to kHz
  const T = temperature;
  const S = salinity;
  const D = depth / 1000; // Convert to km
  const c = 1412 + 3.21 * T + 1.19 * S + 0.0167 * depth; // Approximate sound speed

  // Boric acid relaxation frequency
  const f1 = 2.8 * Math.sqrt(S / 35) * Math.pow(10, 4 - 1245 / (T + 273));

  // Magnesium sulfate relaxation frequency
  const f2 = (8.17 * Math.pow(10, 8 - 1990 / (T + 273))) / (1 + 0.0018 * (S - 35));

  // Boric acid contribution
  const A1 =
    (8.86 / c) * Math.pow(10, 0.78 * pH - 5) * (f1 * f * f) / (f1 * f1 + f * f);

  // Magnesium sulfate contribution
  const A2 =
    (21.44 * (S / c)) * (1 + 0.025 * T) * (f2 * f * f) / (f2 * f2 + f * f);

  // Pure water contribution
  let A3: number;
  if (T <= 20) {
    A3 = 4.937e-4 - 2.59e-5 * T + 9.11e-7 * T * T - 1.5e-8 * T * T * T;
  } else {
    A3 = 3.964e-4 - 1.146e-5 * T + 1.45e-7 * T * T - 6.5e-10 * T * T * T;
  }
  A3 = A3 * f * f;

  // Pressure (depth) correction
  const P1 = 1 - 1.37e-4 * D + 6.2e-9 * D * D;
  const P2 = 1 - 3.83e-5 * D + 4.9e-10 * D * D;
  const P3 = 1 - 3.91e-4 * D;

  // Total absorption in dB/km
  const alpha = A1 * P1 + A2 * P2 + A3 * P3;

  // Convert to dB/m
  return alpha / 1000;
}

/**
 * Calculate transmission loss due to geometric spreading
 * 
 * @param range Range in meters
 * @param mode Spreading mode: 'spherical' (r^2) or 'cylindrical' (r)
 * @returns Transmission loss in dB
 */
export function geometricSpreadingLoss(
  range: number,
  mode: 'spherical' | 'cylindrical' = 'spherical'
): number {
  if (range <= 1) return 0;

  if (mode === 'spherical') {
    // 20 * log10(r) for spherical spreading
    return 20 * Math.log10(range);
  } else {
    // 10 * log10(r) for cylindrical spreading
    return 10 * Math.log10(range);
  }
}

/**
 * Calculate total transmission loss (spreading + absorption)
 * 
 * @param range Range in meters
 * @param frequency Frequency in Hz
 * @param waterProperties Water properties for absorption calculation
 * @param spreadingMode Geometric spreading mode
 * @param absorptionDbPerKm Optional override: absorption in dB/km (e.g. 0.5 for DOSITS validation). When set, Francois-Garrison is skipped.
 * @returns Total transmission loss in dB
 */
export function transmissionLoss(
  range: number,
  frequency: number,
  waterProperties: WaterProperties,
  spreadingMode: 'spherical' | 'cylindrical' = 'spherical',
  absorptionDbPerKm?: number
): number {
  if (range <= 1) return 0;

  // Geometric spreading
  const TL_spreading = geometricSpreadingLoss(range, spreadingMode);

  // Absorption loss
  let TL_absorption: number;
  if (absorptionDbPerKm !== undefined) {
    TL_absorption = (absorptionDbPerKm / 1000) * range;
  } else {
    const alpha = francoisGarrisonAbsorption(
      frequency,
      waterProperties.temperature,
      waterProperties.salinity,
      50, // Average depth approximation
      waterProperties.pH
    );
    TL_absorption = alpha * range;
  }

  return TL_spreading + TL_absorption;
}

/**
 * Calculate Rayleigh reflection coefficient at a boundary
 * 
 * @param incidentAngle Grazing angle in radians (from horizontal)
 * @param densityRatio Ratio of second medium density to first (ρ2/ρ1)
 * @param speedRatio Ratio of second medium sound speed to first (c2/c1)
 * @returns Complex reflection coefficient magnitude (0-1)
 */
export function rayleighReflection(
  incidentAngle: number,
  densityRatio: number,
  speedRatio: number
): number {
  const theta = incidentAngle;
  const rho = densityRatio;
  const n = speedRatio;

  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);

  // Critical angle check
  const criticalAngle = Math.asin(1 / n);
  if (n > 1 && theta < criticalAngle) {
    // Total internal reflection
    return 1.0;
  }

  // Transmitted angle from Snell's law
  const sinTheta2 = sinTheta / n;
  if (Math.abs(sinTheta2) > 1) {
    // Total reflection
    return 1.0;
  }
  const cosTheta2 = Math.sqrt(1 - sinTheta2 * sinTheta2);

  // Rayleigh reflection coefficient
  const numerator = rho * cosTheta - cosTheta2;
  const denominator = rho * cosTheta + cosTheta2;

  return Math.abs(numerator / denominator);
}

/**
 * Sea surface reflection loss (Beckmann-Spizzichino model)
 * Accounts for sea state (surface roughness)
 * 
 * @param frequency Frequency in Hz
 * @param grazingAngle Grazing angle in radians
 * @param seaState Sea state (Douglas scale 0-9)
 * @returns Reflection loss in dB
 */
export function seaSurfaceReflectionLoss(
  frequency: number,
  grazingAngle: number,
  seaState: number
): number {
  // RMS wave height approximation based on sea state
  const waveHeights = [0, 0.1, 0.3, 0.6, 1.2, 2.5, 4, 6, 9, 14];
  const h_rms = waveHeights[Math.min(Math.floor(seaState), 9)] || 0;

  if (h_rms === 0) {
    // Flat surface - near perfect reflection with phase reversal
    return 0;
  }

  // Rayleigh roughness parameter
  const wavelength = 1500 / frequency; // approximate wavelength
  const R = (4 * Math.PI * h_rms * Math.sin(grazingAngle)) / wavelength;

  // Coherent reflection coefficient
  const gamma = Math.exp(-0.5 * R * R);

  // Convert to dB loss
  return -20 * Math.log10(Math.max(0.01, gamma));
}

/**
 * Bottom reflection loss based on bottom type
 * Uses empirical loss curves
 * 
 * @param grazingAngle Grazing angle in radians
 * @param bottomType Type of sea bottom
 * @returns Reflection loss in dB
 */
export function bottomReflectionLoss(
  grazingAngle: number,
  bottomType: 'sand' | 'mud' | 'rock' | 'gravel' = 'sand'
): number {
  const angleDeg = (grazingAngle * 180) / Math.PI;

  // Empirical bottom loss parameters
  const params: Record<string, { critAngle: number; maxLoss: number; slope: number }> = {
    mud: { critAngle: 10, maxLoss: 15, slope: 0.3 },
    sand: { critAngle: 20, maxLoss: 8, slope: 0.2 },
    gravel: { critAngle: 25, maxLoss: 5, slope: 0.15 },
    rock: { critAngle: 30, maxLoss: 2, slope: 0.1 },
  };

  const { critAngle, maxLoss, slope } = params[bottomType];

  if (angleDeg < critAngle) {
    // Below critical angle - higher loss
    return maxLoss + (critAngle - angleDeg) * slope;
  } else {
    // Above critical angle - decreasing loss
    return Math.max(0, maxLoss - (angleDeg - critAngle) * slope * 0.5);
  }
}

/**
 * Calculate the ambient noise level in the ocean
 * Based on Wenz curves
 * 
 * @param frequency Frequency in Hz
 * @param seaState Sea state (0-9)
 * @param shippingLevel Shipping noise level (0=none, 7=heavy)
 * @returns Noise spectral density in dB re 1μPa²/Hz
 */
export function ambientNoiseLevel(
  frequency: number,
  seaState: number = 2,
  shippingLevel: number = 4
): number {
  const f = frequency;

  // Thermal noise (dominant at high frequencies)
  const NL_thermal = -15 + 20 * Math.log10(f);

  // Sea state noise (wind/waves)
  const NL_sea = 44 + 23 * Math.sqrt(seaState) - 17 * Math.log10(f);

  // Shipping noise
  const NL_shipping = 40 + 26 * (shippingLevel / 7) - 60 * Math.log10(f + 0.03);

  // Biological noise (approximation)
  const NL_bio = 20;

  // Combine noise sources (incoherent addition)
  const pow = (db: number) => Math.pow(10, db / 10);
  const totalPower =
    pow(NL_thermal) + pow(NL_sea) + pow(NL_shipping) + pow(NL_bio);

  return 10 * Math.log10(totalPower);
}

/**
 * Calculate array gain for a linear array
 * 
 * @param numElements Number of array elements
 * @param spacing Element spacing in wavelengths
 * @param steeringAngle Steering angle from broadside in radians
 * @returns Array gain in dB
 */
export function arrayGain(
  numElements: number,
  spacing: number = 0.5,
  steeringAngle: number = 0
): number {
  if (numElements <= 1) return 0;

  // For a uniformly weighted linear array
  // AG = 10 * log10(N) for broadside
  const AG = 10 * Math.log10(numElements);

  // Apply steering angle degradation
  const steeringLoss = Math.cos(steeringAngle);

  return AG * steeringLoss;
}

