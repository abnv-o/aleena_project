import { create } from 'zustand';
import type {
  Environment,
  BathymetryData,
  SoundSpeedProfile,
  WaterProperties,
  SoundSpeedLayer,
} from '../types';
import { generateProceduralBathymetry } from '../utils/bathymetryGenerator';
import { createDefaultSoundSpeedProfile } from '../utils/soundSpeed';

interface EnvironmentState {
  environment: Environment;
  
  // Actions
  setBathymetry: (bathymetry: BathymetryData) => void;
  setSoundSpeedProfile: (profile: SoundSpeedProfile) => void;
  setWaterProperties: (properties: Partial<WaterProperties>) => void;
  addSoundSpeedLayer: (layer: SoundSpeedLayer) => void;
  removeSoundSpeedLayer: (depth: number) => void;
  updateSoundSpeedLayer: (depth: number, layer: Partial<SoundSpeedLayer>) => void;
  generateNewBathymetry: (width: number, height: number, resolution: number, maxDepth: number) => void;
  resetEnvironment: () => void;
}

const createDefaultEnvironment = (): Environment => {
  const bathymetry = generateProceduralBathymetry(1000, 1000, 10, 500);
  
  return {
    bathymetry,
    soundSpeedProfile: createDefaultSoundSpeedProfile(),
    waterProperties: {
      temperature: 15,
      salinity: 35,
      density: 1025,
      pH: 8.1,
      seaState: 2,
    },
    bounds: {
      minX: 0,
      maxX: bathymetry.width,
      minY: 0,
      maxY: bathymetry.height,
      minZ: -bathymetry.maxDepth,
      maxZ: 0,
    },
  };
};

export const useEnvironmentStore = create<EnvironmentState>((set, get) => ({
  environment: createDefaultEnvironment(),

  setBathymetry: (bathymetry) =>
    set((state) => ({
      environment: {
        ...state.environment,
        bathymetry,
        bounds: {
          ...state.environment.bounds,
          minX: 0,
          maxX: bathymetry.width,
          minY: 0,
          maxY: bathymetry.height,
          minZ: -bathymetry.maxDepth,
          maxZ: 0,
        },
      },
    })),

  setSoundSpeedProfile: (profile) =>
    set((state) => ({
      environment: {
        ...state.environment,
        soundSpeedProfile: profile,
      },
    })),

  setWaterProperties: (properties) =>
    set((state) => ({
      environment: {
        ...state.environment,
        waterProperties: {
          ...state.environment.waterProperties,
          ...properties,
        },
      },
    })),

  addSoundSpeedLayer: (layer) =>
    set((state) => ({
      environment: {
        ...state.environment,
        soundSpeedProfile: {
          layers: [...state.environment.soundSpeedProfile.layers, layer].sort(
            (a, b) => a.depth - b.depth
          ),
        },
      },
    })),

  removeSoundSpeedLayer: (depth) =>
    set((state) => ({
      environment: {
        ...state.environment,
        soundSpeedProfile: {
          layers: state.environment.soundSpeedProfile.layers.filter(
            (l) => l.depth !== depth
          ),
        },
      },
    })),

  updateSoundSpeedLayer: (depth, updates) =>
    set((state) => ({
      environment: {
        ...state.environment,
        soundSpeedProfile: {
          layers: state.environment.soundSpeedProfile.layers.map((l) =>
            l.depth === depth ? { ...l, ...updates } : l
          ),
        },
      },
    })),

  generateNewBathymetry: (width, height, resolution, maxDepth) => {
    const bathymetry = generateProceduralBathymetry(width, height, resolution, maxDepth);
    set((state) => ({
      environment: {
        ...state.environment,
        bathymetry,
        bounds: {
          ...state.environment.bounds,
          minX: 0,
          maxX: width,
          minY: 0,
          maxY: height,
          minZ: -maxDepth,
          maxZ: 0,
        },
      },
    }));
  },

  resetEnvironment: () =>
    set({
      environment: createDefaultEnvironment(),
    }),
}));


