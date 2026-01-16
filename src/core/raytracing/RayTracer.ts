/**
 * Acoustic Ray Tracing Engine
 * 
 * Implements ray tracing through a stratified ocean with depth-varying sound speed.
 * Uses Snell's Law for ray bending and handles surface/bottom reflections.
 */

import type {
  Vector3,
  Ray,
  RayPoint,
  RayTracingConfig,
  RayTracingResult,
  SoundSpeedProfile,
  BathymetryData,
} from '../../types';
import { getSoundSpeedAtDepth, getSoundSpeedGradient } from '../../utils/soundSpeed';
import { getDepthAtPosition, getSurfaceNormal } from '../../utils/bathymetryGenerator';
import { vec3, degToRad } from '../../utils/math';
import {
  rayleighReflection,
  seaSurfaceReflectionLoss,
  bottomReflectionLoss,
  francoisGarrisonAbsorption,
} from '../physics/acoustics';

interface RayTracerOptions {
  soundSpeedProfile: SoundSpeedProfile;
  bathymetry: BathymetryData;
  waterProperties: {
    temperature: number;
    salinity: number;
    pH: number;
    seaState: number;
  };
  frequency: number;
}

/**
 * Ray Tracer class for acoustic propagation modeling
 */
export class RayTracer {
  private profile: SoundSpeedProfile;
  private bathymetry: BathymetryData;
  private waterProperties: RayTracerOptions['waterProperties'];
  private frequency: number;
  private absorptionCoeff: number;

  constructor(options: RayTracerOptions) {
    this.profile = options.soundSpeedProfile;
    this.bathymetry = options.bathymetry;
    this.waterProperties = options.waterProperties;
    this.frequency = options.frequency;

    // Pre-calculate absorption coefficient (dB/m)
    this.absorptionCoeff = francoisGarrisonAbsorption(
      this.frequency,
      this.waterProperties.temperature,
      this.waterProperties.salinity,
      100, // Average depth
      this.waterProperties.pH
    );
  }

  /**
   * Trace multiple rays from a source position
   */
  trace(
    sourcePosition: Vector3,
    config: RayTracingConfig
  ): RayTracingResult {
    const rays: Ray[] = [];

    const angleRange = config.maxAngle - config.minAngle;
    const angleStep = angleRange / Math.max(1, config.numRays - 1);

    for (let i = 0; i < config.numRays; i++) {
      const launchAngle = config.minAngle + i * angleStep;
      const ray = this.traceRay(sourcePosition, launchAngle, config);
      rays.push(ray);
    }

    return {
      rays,
      sourcePosition,
      timestamp: Date.now(),
      config,
    };
  }

