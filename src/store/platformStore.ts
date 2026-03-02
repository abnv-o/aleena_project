import { create } from 'zustand';
import type { Platform, PlatformConfig, PlatformControls, Vector3 } from '../types';
import { autopilotControls } from '../core/platform/PlatformController';
import { vec3 } from '../utils/math';

const WAYPOINT_ARRIVAL_THRESHOLD_M = 25; // horizontal distance (m) to consider waypoint reached

// For throttled console logging (every ~60 autopilot steps)
let autopilotLogCounter = 0;
let lastEmptyQueueLog = 0;

// Pending state computed in applyPhysicsUpdate; flushed in a separate rAF to avoid "Maximum update depth"
let pendingStateRef: { platform: Platform; waypointQueue: Vector3[] } | null = null;
let flushScheduled = false;
/** When true, next flush must not overwrite waypointQueue (Start just set it); cleared after that flush. */
let skipNextQueueFlush = false;

function scheduleFlush(): void {
  if (flushScheduled || !pendingStateRef) return;
  flushScheduled = true;
  requestAnimationFrame(() => {
    flushScheduled = false;
    if (pendingStateRef) {
      const applyQueue = !skipNextQueueFlush;
      if (skipNextQueueFlush) skipNextQueueFlush = false;
      usePlatformStore.setState({
        platform: pendingStateRef.platform,
        ...(applyQueue ? { waypointQueue: pendingStateRef.waypointQueue } : {}),
      });
      pendingStateRef = null;
    }
  });
}

/** Call from simulation loop to schedule a flush in the next frame (do not call flushPendingPlatformState directly — it triggers update depth). */
export function flushPendingPlatformState(): void {
  scheduleFlush();
}

/** Call when starting area coverage so the next deferred flush does not overwrite the new waypoint queue. */
export function setSkipNextQueueFlush(): void {
  skipNextQueueFlush = true;
}

/** Use this inside the simulation loop after applyPhysicsUpdate to get the just-computed platform. */
export function getPendingPlatform(): Platform | null {
  return pendingStateRef?.platform ?? null;
}

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
  setWaypointQueue: (waypoints: Vector3[]) => void;
  setAutopilot: (on: boolean) => void;
  toggleAutopilot: () => void;
  resetPlatform: () => void;
  
  // Physics update (called by simulation loop)
  applyPhysicsUpdate: (deltaTime: number) => void;
}

const defaultPlatformConfig: PlatformConfig = {
  type: 'submarine',
  maxSpeed: 15,         // ~30 knots
  maxDepth: 400,
  turnRate: 8,          // degrees per second (higher so autopilot can complete coverage turns)
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

  setWaypointQueue: (waypoints) =>
    set({ waypointQueue: waypoints }),

  setAutopilot: (on) =>
    set({ isAutopilot: on }),

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
    let { platform, controls, isAutopilot, waypointQueue } = state;
    const { config } = platform;

    if (isAutopilot && waypointQueue.length === 0) {
      const now = Date.now();
      if (now - lastEmptyQueueLog > 2000) {
        lastEmptyQueueLog = now;
        console.warn('[Coverage] Autopilot ON but waypointQueue is empty — platform will not move.');
      }
    }

    // Autopilot: steer toward first waypoint and pop when reached (horizontal distance only so depth doesn't block)
    let nextWaypointQueue = waypointQueue;
    if (isAutopilot && waypointQueue.length > 0) {
      const wp = waypointQueue[0];
      const dx = wp.x - platform.position.x;
      const dy = wp.y - platform.position.y;
      const horizontalDist = Math.sqrt(dx * dx + dy * dy);
      const reached = horizontalDist <= WAYPOINT_ARRIVAL_THRESHOLD_M;
      // Also pop if we've overshot (moving away from waypoint) so we don't get stuck
      const vx = platform.velocity.x;
      const vy = platform.velocity.y;
      const movingAway = horizontalDist > 5 && (dx * vx + dy * vy < 0);
      autopilotLogCounter += 1;
      if (autopilotLogCounter % 60 === 1) {
        console.log('[Coverage] Autopilot:', { waypointsLeft: waypointQueue.length, wp: { x: wp.x, y: wp.y, z: wp.z }, platformXY: { x: platform.position.x.toFixed(0), y: platform.position.y.toFixed(0) }, horizontalDist: horizontalDist.toFixed(1), reached, movingAway });
      }
      if (reached || movingAway) {
        nextWaypointQueue = waypointQueue.slice(1);
        if (autopilotLogCounter % 60 === 1) console.log('[Coverage] Popped waypoint, remaining:', nextWaypointQueue.length);
        // Queue update is applied in deferred flush (no setState here — avoids "Maximum update depth")
      }
      if (nextWaypointQueue.length > 0) {
        controls = autopilotControls(platform, nextWaypointQueue[0], 8);
      }
    }

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

    const nextPlatform: Platform = {
      ...platform,
      position: newPosition,
      velocity: newVelocity,
      heading: newHeading,
      depth: newDepth,
      speed: newSpeed,
    };

    // Defer store update to next frame to prevent React "Maximum update depth" (setState during render cascade)
    pendingStateRef = { platform: nextPlatform, waypointQueue: nextWaypointQueue };
  },
}));



