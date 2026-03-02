/**
 * Platform Controller Module
 * 
 * Handles platform movement, navigation, and keyboard controls.
 */

import type { Platform, PlatformControls, Vector3 } from '../../types';
import { clamp, degToRad, normalizeAngle360 } from '../../utils/math';

export interface KeyboardState {
  forward: boolean;   // W
  backward: boolean;  // S
  left: boolean;      // A
  right: boolean;     // D
  up: boolean;        // E (ascend)
  down: boolean;      // Q (dive)
  speedUp: boolean;   // Shift
  slowDown: boolean;  // Ctrl
}

/**
 * Convert keyboard state to platform controls
 */
export function keyboardToControls(keyboard: KeyboardState): PlatformControls {
  let throttle = 0;
  let rudder = 0;
  let dive = 0;

  // Forward/backward
  if (keyboard.forward) throttle += 1;
  if (keyboard.backward) throttle -= 1;

  // Left/right (rudder)
  if (keyboard.left) rudder -= 1;
  if (keyboard.right) rudder += 1;

  // Up/down (dive planes)
  if (keyboard.up) dive -= 1;  // Ascend
  if (keyboard.down) dive += 1; // Dive

  // Speed modifier
  if (keyboard.speedUp) throttle *= 1.5;
  if (keyboard.slowDown) throttle *= 0.5;

  return {
    throttle: clamp(throttle, -1, 1),
    rudder: clamp(rudder, -1, 1),
    dive: clamp(dive, -1, 1),
  };
}

/**
 * Update platform state based on controls and physics
 */
export function updatePlatformPhysics(
  platform: Platform,
  controls: PlatformControls,
  deltaTime: number,
  bounds?: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }
): Platform {
  const { config } = platform;

  // Calculate new heading based on rudder
  // Turn rate is proportional to speed (can't turn well when stopped)
  const speedFactor = Math.abs(platform.speed) / config.maxSpeed;
  const effectiveTurnRate = config.turnRate * speedFactor * Math.sign(platform.speed);
  const turnAmount = controls.rudder * effectiveTurnRate * deltaTime;
  const newHeading = normalizeAngle360(platform.heading + turnAmount);

  // Calculate new depth based on dive control
  const depthChange = controls.dive * config.diveRate * deltaTime;
  let newDepth = platform.depth + depthChange;

  // Enforce depth limits
  newDepth = clamp(newDepth, 0, config.maxDepth);

  // Calculate new speed based on throttle (with inertia)
  const targetSpeed = controls.throttle * config.maxSpeed;
  const speedDiff = targetSpeed - platform.speed;
  const acceleration = 2; // m/s² - could be config parameter
  const maxSpeedChange = acceleration * deltaTime;
  const newSpeed = platform.speed + clamp(speedDiff, -maxSpeedChange, maxSpeedChange);

  // Calculate pitch based on dive rate and speed
  const targetPitch = (controls.dive * 15); // Max 15 degrees pitch
  const pitchDiff = targetPitch - platform.pitch;
  const newPitch = platform.pitch + clamp(pitchDiff, -5 * deltaTime, 5 * deltaTime);

  // Calculate velocity components from heading and speed
  const headingRad = degToRad(newHeading);
  const horizontalSpeed = newSpeed * Math.cos(degToRad(newPitch));
  const verticalSpeed = -controls.dive * config.diveRate;

  const newVelocity: Vector3 = {
    x: horizontalSpeed * Math.sin(headingRad),
    y: horizontalSpeed * Math.cos(headingRad),
    z: verticalSpeed,
  };

  // Update position
  let newPosition: Vector3 = {
    x: platform.position.x + newVelocity.x * deltaTime,
    y: platform.position.y + newVelocity.y * deltaTime,
    z: -newDepth,
  };

  // Apply bounds if specified
  if (bounds) {
    newPosition = {
      x: clamp(newPosition.x, bounds.minX, bounds.maxX),
      y: clamp(newPosition.y, bounds.minY, bounds.maxY),
      z: clamp(newPosition.z, bounds.minZ, bounds.maxZ),
    };
    newDepth = -newPosition.z;
  }

  return {
    ...platform,
    position: newPosition,
    velocity: newVelocity,
    heading: newHeading,
    depth: newDepth,
    speed: newSpeed,
    pitch: newPitch,
  };
}

