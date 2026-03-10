import { create } from 'zustand';
import type { Target, Vector3 } from '../types';
import { usePlatformStore, setSkipNextQueueFlush } from './platformStore';
import { useSimulationStore } from './simulationStore';
import { generateLawnmowerWaypoints, type SearchArea } from '../utils/coveragePath';
import { createTarget as createTargetFromFactory, type TargetTypeKey } from '../utils/targetFactory';

interface TargetState {
  targets: Target[];
  searchArea: SearchArea | null;
  coverageSurveyDepthM: number | null;
  coverageActive: boolean;

  addTarget: (type: TargetTypeKey, position: Vector3) => void;
  removeTarget: (id: string) => void;
  setTargetPosition: (id: string, position: Vector3) => void;
  setTarget: (target: Target | null) => void;
  clearTarget: () => void;
  setSearchArea: (area: SearchArea | null) => void;
  startAreaCoverage: (options: {
    trackSpacingM: number;
    surveyDepthM: number;
    area?: SearchArea;
  }) => void;
  stopAreaCoverage: () => void;
}

export const useTargetStore = create<TargetState>((set, get) => ({
  targets: [],
  searchArea: null,
  coverageSurveyDepthM: null,
  coverageActive: false,

  addTarget: (type, position) =>
    set((state) => ({
      targets: [...state.targets, createTargetFromFactory(type, position)],
    })),

  removeTarget: (id) =>
    set((state) => ({
      targets: state.targets.filter((t) => t.id !== id),
    })),

  setTargetPosition: (id, position) =>
    set((state) => ({
      targets: state.targets.map((t) =>
        t.id === id ? { ...t, position: { ...position } } : t
      ),
    })),

  setTarget: (target) =>
    set({ targets: target ? [target] : [] }),

  clearTarget: () =>
    set({ targets: [] }),

  setSearchArea: (area) =>
    set({ searchArea: area }),

  startAreaCoverage: ({ trackSpacingM, surveyDepthM, area: areaArg }) => {
    const area = areaArg ?? get().searchArea;
    if (!area) {
      console.warn('[Coverage] No area — searchArea not set and no area passed. Aborting.');
      return;
    }
    const waypoints = generateLawnmowerWaypoints(area, trackSpacingM, surveyDepthM);
    if (waypoints.length === 0) {
      console.warn('[Coverage] No waypoints generated. Check area bounds and track spacing. Aborting.');
      return;
    }
    usePlatformStore.getState().setWaypointQueue(waypoints);
    usePlatformStore.getState().setAutopilot(true);
    setSkipNextQueueFlush();
    useSimulationStore.getState().start();
    set({ searchArea: area, coverageActive: true, coverageSurveyDepthM: surveyDepthM });
  },

  stopAreaCoverage: () => {
    usePlatformStore.getState().setAutopilot(false);
    usePlatformStore.getState().clearWaypoints();
    set({ coverageActive: false });
  },
}));

/** Primary target (first in list) for backward compatibility */
export function getPrimaryTarget(state: TargetState): Target | null {
  return state.targets[0] ?? null;
}
