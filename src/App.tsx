import { useState, useEffect, useRef, useMemo } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import { AppLayout } from './components/layout';
import { UnderwaterScene } from './three';
import {
  DepthProfileChart,
  BathymetryChart,
  SimulationMetrics,
} from './components/visualization';
import { useEnvironmentStore, usePlatformStore, useSensorStore, useSimulationStore } from './store';
import { createRayTracer, getDefaultRayTracingConfig } from './core/raytracing';
import { keyboardToControls, type KeyboardState } from './core/platform';
import { processSonarPing } from './core/sensors';
import { vec3 } from './utils/math';
import type { RayTracingResult } from './types';

// Dark theme for the application
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4fc3f7',
    },
    secondary: {
      main: '#81d4fa',
    },
    background: {
      default: '#0a1420',
      paper: '#0d1a2d',
    },
    text: {
      primary: '#e0e0e0',
      secondary: '#90a4ae',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 13,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: '#1a3a5a #0a1420',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
            background: '#0a1420',
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            backgroundColor: '#1a3a5a',
            borderRadius: 4,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          '&:before': {
            display: 'none',
          },
        },
      },
    },
  },
});

function SimulationView() {
  const [rayTracingResult, setRayTracingResult] = useState<RayTracingResult | null>(null);
  
  // Use selectors to get specific parts of state
  const bathymetry = useEnvironmentStore((state) => state.environment.bathymetry);
  const soundSpeedProfile = useEnvironmentStore((state) => state.environment.soundSpeedProfile);
  const waterProperties = useEnvironmentStore((state) => state.environment.waterProperties);
  
  const platformPosition = usePlatformStore((state) => state.platform.position);
  const platformHeading = usePlatformStore((state) => state.platform.heading);
  const platformDepth = usePlatformStore((state) => state.platform.depth);
  const platformVelocity = usePlatformStore((state) => state.platform.velocity);
  const setControls = usePlatformStore((state) => state.setControls);
  
  // Track lengths to minimize re-renders
  const readingsLength = useSensorStore((state) => state.readings.length);
  const detectionsLength = useSensorStore((state) => state.detections.length);
  const sensorsMap = useSensorStore((state) => state.sensors);
  
  // Get actual data, memoized based on length
  const readings = useMemo(
    () => useSensorStore.getState().readings,
    [readingsLength]
  );
  const detections = useMemo(
    () => useSensorStore.getState().detections,
    [detectionsLength]
  );
  
  const viewport = useSimulationStore((state) => state.viewport);

  // Memoize sensors array to prevent infinite re-renders
  const sensors = useRef(Array.from(sensorsMap.values()));
  useEffect(() => {
    sensors.current = Array.from(sensorsMap.values());
  }, [sensorsMap]);

  // Keyboard state
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

  // Keyboard controls
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
        setControls(keyboardToControls(keyboardStateRef.current));
      }

      if (event.code === 'Space') {
        event.preventDefault();
        const store = useSimulationStore.getState();
        if (store.simulation.isRunning) {
          store.simulation.isPaused ? store.resume() : store.pause();
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
        setControls(keyboardToControls(keyboardStateRef.current));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setControls]);

  // Simulation loop
  useEffect(() => {
    let lastTime = performance.now();
    let lastRayTrace = 0;
    let animationId: number;

    const loop = (currentTime: number) => {
      const simState = useSimulationStore.getState().simulation;
      
      if (simState.isRunning && !simState.isPaused) {
        const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1) * simState.speed;
        
        // Update platform physics
        const platformStore = usePlatformStore.getState();
        platformStore.applyPhysicsUpdate(deltaTime);
        useSimulationStore.getState().tick(deltaTime);

        // Process sonar pings
        const envState = useEnvironmentStore.getState().environment;
        const sensorStore = useSensorStore.getState();
        const platState = platformStore.platform;

        // Process each active sensor
        sensorStore.sensors.forEach((sensor) => {
          if (!sensor.isActive) return;

          // Check if it's time for a ping
          const timeSinceLastPing = simState.time - sensor.lastPingTime;
          if (timeSinceLastPing >= sensor.pingInterval) {
            // Calculate sensor world position (platform position + mount position)
            const sensorWorldPosition = vec3.add(
              platState.position,
              sensor.mountPosition
            );

            // Get sensor velocity (platform velocity)
            const sensorVelocity = platState.velocity;

            // Process ping
            try {
              const { readings, detections } = processSonarPing(
                sensor,
                sensorWorldPosition,
                sensorVelocity,
                platState.heading,
                [],
                {
                  temperature: envState.waterProperties.temperature,
                  salinity: envState.waterProperties.salinity,
                  pH: envState.waterProperties.pH,
                  seaState: envState.waterProperties.seaState,
                },
                envState.soundSpeedProfile,
                simState.time
              );

              // Batch add readings and detections to avoid too many store updates
              if (readings.length > 0 || detections.length > 0) {
                // Use getState to batch updates
                const currentState = useSensorStore.getState();
                const newReadings = [...currentState.readings, ...readings];
                const newDetections = [...currentState.detections, ...detections];
                
                // Keep only the last maxReadingsHistory readings
                const trimmedReadings = newReadings.length > currentState.maxReadingsHistory
                  ? newReadings.slice(-currentState.maxReadingsHistory)
                  : newReadings;
                
                // Update store in one batch
                useSensorStore.setState({
                  readings: trimmedReadings,
                  detections: newDetections,
                });
              }

              // Update sensor last ping time
              sensorStore.updateSensor(sensor.id, { lastPingTime: simState.time });
            } catch (e) {
              console.error('Sonar ping processing error:', e);
            }
          }
        });

        // Ray tracing every 3 seconds
        if (currentTime - lastRayTrace > 3000) {
          const activeSensors = Array.from(sensorStore.sensors.values()).filter(
            (s) => s.isActive && s.type === 'active'
          );

          if (activeSensors.length > 0) {
            const sensor = activeSensors[0];
            try {
              const rayTracer = createRayTracer(
                envState.soundSpeedProfile,
                envState.bathymetry,
                {
                  temperature: envState.waterProperties.temperature,
                  salinity: envState.waterProperties.salinity,
                  pH: envState.waterProperties.pH,
                  seaState: envState.waterProperties.seaState,
                },
                sensor.frequency
              );
              const config = getDefaultRayTracingConfig(Math.min(sensor.maxRange, 5000));
              const result = rayTracer.trace(platState.position, config);
              setRayTracingResult(result);
            } catch (e) {
              console.error('Ray tracing error:', e);
            }
          }
          lastRayTrace = currentTime;
        }
      }

      lastTime = currentTime;
      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  const activeSensor = sensors.current.find((s) => s.isActive);
  const maxRange = activeSensor?.maxRange || 10000;

  return (
    <Box sx={{ display: 'flex', height: '100%', gap: 1, p: 1 }}>
      {/* Main 3D Viewport */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          borderRadius: 1,
          overflow: 'hidden',
          border: '1px solid #1a3a5a',
        }}
      >
        <UnderwaterScene 
          bathymetry={bathymetry}
          platformPosition={platformPosition}
          showGrid={viewport.showGrid}
          showSensorCoverage={viewport.showSensorCoverage}
          underwaterFog={viewport.underwaterFog}
        />
      </Box>

      {/* Right Sidebar - Displays */}
      <Box
        sx={{
          width: 320,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          overflow: 'auto',
        }}
      >
        {/* Simulation Metrics */}
        <SimulationMetrics />

        {/* Sound Speed Profile — rounded depth to avoid chart re-rendering every frame (prevents Recharts update loop) */}
        <DepthProfileChart
          profile={soundSpeedProfile}
          currentDepth={Math.round(platformDepth)}
          height={180}
        />

        {/* Sea Bottom (XYZ) — Bathymetry map (rounded position to avoid per-frame re-renders) */}
        <BathymetryChart
          bathymetry={bathymetry}
          platformPosition={{ x: Math.round(platformPosition.x), y: Math.round(platformPosition.y) }}
          height={220}
        />
      </Box>
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AppLayout>
        <SimulationView />
      </AppLayout>
    </ThemeProvider>
  );
}

export default App;
