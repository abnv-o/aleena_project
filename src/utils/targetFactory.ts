/**
 * Factory for creating simulation targets by type.
 * Each type has characteristic Target Strength (TS), speed, and behaviour.
 */

import type { Target, Vector3 } from '../types';
import { knotsToVelocity } from './targetClassification';

export type TargetTypeKey = 'submarine' | 'surface_vessel' | 'biological' | 'mine';

export const TARGET_TYPE_DISPLAY_NAMES: Record<TargetTypeKey, string> = {
  submarine: 'Submarine',
  surface_vessel: 'Surface Vessel',
  biological: 'Whale',
  mine: 'Mine',
};

/** Target Strength (TS) and speed ranges by type (from spec) */
const TARGET_PARAMS: Record<
  TargetTypeKey,
  { tsMin: number; tsMax: number; speedKnots: number; directionDeg: number; noiseLevel: number }
> = {
  submarine: { tsMin: 20, tsMax: 30, speedKnots: 5, directionDeg: 0, noiseLevel: 90 },
  surface_vessel: { tsMin: 30, tsMax: 40, speedKnots: 12, directionDeg: 45, noiseLevel: 110 },
  biological: { tsMin: 5, tsMax: 10, speedKnots: 2, directionDeg: 180, noiseLevel: 60 },
  mine: { tsMin: 10, tsMax: 20, speedKnots: 0, directionDeg: 0, noiseLevel: 0 },
};

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Create a target of the given type at position (x, y, z).
 * TS and speed are set per type; optional id for multi-target support.
 */
export function createTarget(
  type: TargetTypeKey,
  position: Vector3,
  id?: string
): Target {
  const params = TARGET_PARAMS[type];
  const targetStrength = randomInRange(params.tsMin, params.tsMax);
  const velocity = knotsToVelocity(params.speedKnots, params.directionDeg);
  const uniqueId = id ?? `target-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const name = `${TARGET_TYPE_DISPLAY_NAMES[type]} ${uniqueId.slice(-4)}`;

  return {
    id: uniqueId,
    name,
    type,
    position: { ...position },
    velocity,
    heading: params.directionDeg,
    targetStrength,
    noiseLevel: params.noiseLevel,
    size: getDefaultSize(type),
  };
}

function getDefaultSize(type: TargetTypeKey): Vector3 {
  switch (type) {
    case 'submarine':
      return { x: 80, y: 10, z: 8 };
    case 'surface_vessel':
      return { x: 100, y: 15, z: 10 };
    case 'biological':
      return { x: 15, y: 4, z: 4 };
    case 'mine':
      return { x: 2, y: 2, z: 1.5 };
    default:
      return { x: 10, y: 5, z: 5 };
  }
}
