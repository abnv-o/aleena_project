import { create } from 'zustand';
import type { Platform, PlatformConfig, PlatformControls, Vector3 } from '../types';

interface PlatformState {
  platform: Platform;
  controls: PlatformControls;
  isAutopilot: boolean;
  waypointQueue: Vector3[];
  
  // Actions
  updatePosition: (position: Partial<Vector3>) => void;
  updateVelocity: (velocity: Partial<Vector3>) => void;
  setHeading: (heading: number) => void;
  setDepth: (depth: number) => void;
  setSpeed: (speed: number) => void;
  setPitch: (pitch: number) => void;
  setRoll: (roll: number) => void;
  setControls: (controls: Partial<PlatformControls>) => void;
  updatePlatformConfig: (config: Partial<PlatformConfig>) => void;
  addWaypoint: (position: Vector3) => void;
  clearWaypoints: () => void;
  toggleAutopilot: () => void;
  resetPlatform: () => void;
  
  // Physics update (called by simulation loop)
  applyPhysicsUpdate: (deltaTime: number) => void;
}

const defaultPlatformConfig: PlatformConfig = {
  type: 'submarine',
  maxSpeed: 15,         // ~30 knots
  maxDepth: 400,
  turnRate: 3,          // degrees per second
  diveRate: 2,          // meters per second
  length: 110,
  beam: 10,
  draft: 9,
  ownNoise: 100,
};

const createDefaultPlatform = (): Platform => ({
  id: 'platform-main',
  name: 'SSN-001',
  config: defaultPlatformConfig,
  position: { x: 500, y: 500, z: -50 },
  velocity: { x: 0, y: 0, z: 0 },
  heading: 0,
  pitch: 0,
  roll: 0,
  depth: 50,
  speed: 0,
  sensorIds: [],
});

export const usePlatformStore = create<PlatformState>((set, get) => ({
  platform: createDefaultPlatform(),
  controls: { throttle: 0, rudder: 0, dive: 0 },
  isAutopilot: false,
  waypointQueue: [],

  updatePosition: (position) =>
    set((state) => ({
      platform: {
        ...state.platform,
        position: { ...state.platform.position, ...position },
        depth: position.z !== undefined ? -position.z : state.platform.depth,
      },
    })),

  updateVelocity: (velocity) =>
    set((state) => ({
      platform: {
        ...state.platform,
        velocity: { ...state.platform.velocity, ...velocity },
      },
    })),

  setHeading: (heading) =>
    set((state) => ({
      platform: {
        ...state.platform,
        heading: ((heading % 360) + 360) % 360, // Normalize to 0-360
      },
    })),

  setDepth: (depth) =>
    set((state) => ({
      platform: {
        ...state.platform,
        depth: Math.max(0, Math.min(depth, state.platform.config.maxDepth)),
        position: {
          ...state.platform.position,
          z: -Math.max(0, Math.min(depth, state.platform.config.maxDepth)),
        },
      },
    })),

  setSpeed: (speed) =>
    set((state) => ({
      platform: {
        ...state.platform,
        speed: Math.max(-state.platform.config.maxSpeed, Math.min(speed, state.platform.config.maxSpeed)),
      },
    })),

  setPitch: (pitch) =>
    set((state) => ({
      platform: {
        ...state.platform,
        pitch: Math.max(-30, Math.min(pitch, 30)), // Limit pitch
      },
    })),

  setRoll: (roll) =>
    set((state) => ({
      platform: {
        ...state.platform,
        roll: Math.max(-45, Math.min(roll, 45)), // Limit roll
      },
    })),

  setControls: (controls) =>
    set((state) => ({
      controls: {
        ...state.controls,
        ...controls,
      },
    })),

  updatePlatformConfig: (config) =>
    set((state) => ({
      platform: {
        ...state.platform,
        config: {
          ...state.platform.config,
          ...config,
        },
      },
    })),

  addWaypoint: (position) =>
    set((state) => ({
      waypointQueue: [...state.waypointQueue, position],
    })),

  clearWaypoints: () =>
    set({ waypointQueue: [] }),

  toggleAutopilot: () =>
    set((state) => ({ isAutopilot: !state.isAutopilot })),

  resetPlatform: () =>
    set({
      platform: createDefaultPlatform(),
      controls: { throttle: 0, rudder: 0, dive: 0 },
      isAutopilot: false,
      waypointQueue: [],
    }),

  applyPhysicsUpdate: (deltaTime) => {
    const state = get();
    const { platform, controls } = state;
    const { config } = platform;

    // Calculate new heading based on rudder
    const turnAmount = controls.rudder * config.turnRate * deltaTime;
    const newHeading = ((platform.heading + turnAmount) % 360 + 360) % 360;

    // Calculate new depth based on dive control
    const depthChange = controls.dive * config.diveRate * deltaTime;
    const newDepth = Math.max(0, Math.min(platform.depth + depthChange, config.maxDepth));

    // Calculate new speed based on throttle (with acceleration)
    const targetSpeed = controls.throttle * config.maxSpeed;
    const speedDiff = targetSpeed - platform.speed;
    const acceleration = 2; // m/s²
    const newSpeed = platform.speed + Math.sign(speedDiff) * Math.min(Math.abs(speedDiff), acceleration * deltaTime);

    // Velocity: heading 0 = +X (forward), 90° = +Y (right), depth = Z
    const headingRad = (newHeading * Math.PI) / 180;
    const horizontalSpeed = newSpeed * Math.cos(platform.pitch * Math.PI / 180);
    const verticalSpeed = -controls.dive * config.diveRate;

    const newVelocity = {
      x: horizontalSpeed * Math.cos(headingRad),
      y: horizontalSpeed * Math.sin(headingRad),
      z: verticalSpeed,
    };

    // Update position
    const newPosition = {
      x: platform.position.x + newVelocity.x * deltaTime,
      y: platform.position.y + newVelocity.y * deltaTime,
      z: -newDepth,
    };

    set({
      platform: {
        ...platform,
        position: newPosition,
        velocity: newVelocity,
        heading: newHeading,
        depth: newDepth,
        speed: newSpeed,
      },
    });
  },
}));



