import { create } from 'zustand';
import type { Target, Vector3 } from '../types';
import { usePlatformStore, setSkipNextQueueFlush } from './platformStore';
import { useSimulationStore } from './simulationStore';
import { generateLawnmowerWaypoints, type SearchArea } from '../utils/coveragePath';

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
  searchArea: SearchArea | null;
  coverageSurveyDepthM: number | null; // depth used for current/last coverage (for ghost)
  coverageActive: boolean;

  setTargetPosition: (position: Vector3) => void;
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
  target: null,
  searchArea: null,
  coverageSurveyDepthM: null,
  coverageActive: false,

  setTargetPosition: (position) =>
    set({ target: createTarget(position) }),

  setTarget: (target) =>
    set({ target }),

  clearTarget: () =>
    set({ target: null }),

  setSearchArea: (area) =>
    set({ searchArea: area }),

  startAreaCoverage: ({ trackSpacingM, surveyDepthM, area: areaArg }) => {
    const area = areaArg ?? get().searchArea;
    console.log('[Coverage] startAreaCoverage called:', { areaArg: !!areaArg, area, trackSpacingM, surveyDepthM });
    if (!area) {
      console.warn('[Coverage] No area — searchArea not set and no area passed. Aborting.');
      return;
    }
    const waypoints = generateLawnmowerWaypoints(area, trackSpacingM, surveyDepthM);
    console.log('[Coverage] Generated waypoints:', waypoints.length, 'first:', waypoints[0], 'last:', waypoints[waypoints.length - 1]);
    if (waypoints.length === 0) {
      console.warn('[Coverage] No waypoints generated. Check area bounds and track spacing. Aborting.');
      return;
    }
    usePlatformStore.getState().setWaypointQueue(waypoints);
    usePlatformStore.getState().setAutopilot(true);
    setSkipNextQueueFlush(); // so next deferred flush does not overwrite queue with stale []
    useSimulationStore.getState().start();
    console.log('[Coverage] Store updated: waypointQueue length', waypoints.length, ', isAutopilot true, simulation start()');
    set({ searchArea: area, coverageActive: true, coverageSurveyDepthM: surveyDepthM });
  },

  stopAreaCoverage: () => {
    console.log('[Coverage] stopAreaCoverage: clearing waypoints and turning off autopilot');
    usePlatformStore.getState().setAutopilot(false);
    usePlatformStore.getState().clearWaypoints();
    set({ coverageActive: false });
  },
}));