  /**
   * Trace a single ray from source at given launch angle
   */
  private traceRay(
    source: Vector3,
    launchAngleDeg: number,
    config: RayTracingConfig
  ): Ray {
    const points: RayPoint[] = [];
    const launchAngleRad = degToRad(launchAngleDeg);

    // Initial ray direction (in x-z plane for 2D tracing)
    // Positive angle = upward, negative = downward
    let direction: Vector3 = {
      x: Math.cos(launchAngleRad),
      y: 0,
      z: Math.sin(launchAngleRad),
    };

    let position = { ...source };
    let intensity = 1.0;
    let totalDistance = 0;
    let totalTime = 0;
    let bounces = 0;
    let terminated = false;
    let terminationReason: Ray['terminationReason'] = 'max_range';

    // Get initial sound speed
    let soundSpeed = getSoundSpeedAtDepth(this.profile, -position.z);

    // Add initial point
    points.push({
      position: { ...position },
      time: 0,
      intensity: 1.0,
      soundSpeed,
    });

    // Ray marching loop
    while (!terminated && totalDistance < config.maxRange && bounces < config.maxBounces) {
      const stepSize = config.stepSize;

      // Current depth (positive value)
      const currentDepth = -position.z;
      
      // Get sound speed and gradient at current position
      soundSpeed = getSoundSpeedAtDepth(this.profile, currentDepth);
      const gradient = getSoundSpeedGradient(this.profile, currentDepth);

      // Apply Snell's law for ray bending in stratified medium
      // The ray curves due to the sound speed gradient
      if (Math.abs(gradient) > 1e-6) {
        direction = this.applySnellsLaw(direction, soundSpeed, gradient, stepSize);
      }

      // Take step
      const newPosition: Vector3 = {
        x: position.x + direction.x * stepSize,
        y: position.y + direction.y * stepSize,
        z: position.z + direction.z * stepSize,
      };

      // Check for surface reflection (z > 0)
      if (newPosition.z > 0) {
        // Find intersection with surface
        const t = -position.z / direction.z;
        newPosition.x = position.x + direction.x * t;
        newPosition.y = position.y + direction.y * t;
        newPosition.z = 0;

        // Surface reflection
        const grazingAngle = Math.abs(Math.asin(direction.z));
        const reflectionLoss = seaSurfaceReflectionLoss(
          this.frequency,
          grazingAngle,
          this.waterProperties.seaState
        );

        // Update intensity (phase reversal at surface)
        intensity *= Math.pow(10, -reflectionLoss / 20);

        // Reflect direction
        direction.z = -direction.z;
        bounces++;

        // Add surface reflection point
        points.push({
          position: { ...newPosition },
          time: totalTime + t / soundSpeed,
          intensity,
          soundSpeed,
        });
      }

      // Check for bottom reflection
      const bottomDepth = getDepthAtPosition(
        this.bathymetry,
        newPosition.x,
        newPosition.y
      );

      if (-newPosition.z > bottomDepth) {
        // Find intersection with bottom
        const targetZ = -bottomDepth;
        const t = (targetZ - position.z) / direction.z;
        newPosition.x = position.x + direction.x * Math.abs(t);
        newPosition.y = position.y + direction.y * Math.abs(t);
        newPosition.z = targetZ;

        // Get bottom normal for reflection
        const normal = getSurfaceNormal(this.bathymetry, newPosition.x, newPosition.y);

        // Calculate grazing angle
        const grazingAngle = Math.abs(
          Math.asin(vec3.dot(direction, { x: 0, y: 0, z: -1 }))
        );

        // Bottom reflection loss
        const reflectionLoss = bottomReflectionLoss(grazingAngle, 'sand');
        intensity *= Math.pow(10, -reflectionLoss / 20);

        // Reflect off bottom (simplified - assume flat bottom for now)
        direction.z = -direction.z;
        bounces++;

        // Add bottom reflection point
        points.push({
          position: { ...newPosition },
          time: totalTime + Math.abs(t) / soundSpeed,
          intensity,
          soundSpeed,
        });
      }

      // Check bounds
      if (
        newPosition.x < 0 ||
        newPosition.x > this.bathymetry.width ||
        newPosition.y < 0 ||
        newPosition.y > this.bathymetry.height
      ) {
        terminated = true;
        terminationReason = 'out_of_bounds';
        break;
      }

      // Apply absorption
      const distanceStep = vec3.distance(position, newPosition);
      totalDistance += distanceStep;
      totalTime += distanceStep / soundSpeed;

      // Absorption loss for this step
      intensity *= Math.pow(10, -this.absorptionCoeff * distanceStep / 20);

      // Check if ray is too weak
      if (intensity < config.absorptionThreshold) {
        terminated = true;
        terminationReason = 'absorbed';
        break;
      }

      // Update position
      position = newPosition;

      // Add point (subsample to avoid too many points)
      if (points.length < 1000 && totalDistance % (config.stepSize * 10) < config.stepSize) {
        points.push({
          position: { ...position },
          time: totalTime,
          intensity,
          soundSpeed: getSoundSpeedAtDepth(this.profile, -position.z),
        });
      }
    }

    // Add final point
    if (points[points.length - 1].position !== position) {
      points.push({
        position: { ...position },
        time: totalTime,
        intensity,
        soundSpeed: getSoundSpeedAtDepth(this.profile, -position.z),
      });
    }

    return {
      id: `ray-${Date.now()}-${launchAngleDeg}`,
      sourcePosition: source,
      initialAngle: launchAngleDeg,
      points,
      totalDistance,
      totalTime,
      bounces,
      terminated,
      terminationReason,
    };
  }

