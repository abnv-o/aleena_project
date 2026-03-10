// Core type definitions for the Underwater Sonar Simulation Platform

import * as THREE from 'three';

// ============================================================================
// Vector and Math Types
// ============================================================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Euler {
  x: number; // pitch
  y: number; // yaw
  z: number; // roll
}

// ============================================================================
// Environment Types
// ============================================================================

export interface SoundSpeedLayer {
  depth: number;      // Depth in meters
  speed: number;      // Sound speed in m/s
  temperature: number; // Temperature in Celsius
  salinity: number;   // Salinity in PSU
}

export interface SoundSpeedProfile {
  layers: SoundSpeedLayer[];
}

export interface WaterProperties {
  temperature: number;    // Surface temperature in Celsius
  salinity: number;       // Average salinity in PSU (Practical Salinity Units)
  density: number;        // Water density in kg/m³
  pH: number;             // Water pH
  seaState: number;       // Sea state (0-9 Douglas scale)
}

export interface BathymetryPoint {
  x: number;
  y: number;
  depth: number;
}

export interface BathymetryData {
  width: number;          // Grid width in meters
  height: number;         // Grid height in meters
  resolution: number;     // Grid resolution (points per meter)
  depths: Float32Array;   // Depth values in row-major order
  minDepth: number;       // Minimum depth (shallowest)
  maxDepth: number;       // Maximum depth (deepest)
}

export interface Environment {
  bathymetry: BathymetryData;
  soundSpeedProfile: SoundSpeedProfile;
  waterProperties: WaterProperties;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
}

// ============================================================================
// Sensor Types
// ============================================================================

export type SensorType = 'active' | 'passive';

export interface BeamPattern {
  horizontalWidth: number;   // Horizontal beam width in degrees
  verticalWidth: number;    // Vertical beam width in degrees (for side-scan)
  verticalBeamAngle: number;  // Vertical beam angle / depression from horizontal in degrees (side-scan)
  sidelobeLevel: number;    // Sidelobe level in dB below main lobe
}

export interface Sensor {
  id: string;
  name: string;
  type: SensorType;

  // Physical properties
  frequency: number;        // Operating frequency in Hz
  bandwidth: number;        // Signal bandwidth in Hz
  sourceLevel: number;      // Source level in dB re 1μPa @ 1m
  
  // Beam properties
  beamPattern: BeamPattern;
  
  // Position relative to platform
  mountPosition: Vector3;   // Mount position relative to platform center
  orientation: Euler;       // Orientation relative to platform
  
  // Operating parameters
  pulseLength: number;      // Pulse length in seconds
  pingInterval: number;     // Time between pings in seconds
  maxRange: number;         // Maximum detection range in meters
  
  // Detection parameters
  detectionThreshold: number;  // Detection threshold in dB
  directivityIndex: number;    // Directivity index in dB
  
  // State
  isActive: boolean;
  lastPingTime: number;
}

export interface SensorReading {
  sensorId: string;
  timestamp: number;
  bearing: number;          // Bearing in degrees
  range: number;            // Range in meters
  intensity: number;        // Signal intensity in dB
  doppler: number;          // Doppler shift in Hz
}

export interface Detection {
  id: string;
  sensorId: string;
  targetId?: string;       // ID of the target that was detected
  timestamp: number;
  position: Vector3;
  bearing: number;
  range: number;
  signalExcess: number;     // Signal excess in dB
  detectionLevel?: number;  // Received detection level in dB (for UI)
  classification: string;
  confidence: number;       // 0-1
}

// ============================================================================
// Target Types
// ============================================================================

export interface Target {
  id: string;
  name: string;
  type: 'submarine' | 'surface_vessel' | 'biological' | 'mine' | 'debris';
  position: Vector3;
  velocity: Vector3;
  heading: number;
  targetStrength: number;   // Target strength in dB
  noiseLevel: number;       // Radiated noise level in dB
  size: Vector3;            // Dimensions
}

// ============================================================================
// Platform Types
// ============================================================================

export type PlatformType = 'submarine' | 'surface_ship' | 'uuv' | 'fixed';

