import { create } from 'zustand';
import type { Sensor, SensorReading, Detection } from '../types';

interface SensorState {
  sensors: Map<string, Sensor>;
  readings: SensorReading[];
  detections: Detection[];
  activeSensorId: string | null;
  maxReadingsHistory: number;

  // Actions
  addSensor: (overrides?: Partial<Sensor>) => void;
  removeSensor: (id: string) => void;
  updateSensor: (id: string, updates: Partial<Sensor>) => void;
  setSensorActive: (id: string, active: boolean) => void;
  setActiveSensor: (id: string | null) => void;
  addReading: (reading: SensorReading) => void;
  addDetection: (detection: Detection) => void;
  clearReadings: () => void;
  clearDetections: () => void;
  resetSensors: () => void;
}

function createNewSensor(overrides?: Partial<Sensor>): Sensor {
  const id = `sensor-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const count = 1; // Caller can pass name in overrides
  return {
    id,
    name: overrides?.name ?? `Sensor ${count}`,
    type: 'active',
    frequency: 3500,
    bandwidth: 500,
    sourceLevel: 220,
    beamPattern: {
      horizontalWidth: 120,
      verticalWidth: 20,
      verticalBeamAngle: 45,
      sidelobeLevel: -20,
    },
    mountPosition: { x: 0, y: 0, z: 0 },
    orientation: { x: 0, y: 0, z: 0 },
    pulseLength: 0.1,
    pingInterval: 5,
    maxRange: 10000,
    detectionThreshold: 10,
    directivityIndex: 20,
    isActive: true,
    lastPingTime: 0,
    ...overrides,
    id: overrides?.id ?? id,
  };
}

const initialSensor = createNewSensor({ name: 'Sensor 1' });

export const useSensorStore = create<SensorState>((set, get) => ({
  sensors: new Map([[initialSensor.id, initialSensor]]),
  readings: [],
  detections: [],
  activeSensorId: null,
  maxReadingsHistory: 1000,

  addSensor: (overrides) =>
    set((state) => {
      const name = overrides?.name ?? `Sensor ${state.sensors.size + 1}`;
      const sensor = createNewSensor({ ...overrides, name });
      const newSensors = new Map(state.sensors);
      newSensors.set(sensor.id, sensor);
      return { sensors: newSensors, activeSensorId: sensor.id };
    }),

  removeSensor: (id) =>
    set((state) => {
      const newSensors = new Map(state.sensors);
      newSensors.delete(id);
      return {
        sensors: newSensors,
        activeSensorId: state.activeSensorId === id ? null : state.activeSensorId,
      };
    }),

  updateSensor: (id, updates) =>
    set((state) => {
      const sensor = state.sensors.get(id);
      if (!sensor) return state;
      
      const newSensors = new Map(state.sensors);
      newSensors.set(id, { ...sensor, ...updates });
      return { sensors: newSensors };
    }),

  setSensorActive: (id, active) =>
    set((state) => {
      const sensor = state.sensors.get(id);
      if (!sensor) return state;
      
      const newSensors = new Map(state.sensors);
      newSensors.set(id, { ...sensor, isActive: active });
      return { sensors: newSensors };
    }),

  setActiveSensor: (id) =>
    set({ activeSensorId: id }),

  addReading: (reading) =>
    set((state) => {
      const readings = [...state.readings, reading];
      // Keep only the last maxReadingsHistory readings
      if (readings.length > state.maxReadingsHistory) {
        readings.shift();
      }
      return { readings };
    }),

  addDetection: (detection) =>
    set((state) => {
      const detections = [...state.detections, detection];
      // Keep only the last 500 detections to prevent unbounded growth
      const maxDetections = 500;
      const trimmedDetections = detections.length > maxDetections
        ? detections.slice(-maxDetections)
        : detections;
      return { detections: trimmedDetections };
    }),

  clearReadings: () =>
    set({ readings: [] }),

  clearDetections: () =>
    set({ detections: [] }),

  resetSensors: () => {
    const defaultSensor = createNewSensor({ name: 'Sensor 1' });
    set({
      sensors: new Map([[defaultSensor.id, defaultSensor]]),
      readings: [],
      detections: [],
      activeSensorId: null,
    });
  },
}));

export { createNewSensor };

// Selector helpers
export const getSensorArray = (state: SensorState): Sensor[] =>
  Array.from(state.sensors.values());

export const getActiveSensors = (state: SensorState): Sensor[] =>
  Array.from(state.sensors.values()).filter((s) => s.isActive);

