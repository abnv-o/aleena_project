import { useEffect, useRef, useCallback } from 'react';
import { useSimulationStore, usePlatformStore, useEnvironmentStore, useSensorStore } from '../store';
import { createRayTracer, getDefaultRayTracingConfig } from '../core/raytracing';
import type { RayTracingResult } from '../types';
import { keyboardToControls, type KeyboardState } from '../core/platform';

interface UseSimulationLoopOptions {
  onRayTracingComplete?: (result: RayTracingResult) => void;
  rayTracingInterval?: number; // ms between ray traces
}

export function useSimulationLoop(options: UseSimulationLoopOptions = {}) {
  const { onRayTracingComplete, rayTracingInterval = 1000 } = options;

  const lastFrameTimeRef = useRef<number>(0);
  const lastRayTraceTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const keyboardStateRef = useRef<KeyboardState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    speedUp: false,
    slowDown: false,
  });

  // Keyboard handlers
  useEffect(() => {
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
        keyboardStateRef.current[key] = true;
        usePlatformStore.getState().setControls(keyboardToControls(keyboardStateRef.current));
      }

      // Space to toggle play/pause
      if (event.code === 'Space') {
        event.preventDefault();
        const store = useSimulationStore.getState();
        if (store.simulation.isRunning) {
          if (store.simulation.isPaused) {
            store.resume();
          } else {
            store.pause();
          }
        } else {
          store.start();
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = keyMap[event.code];
      if (key) {
        event.preventDefault();
        keyboardStateRef.current[key] = false;
        usePlatformStore.getState().setControls(keyboardToControls(keyboardStateRef.current));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main simulation loop - use refs to access latest state without dependencies
  useEffect(() => {
    const simulationLoop = (currentTime: number) => {
      const simStore = useSimulationStore.getState();
      const simulation = simStore.simulation;

      if (!simulation.isRunning || simulation.isPaused) {
        lastFrameTimeRef.current = currentTime;
        animationFrameRef.current = requestAnimationFrame(simulationLoop);
        return;
      }

      // Calculate delta time
      const deltaTime = lastFrameTimeRef.current
        ? (currentTime - lastFrameTimeRef.current) / 1000
        : simulation.timeStep;

      // Clamp delta time to prevent large jumps
      const clampedDelta = Math.min(deltaTime, 0.1) * simulation.speed;

      // Update platform physics
      usePlatformStore.getState().applyPhysicsUpdate(clampedDelta);

      // Tick simulation time
      simStore.tick(clampedDelta);

      // Ray tracing (at specified interval)
      if (
        onRayTracingComplete &&
        currentTime - lastRayTraceTimeRef.current > rayTracingInterval
      ) {
        const envStore = useEnvironmentStore.getState();
        const sensorStore = useSensorStore.getState();
        const platformStore = usePlatformStore.getState();
        
        // Find active sensors and trace rays
        const activeSensors = Array.from(sensorStore.sensors.values()).filter(
          (s) => s.isActive && s.type === 'active'
        );

        if (activeSensors.length > 0) {
          const sensor = activeSensors[0];
          const rayTracer = createRayTracer(
            envStore.environment.soundSpeedProfile,
            envStore.environment.bathymetry,
            {
              temperature: envStore.environment.waterProperties.temperature,
              salinity: envStore.environment.waterProperties.salinity,
              pH: envStore.environment.waterProperties.pH,
              seaState: envStore.environment.waterProperties.seaState,
            },
            sensor.frequency
          );

          const config = getDefaultRayTracingConfig(sensor.maxRange);
          const result = rayTracer.trace(platformStore.platform.position, config);
          onRayTracingComplete(result);
        }

        lastRayTraceTimeRef.current = currentTime;
      }

      lastFrameTimeRef.current = currentTime;
      animationFrameRef.current = requestAnimationFrame(simulationLoop);
    };

    animationFrameRef.current = requestAnimationFrame(simulationLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [onRayTracingComplete, rayTracingInterval]);

  // Return current simulation state for UI
  const simulation = useSimulationStore((state) => state.simulation);
  
  return {
    isRunning: simulation.isRunning,
    isPaused: simulation.isPaused,
    time: simulation.time,
  };
}
