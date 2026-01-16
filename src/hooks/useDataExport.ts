import { useCallback } from 'react';
import { useEnvironmentStore, usePlatformStore, useSensorStore, useSimulationStore } from '../store';
import type { SimulationSnapshot, ExportConfig } from '../types';

export function useDataExport() {
  // Use getState to avoid subscriptions that cause re-renders
  const getEnvironment = () => useEnvironmentStore.getState().environment;
  const getPlatform = () => usePlatformStore.getState().platform;
  const getSensors = () => Array.from(useSensorStore.getState().sensors.values());
  const getDetections = () => useSensorStore.getState().detections;
  const getReadings = () => useSensorStore.getState().readings;
  const getSimulation = () => useSimulationStore.getState().simulation;

  const createSnapshot = useCallback((): SimulationSnapshot => {
    const env = getEnvironment();
    const plat = getPlatform();
    const sens = getSensors();
    const dets = getDetections();
    const sim = getSimulation();
    
    return {
      timestamp: Date.now(),
      simulationTime: sim.time,
      platform: { ...plat },
      sensors: sens.map((s) => ({ ...s })),
      detections: dets.map((d) => ({ ...d })),
      environment: {
        waterProperties: { ...env.waterProperties },
        soundSpeedProfile: { ...env.soundSpeedProfile },
        bounds: { ...env.bounds },
      },
    };
  }, []);

  const exportToJSON = useCallback((config?: Partial<ExportConfig>) => {
    const snapshot = createSnapshot();
    const reads = config?.includeSensorReadings ? getReadings() : undefined;
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      simulation: snapshot,
      readings: reads,
      config: {
        format: 'json',
        ...config,
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sonar-simulation-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [createSnapshot]);

  const exportToCSV = useCallback(() => {
    // Export detections as CSV
    const dets = getDetections();
    const sim = getSimulation();
    
    const headers = [
      'Timestamp',
      'SimTime',
      'SensorID',
      'Bearing',
      'Range',
      'SignalExcess',
      'Classification',
      'Confidence',
    ];
    
    const rows = dets.map((d) => [
      d.timestamp,
      sim.time,
      d.sensorId,
      d.bearing.toFixed(2),
      d.range.toFixed(2),
      d.signalExcess.toFixed(2),
      d.classification,
      d.confidence.toFixed(3),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sonar-detections-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const exportEnvironment = useCallback(() => {
    const env = getEnvironment();
    const envData = {
      exportedAt: new Date().toISOString(),
      soundSpeedProfile: env.soundSpeedProfile,
      waterProperties: env.waterProperties,
      bathymetry: {
        width: env.bathymetry.width,
        height: env.bathymetry.height,
        resolution: env.bathymetry.resolution,
        minDepth: env.bathymetry.minDepth,
        maxDepth: env.bathymetry.maxDepth,
        // Note: depths array is too large for JSON, would need binary format
      },
    };

    const blob = new Blob([JSON.stringify(envData, null, 2)], {
      type: 'application/json',
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `environment-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  return {
    createSnapshot,
    exportToJSON,
    exportToCSV,
    exportEnvironment,
  };
}