  /**
   * Apply Snell's Law for ray bending in a medium with vertical sound speed gradient
   */
  private applySnellsLaw(
    direction: Vector3,
    soundSpeed: number,
    gradient: number,
    stepSize: number
  ): Vector3 {
    // In a stratified medium with vertical gradient, ray curves according to:
    // d(cos θ)/ds = (1/c) * dc/dz
    
    // Current ray angle from horizontal
    const cosTheta = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
    const sinTheta = direction.z;

    // Rate of change of ray angle
    const dThetaDs = -(gradient / soundSpeed) * cosTheta;

    // Update angle
    const theta = Math.asin(sinTheta);
    const newTheta = theta + dThetaDs * stepSize;

    // New direction maintaining horizontal bearing
    const horizontalMag = cosTheta > 1e-10 ? cosTheta : 1e-10;
    const newDirection: Vector3 = {
      x: (direction.x / horizontalMag) * Math.cos(newTheta),
      y: (direction.y / horizontalMag) * Math.cos(newTheta),
      z: Math.sin(newTheta),
    };

    return vec3.normalize(newDirection);
  }

  /**
   * Calculate eigenrays between source and receiver
   * (rays that actually connect the two points)
   */
  findEigenrays(
    source: Vector3,
    receiver: Vector3,
    angleTolerance: number = 0.5,
    maxIterations: number = 50
  ): Ray[] {
    const eigenrays: Ray[] = [];
    const range = vec3.distance(source, receiver);
    
    // Coarse search first
    const coarseConfig: RayTracingConfig = {
      numRays: 91,
      minAngle: -45,
      maxAngle: 45,
      maxRange: range * 1.5,
      maxBounces: 5,
      stepSize: Math.max(1, range / 500),
      absorptionThreshold: 0.001,
    };

    const coarseResult = this.trace(source, coarseConfig);

    // Find rays that pass near the receiver
    for (const ray of coarseResult.rays) {
      for (let i = 0; i < ray.points.length - 1; i++) {
        const p1 = ray.points[i].position;
        const p2 = ray.points[i + 1].position;

        // Check if receiver is between these points
        const dist = this.pointToSegmentDistance(receiver, p1, p2);
        
        if (dist < range * 0.05) {
          // This ray passes close to receiver - refine it
          // For now, just add it as an eigenray
          eigenrays.push(ray);
          break;
        }
      }
    }

    return eigenrays;
  }

  /**
   * Calculate distance from point to line segment
   */
  private pointToSegmentDistance(point: Vector3, start: Vector3, end: Vector3): number {
    const line = vec3.subtract(end, start);
    const len = vec3.length(line);
    
    if (len < 1e-10) return vec3.distance(point, start);

    const t = Math.max(0, Math.min(1, vec3.dot(vec3.subtract(point, start), line) / (len * len)));
    const projection: Vector3 = {
      x: start.x + t * line.x,
      y: start.y + t * line.y,
      z: start.z + t * line.z,
    };

    return vec3.distance(point, projection);
  }
}

/**
 * Create a ray tracer instance with current environment settings
 */
export function createRayTracer(
  soundSpeedProfile: SoundSpeedProfile,
  bathymetry: BathymetryData,
  waterProperties: RayTracerOptions['waterProperties'],
  frequency: number
): RayTracer {
  return new RayTracer({
    soundSpeedProfile,
    bathymetry,
    waterProperties,
    frequency,
  });
}

/**
 * Default ray tracing configuration
 */
export function getDefaultRayTracingConfig(maxRange: number = 5000): RayTracingConfig {
  return {
    numRays: 31,
    minAngle: -30,
    maxAngle: 30,
    maxRange,
    maxBounces: 10,
    stepSize: Math.max(1, maxRange / 1000),
    absorptionThreshold: 0.001,
  };
}


