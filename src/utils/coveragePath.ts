/**
 * Generate waypoints for lawnmower (parallel-track) area coverage.
 * Used for autonomous survey: platform runs parallel tracks to cover a rectangle.
 */

import type { Vector3 } from '../types';

export interface SearchArea {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Lawnmower pattern: alternate horizontal legs.
 * Start at (minX, minY), go to (maxX, minY), then step in Y and go (maxX, minY+spacing),
 * then (minX, minY+spacing), then (minX, minY+2*spacing), etc. until maxY is reached.
 *
 * @param area - Rectangle in global X,Y (meters)
 * @param trackSpacingM - Distance between parallel tracks (meters)
 * @param depthM - Survey depth below surface (positive meters); waypoint Z = -depthM
 * @returns Array of waypoints in world coordinates
 */
export function generateLawnmowerWaypoints(
  area: SearchArea,
  trackSpacingM: number,
  depthM: number
): Vector3[] {
  const { minX, maxX, minY, maxY } = area;
  const waypoints: Vector3[] = [];
  const z = -Math.max(0, depthM);

  if (trackSpacingM <= 0 || minX >= maxX || minY >= maxY) {
    console.log('[Coverage] generateLawnmowerWaypoints: invalid inputs', { trackSpacingM, minX, maxX, minY, maxY });
    return waypoints;
  }

  let y = minY;
  let goingRight = true;

  while (y <= maxY) {
    if (goingRight) {
      waypoints.push({ x: minX, y, z });
      waypoints.push({ x: maxX, y, z });
    } else {
      waypoints.push({ x: maxX, y, z });
      waypoints.push({ x: minX, y, z });
    }
    y += trackSpacingM;
    goingRight = !goingRight;
  }

  console.log('[Coverage] generateLawnmowerWaypoints: area', area, 'depthM', depthM, '->', waypoints.length, 'waypoints');
  return waypoints;
}
