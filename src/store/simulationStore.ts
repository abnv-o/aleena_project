import { create } from 'zustand';
import type { SimulationState, SimulationSpeed, ViewportConfig } from '../types';

interface SimulationStoreState {
  simulation: SimulationState;
  viewport: ViewportConfig;
  
  // Actions
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
  setSpeed: (speed: SimulationSpeed) => void;
  setTimeStep: (timeStep: number) => void;
  tick: (deltaTime: number) => void;
  
  // Viewport actions
  setViewportConfig: (config: Partial<ViewportConfig>) => void;
  toggleRayPaths: () => void;
  toggleGrid: () => void;
  toggleSensorCoverage: () => void;
  setCameraMode: (mode: ViewportConfig['cameraMode']) => void;
}

const createDefaultSimulation = (): SimulationState => ({
  isRunning: false,
  isPaused: false,
  time: 0,
  timeStep: 0.05,  // 50ms = 20 FPS physics
  speed: 1,
  frameCount: 0,
  lastUpdateTime: Date.now(),
});

const createDefaultViewport = (): ViewportConfig => ({
  showGrid: true,
  showAxes: true,
  showDepthMarkers: true,
  showRayPaths: true,
  showSensorCoverage: true,
  showTargets: true,
  underwaterFog: true,
  cameraMode: 'orbit',
});

export const useSimulationStore = create<SimulationStoreState>((set, get) => ({
  simulation: createDefaultSimulation(),
  viewport: createDefaultViewport(),

  start: () =>
    set((state) => ({
      simulation: {
        ...state.simulation,
        isRunning: true,
        isPaused: false,
        lastUpdateTime: Date.now(),
      },
    })),

  pause: () =>
    set((state) => ({
      simulation: {
        ...state.simulation,
        isPaused: true,
      },
    })),

  resume: () =>
    set((state) => ({
      simulation: {
        ...state.simulation,
        isPaused: false,
        lastUpdateTime: Date.now(),
      },
    })),

  stop: () =>
    set((state) => ({
      simulation: {
        ...state.simulation,
        isRunning: false,
        isPaused: false,
      },
    })),

  reset: () =>
    set({
      simulation: createDefaultSimulation(),
    }),

  setSpeed: (speed) =>
    set((state) => ({
      simulation: {
        ...state.simulation,
        speed,
      },
    })),

  setTimeStep: (timeStep) =>
    set((state) => ({
      simulation: {
        ...state.simulation,
        timeStep,
      },
    })),

  tick: (deltaTime) =>
    set((state) => ({
      simulation: {
        ...state.simulation,
        time: state.simulation.time + deltaTime * state.simulation.speed,
        frameCount: state.simulation.frameCount + 1,
        lastUpdateTime: Date.now(),
      },
    })),

  setViewportConfig: (config) =>
    set((state) => ({
      viewport: {
        ...state.viewport,
        ...config,
      },
    })),

  toggleRayPaths: () =>
    set((state) => ({
      viewport: {
        ...state.viewport,
        showRayPaths: !state.viewport.showRayPaths,
      },
    })),

  toggleGrid: () =>
    set((state) => ({
      viewport: {
        ...state.viewport,
        showGrid: !state.viewport.showGrid,
      },
    })),

  toggleSensorCoverage: () =>
    set((state) => ({
      viewport: {
        ...state.viewport,
        showSensorCoverage: !state.viewport.showSensorCoverage,
      },
    })),

  setCameraMode: (mode) =>
    set((state) => ({
      viewport: {
        ...state.viewport,
        cameraMode: mode,
      },
    })),
}));