/**
 * Calculate own ship noise level based on speed
 */
export function calculateOwnNoise(platform: Platform): number {
  const { config, speed } = platform;
  
  // Base noise level
  let noise = config.ownNoise;

  // Speed-dependent noise (6dB increase per doubling of speed)
  if (speed > 1) {
    noise += 20 * Math.log10(speed);
  }

  return noise;
}

/**
 * Check if platform can reach a position (basic path planning)
 */
export function canReachPosition(
  platform: Platform,
  targetPosition: Vector3,
  maxTime: number = 3600 // 1 hour max
): { canReach: boolean; estimatedTime: number } {
  const dx = targetPosition.x - platform.position.x;
  const dy = targetPosition.y - platform.position.y;
  const dz = targetPosition.z - platform.position.z;

  const horizontalDistance = Math.sqrt(dx * dx + dy * dy);
  const verticalDistance = Math.abs(dz);

  // Time to travel horizontal distance at max speed
  const horizontalTime = horizontalDistance / platform.config.maxSpeed;

  // Time to change depth
  const depthTime = verticalDistance / platform.config.diveRate;

  // Total time (assuming we can do both somewhat in parallel)
  const estimatedTime = Math.max(horizontalTime, depthTime);

  // Check depth constraints
  const targetDepth = -targetPosition.z;
  if (targetDepth > platform.config.maxDepth || targetDepth < 0) {
    return { canReach: false, estimatedTime: Infinity };
  }

  return {
    canReach: estimatedTime <= maxTime,
    estimatedTime,
  };
}

/**
 * Calculate heading to steer towards a target position.
 * Convention matches platform physics: heading 0 = +X, 90° = +Y.
 */
export function headingToTarget(
  currentPosition: Vector3,
  targetPosition: Vector3
): number {
  const dx = targetPosition.x - currentPosition.x;
  const dy = targetPosition.y - currentPosition.y;
  const bearing = Math.atan2(dy, dx) * (180 / Math.PI);
  return normalizeAngle360(bearing);
}

/**
 * Simple autopilot steering towards a waypoint
 */
export function autopilotControls(
  platform: Platform,
  targetPosition: Vector3,
  desiredSpeed: number = 5
): PlatformControls {
  // Calculate heading to target
  const targetHeading = headingToTarget(platform.position, targetPosition);
  
  // Calculate heading error
  let headingError = targetHeading - platform.heading;
  if (headingError > 180) headingError -= 360;
  if (headingError < -180) headingError += 360;

  // Proportional rudder control (tighter gain so we turn aggressively and complete coverage legs)
  const rudder = clamp(headingError / 15, -1, 1);

  // Depth control
  const targetDepth = -targetPosition.z;
  const depthError = targetDepth - platform.depth;
  const dive = clamp(depthError / 20, -1, 1);

  // Speed control
  const throttle = clamp(desiredSpeed / platform.config.maxSpeed, -1, 1);

  return { throttle, rudder, dive };
}

/**
 * Create a keyboard handler hook for React
 */
export function createKeyboardHandlers(
  onKeyChange: (state: Partial<KeyboardState>) => void
) {
  const keyMap: Record<string, keyof KeyboardState> = {
    KeyW: 'forward',
    KeyS: 'backward',
    KeyA: 'left',
    KeyD: 'right',
    KeyE: 'up',
    KeyQ: 'down',
    ShiftLeft: 'speedUp',
    ShiftRight: 'speedUp',
    ControlLeft: 'slowDown',
    ControlRight: 'slowDown',
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const key = keyMap[event.code];
    if (key) {
      event.preventDefault();
      onKeyChange({ [key]: true });
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    const key = keyMap[event.code];
    if (key) {
      event.preventDefault();
      onKeyChange({ [key]: false });
    }
  };

  return { handleKeyDown, handleKeyUp };
}