export interface PlatformConfig {
  type: PlatformType;
  maxSpeed: number;         // Maximum speed in m/s
  maxDepth: number;         // Maximum operating depth in meters
  turnRate: number;         // Maximum turn rate in degrees/second
  diveRate: number;         // Maximum dive/ascent rate in m/s
  length: number;           // Platform length in meters
  beam: number;             // Platform beam (width) in meters
  draft: number;            // Platform draft in meters
  ownNoise: number;         // Own ship noise level in dB
}

export interface Platform {
  id: string;
  name: string;
  config: PlatformConfig;
  
  // State
  position: Vector3;
  velocity: Vector3;
  heading: number;          // Heading in degrees (0 = North)
  pitch: number;            // Pitch in degrees
  roll: number;             // Roll in degrees
  depth: number;            // Current depth in meters
  speed: number;            // Current speed in m/s
  
  // Attached sensors
  sensorIds: string[];
}

export interface PlatformControls {
  throttle: number;         // -1 to 1 (reverse to forward)
  rudder: number;           // -1 to 1 (port to starboard)
  dive: number;             // -1 to 1 (ascend to dive)
}

// ============================================================================
// Ray Tracing Types
// ============================================================================

export interface RayPoint {
  position: Vector3;
  time: number;             // Travel time in seconds
  intensity: number;        // Intensity relative to source (0-1)
  soundSpeed: number;       // Local sound speed in m/s
}

export interface Ray {
  id: string;
  sourcePosition: Vector3;
  initialAngle: number;     // Initial launch angle in degrees
  points: RayPoint[];
  totalDistance: number;
  totalTime: number;
  bounces: number;          // Number of surface/bottom bounces
  terminated: boolean;
  terminationReason: 'max_range' | 'max_bounces' | 'out_of_bounds' | 'absorbed';
}

export interface RayTracingConfig {
  numRays: number;          // Number of rays to trace
  minAngle: number;         // Minimum launch angle in degrees
  maxAngle: number;         // Maximum launch angle in degrees
  maxRange: number;         // Maximum ray range in meters
  maxBounces: number;       // Maximum number of bounces
  stepSize: number;         // Integration step size in meters
  absorptionThreshold: number; // Stop ray when intensity below this
}

export interface RayTracingResult {
  rays: Ray[];
  sourcePosition: Vector3;
  timestamp: number;
  config: RayTracingConfig;
}

// ============================================================================
// Simulation Types
// ============================================================================

export type SimulationSpeed = 0.25 | 0.5 | 1 | 2 | 4 | 10;

export interface SimulationState {
  isRunning: boolean;
  isPaused: boolean;
  time: number;             // Simulation time in seconds
  timeStep: number;         // Time step in seconds
  speed: SimulationSpeed;   // Simulation speed multiplier
  frameCount: number;
  lastUpdateTime: number;   // Real-world timestamp of last update
}

export interface SimulationConfig {
  timeStep: number;
  maxSimulationTime: number;
  realtimeSync: boolean;    // Sync with real time or run as fast as possible
}

// ============================================================================
// Visualization Types
// ============================================================================

export interface ViewportConfig {
  showGrid: boolean;
  showAxes: boolean;
  showDepthMarkers: boolean;
  showRayPaths: boolean;
  showSensorCoverage: boolean;
  underwaterFog: boolean;
  cameraMode: 'orbit' | 'follow' | 'top_down' | 'side_view';
}

export interface ColorScale {
  name: string;
  colors: string[];
  min: number;
  max: number;
}

export interface SonarDisplayConfig {
  type: 'ppi' | 'bscan' | 'waterfall';
  range: number;
  colorScale: ColorScale;
  gain: number;
  showGrid: boolean;
  showBearingLines: boolean;
}

// ============================================================================
// Data Export Types
// ============================================================================

export interface SimulationSnapshot {
  timestamp: number;
  simulationTime: number;
  platform: Platform;
  sensors: Sensor[];
  detections: Detection[];
  environment: Partial<Environment>;
}

export interface ExportConfig {
  format: 'json' | 'csv';
  includeRayPaths: boolean;
  includeSensorReadings: boolean;
  includeDetections: boolean;
  timeRange: [number, number];
}



