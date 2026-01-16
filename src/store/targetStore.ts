import { create } from 'zustand';
import type { Target, Vector3 } from '../types';

interface TargetState {
  targets: Map<string, Target>;
  
  // Actions
  addTarget: (target: Target) => void;
  removeTarget: (id: string) => void;
  updateTarget: (id: string, updates: Partial<Target>) => void;
  updateTargetPosition: (id: string, position: Vector3) => void;
  updateTargetVelocity: (id: string, velocity: Vector3) => void;
  clearTargets: () => void;
  resetTargets: () => void;
  addDefaultTargets: () => void;
}

const createDefaultTarget = (id: string, name: string, type: Target['type'], position: Vector3): Target => ({
  id,
  name,
  type,
  position,
  velocity: { x: 0, y: 0, z: 0 },
  heading: 0,
  targetStrength: getDefaultTargetStrength(type),
  noiseLevel: getDefaultNoiseLevel(type),
  size: getDefaultSize(type),
});

function getDefaultTargetStrength(type: Target['type']): number {
  switch (type) {
    case 'submarine':
      return 25; // dB
    case 'surface_vessel':
      return 30; // dB
    case 'biological':
      return 5; // dB
    case 'mine':
      return 15; // dB
    case 'debris':
      return 10; // dB
    default:
      return 20;
  }
}

function getDefaultNoiseLevel(type: Target['type']): number {
  switch (type) {
    case 'submarine':
      return 120; // dB re 1μPa @ 1m
    case 'surface_vessel':
      return 150; // dB
    case 'biological':
      return 80; // dB
    case 'mine':
      return 90; // dB
    case 'debris':
      return 85; // dB
    default:
      return 100;
  }
}

function getDefaultSize(type: Target['type']): Vector3 {
  switch (type) {
    case 'submarine':
      return { x: 100, y: 10, z: 10 }; // meters
    case 'surface_vessel':
      return { x: 150, y: 20, z: 15 };
    case 'biological':
      return { x: 5, y: 2, z: 2 };
    case 'mine':
      return { x: 2, y: 2, z: 2 };
    case 'debris':
      return { x: 10, y: 5, z: 5 };
    default:
      return { x: 20, y: 10, z: 10 };
  }
}

export const useTargetStore = create<TargetState>((set, get) => ({
  targets: new Map(),

  addTarget: (target) =>
    set((state) => {
      const newTargets = new Map(state.targets);
      newTargets.set(target.id, target);
      return { targets: newTargets };
    }),

  removeTarget: (id) =>
    set((state) => {
      const newTargets = new Map(state.targets);
      newTargets.delete(id);
      return { targets: newTargets };
    }),

  updateTarget: (id, updates) =>
    set((state) => {
      const target = state.targets.get(id);
      if (!target) return state;
      
      const newTargets = new Map(state.targets);
      newTargets.set(id, { ...target, ...updates });
      return { targets: newTargets };
    }),

  updateTargetPosition: (id, position) =>
    set((state) => {
      const target = state.targets.get(id);
      if (!target) return state;
      
      const newTargets = new Map(state.targets);
      newTargets.set(id, { ...target, position });
      return { targets: newTargets };
    }),

  updateTargetVelocity: (id, velocity) =>
    set((state) => {
      const target = state.targets.get(id);
      if (!target) return state;
      
      const newTargets = new Map(state.targets);
      newTargets.set(id, { ...target, velocity });
      return { targets: newTargets };
    }),

  clearTargets: () => set({ targets: new Map() }),

  resetTargets: () => {
    const defaultTargets = new Map<string, Target>();
    
    // Add some default targets for testing
    defaultTargets.set('target-1', createDefaultTarget(
      'target-1',
      'Submarine Target',
      'submarine',
      { x: 800, y: 800, z: -100 }
    ));
    
    defaultTargets.set('target-2', createDefaultTarget(
      'target-2',
      'Surface Vessel',
      'surface_vessel',
      { x: 1200, y: 600, z: -5 }
    ));
    
    defaultTargets.set('target-3', createDefaultTarget(
      'target-3',
      'Biological Target',
      'biological',
      { x: 600, y: 1000, z: -50 }
    ));
    
    set({ targets: defaultTargets });
  },

  addDefaultTargets: () => {
    const state = get();
    if (state.targets.size === 0) {
      state.resetTargets();
    }
  },
}));


