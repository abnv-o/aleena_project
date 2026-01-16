import type { Vector3, Euler } from '../types';

/**
 * Convert degrees to radians
 */
export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 */
export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Smooth step interpolation
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Vector3 operations
 */
export const vec3 = {
  add: (a: Vector3, b: Vector3): Vector3 => ({
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  }),

  subtract: (a: Vector3, b: Vector3): Vector3 => ({
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  }),

  multiply: (v: Vector3, scalar: number): Vector3 => ({
    x: v.x * scalar,
    y: v.y * scalar,
    z: v.z * scalar,
  }),

  divide: (v: Vector3, scalar: number): Vector3 => ({
    x: v.x / scalar,
    y: v.y / scalar,
    z: v.z / scalar,
  }),

  dot: (a: Vector3, b: Vector3): number => 
    a.x * b.x + a.y * b.y + a.z * b.z,

  cross: (a: Vector3, b: Vector3): Vector3 => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }),

  length: (v: Vector3): number => 
    Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z),

  lengthSquared: (v: Vector3): number => 
    v.x * v.x + v.y * v.y + v.z * v.z,

  normalize: (v: Vector3): Vector3 => {
    const len = vec3.length(v);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return vec3.divide(v, len);
  },

  distance: (a: Vector3, b: Vector3): number => 
    vec3.length(vec3.subtract(b, a)),

  lerp: (a: Vector3, b: Vector3, t: number): Vector3 => ({
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  }),

  zero: (): Vector3 => ({ x: 0, y: 0, z: 0 }),

  one: (): Vector3 => ({ x: 1, y: 1, z: 1 }),

  up: (): Vector3 => ({ x: 0, y: 0, z: 1 }),

  down: (): Vector3 => ({ x: 0, y: 0, z: -1 }),

  forward: (): Vector3 => ({ x: 0, y: 1, z: 0 }),

  right: (): Vector3 => ({ x: 1, y: 0, z: 0 }),

  reflect: (incident: Vector3, normal: Vector3): Vector3 => {
    const dot = vec3.dot(incident, normal);
    return vec3.subtract(
      incident,
      vec3.multiply(normal, 2 * dot)
    );
  },

  refract: (incident: Vector3, normal: Vector3, eta: number): Vector3 | null => {
    const dotNI = vec3.dot(normal, incident);
    const k = 1 - eta * eta * (1 - dotNI * dotNI);
    if (k < 0) return null; // Total internal reflection
    return vec3.subtract(
      vec3.multiply(incident, eta),
      vec3.multiply(normal, eta * dotNI + Math.sqrt(k))
    );
  },

  rotateAroundAxis: (v: Vector3, axis: Vector3, angle: number): Vector3 => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const { x: ux, y: uy, z: uz } = vec3.normalize(axis);
    const { x: vx, y: vy, z: vz } = v;

    return {
      x: (cos + ux * ux * (1 - cos)) * vx +
         (ux * uy * (1 - cos) - uz * sin) * vy +
         (ux * uz * (1 - cos) + uy * sin) * vz,
      y: (uy * ux * (1 - cos) + uz * sin) * vx +
         (cos + uy * uy * (1 - cos)) * vy +
         (uy * uz * (1 - cos) - ux * sin) * vz,
      z: (uz * ux * (1 - cos) - uy * sin) * vx +
         (uz * uy * (1 - cos) + ux * sin) * vy +
         (cos + uz * uz * (1 - cos)) * vz,
    };
  },

  fromSpherical: (radius: number, theta: number, phi: number): Vector3 => ({
    x: radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.sin(phi) * Math.sin(theta),
    z: radius * Math.cos(phi),
  }),

  toSpherical: (v: Vector3): { radius: number; theta: number; phi: number } => {
    const radius = vec3.length(v);
    if (radius === 0) return { radius: 0, theta: 0, phi: 0 };
    return {
      radius,
      theta: Math.atan2(v.y, v.x),
      phi: Math.acos(clamp(v.z / radius, -1, 1)),
    };
  },
};

/**
 * Euler angle operations
 */
export const euler = {
  zero: (): Euler => ({ x: 0, y: 0, z: 0 }),

  fromDegrees: (x: number, y: number, z: number): Euler => ({
    x: degToRad(x),
    y: degToRad(y),
    z: degToRad(z),
  }),

  toDegrees: (e: Euler): { x: number; y: number; z: number } => ({
    x: radToDeg(e.x),
    y: radToDeg(e.y),
    z: radToDeg(e.z),
  }),
};

/**
 * Decibel conversions
 */
export function linearToDb(linear: number): number {
  return 20 * Math.log10(Math.max(1e-10, linear));
}

export function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

/**
 * Power to decibels (for intensity)
 */
export function powerToDb(power: number): number {
  return 10 * Math.log10(Math.max(1e-10, power));
}

export function dbToPower(db: number): number {
  return Math.pow(10, db / 10);
}

/**
 * Normalize angle to range [-180, 180]
 */
export function normalizeAngle(degrees: number): number {
  degrees = degrees % 360;
  if (degrees > 180) degrees -= 360;
  if (degrees < -180) degrees += 360;
  return degrees;
}

/**
 * Normalize angle to range [0, 360)
 */
export function normalizeAngle360(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/**
 * Calculate bearing between two positions
 */
export function calculateBearing(from: Vector3, to: Vector3): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const bearing = radToDeg(Math.atan2(dx, dy));
  return normalizeAngle360(bearing);
}

/**
 * Calculate range (horizontal distance) between two positions
 */
export function calculateRange(from: Vector3, to: Vector3): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate slant range (3D distance) between two positions
 */
export function calculateSlantRange(from: Vector3, to: Vector3): number {
  return vec3.distance(from, to);
}

/**
 * Calculate depression/elevation angle between two positions
 */
export function calculateElevation(from: Vector3, to: Vector3): number {
  const range = calculateRange(from, to);
  const dz = to.z - from.z;
  return radToDeg(Math.atan2(dz, range));
}

/**
 * Calculate Doppler shift in Hz
 * 
 * @param frequency Source frequency in Hz
 * @param sourcePosition Position of source
 * @param sourceVelocity Velocity of source
 * @param receiverPosition Position of receiver
 * @param receiverVelocity Velocity of receiver
 * @param soundSpeed Speed of sound in m/s
 * @returns Doppler shift in Hz (positive = approaching, negative = receding)
 */
export function calculateDopplerShift(
  frequency: number,
  sourcePosition: Vector3,
  sourceVelocity: Vector3,
  receiverPosition: Vector3,
  receiverVelocity: Vector3,
  soundSpeed: number
): number {
  // Calculate unit vector from source to receiver
  const direction = vec3.subtract(receiverPosition, sourcePosition);
  const distance = vec3.length(direction);
  
  if (distance < 1e-6) return 0; // Too close, no shift
  
  const unitDirection = vec3.divide(direction, distance);
  
  // Project velocities onto the line of sight
  const sourceRadialVelocity = vec3.dot(sourceVelocity, unitDirection);
  const receiverRadialVelocity = vec3.dot(receiverVelocity, unitDirection);
  
  // Relative radial velocity (positive = approaching)
  const relativeVelocity = receiverRadialVelocity - sourceRadialVelocity;
  
  // Doppler shift formula: Δf = f * (v / c)
  // where v is relative radial velocity, c is sound speed
  const dopplerShift = (frequency * relativeVelocity) / soundSpeed;
  
  return dopplerShift;
}

