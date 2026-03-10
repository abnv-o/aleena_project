/**
 * Target classification based on Target Strength (TS).
 * Used after detection to classify target type for display.
 *
 * Rules (from sonar simulation spec):
 * - TS > 25 → Surface Vessel
 * - 20 < TS ≤ 25 → Submarine
 * - TS < 10 → Whale
 * - 10 ≤ TS ≤ 20 → Mine
 */

export interface ClassificationResult {
  type: string;
  displayName: string;
  confidence: number;
}

const KNOTS_TO_MS = 0.514444;

export function classifyTargetByTS(targetStrengthDb: number): ClassificationResult {
  let type: string;
  let displayName: string;
  let confidence: number;

  if (targetStrengthDb > 25) {
    type = 'surface_vessel';
    displayName = 'Surface Vessel';
    // Confidence increases with distance above 25 dB
    confidence = 0.7 + Math.min(0.25, (targetStrengthDb - 25) / 40);
  } else if (targetStrengthDb > 20) {
    type = 'submarine';
    displayName = 'Submarine';
    // In the 20–25 dB band; confidence peaks at mid-band
    const bandCenter = 22.5;
    const distFromCenter = Math.abs(targetStrengthDb - bandCenter);
    confidence = 0.75 + (1 - distFromCenter / 2.5) * 0.2;
  } else if (targetStrengthDb < 10) {
    type = 'biological';
    displayName = 'Whale';
    confidence = 0.7 + Math.min(0.2, (10 - targetStrengthDb) / 20);
  } else {
    // 10 ≤ TS ≤ 20
    type = 'mine';
    displayName = 'Mine';
    const bandCenter = 15;
    const distFromCenter = Math.abs(targetStrengthDb - bandCenter);
    confidence = 0.7 + (1 - distFromCenter / 5) * 0.2;
  }

  return {
    type,
    displayName,
    confidence: Math.min(1, Math.max(0, confidence)),
  };
}

/**
 * Convert speed in knots to velocity vector in m/s given direction (degrees, 0 = North / +Y).
 */
export function knotsToVelocity(speedKnots: number, directionDeg: number): { x: number; y: number; z: number } {
  const speedMs = speedKnots * KNOTS_TO_MS;
  const rad = (directionDeg * Math.PI) / 180;
  return {
    x: Math.sin(rad) * speedMs,
    y: Math.cos(rad) * speedMs,
    z: 0,
  };
}
