import { create } from 'zustand';
import type { Target, Vector3 } from '../types';

const TARGET_ID = 'target-1';

function createTarget(position: Vector3): Target {
  return {
    id: TARGET_ID,
    name: 'Target 1',
    type: 'submarine',
    position: { ...position },
    velocity: { x: 0, y: 0, z: 0 },
    heading: 0,
    targetStrength: 10, // dB, detectable by typical sonar
    noiseLevel: 80,
    size: { x: 10, y: 5, z: 5 },
  };
}

interface TargetState {
  target: Target | null;

  setTargetPosition: (position: Vector3) => void;
  setTarget: (target: Target | null) => void;
  clearTarget: () => void;
}

export const useTargetStore = create<TargetState>((set) => ({
  target: null,

  setTargetPosition: (position) =>
    set({ target: createTarget(position) }),

  setTarget: (target) =>
    set({ target }),

  clearTarget: () =>
    set({ target: null }),
}));
