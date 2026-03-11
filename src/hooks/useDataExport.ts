import { useCallback } from 'react';
import { useEnvironmentStore, usePlatformStore, useSensorStore, useSimulationStore } from '../store';
import type { SimulationSnapshot, ExportConfig, Detection, Sensor } from '../types';
import { transmissionLoss, geometricSpreadingLoss, ambientNoiseLevel } from '../core/physics/acoustics';

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

  /** Build acoustic metrics for export: TL, SNR, detection result, max range, spreading, absorption, total noise */
  const buildAcousticExport = useCallback(() => {
    const env = getEnvironment();
    const sens = getSensors();
    const dets = getDetections();
    const wp = env.waterProperties;
    const seaState = wp.seaState ?? 2;
    const shippingLevel = 4;

    const sensorById = new Map<string, Sensor>(sens.map((s) => [s.id, s]));

    const round2 = (v: number) => Math.round(v * 100) / 100;

    return {
      detectionCount: dets.length,
      sensors: sens.map((s) => {
        const rangeMax = s.maxRange;
        const freq = s.frequency;
        const TL_dB = transmissionLoss(rangeMax, freq, wp, 'spherical');
        const spreadingLoss_dB = geometricSpreadingLoss(rangeMax, 'spherical');
        const absorptionLoss_dB = TL_dB - spreadingLoss_dB;
        const NL_dB = ambientNoiseLevel(freq, seaState, shippingLevel);
        const totalNoiseLevel_dB = NL_dB + 10 * Math.log10(s.bandwidth);

        return {
          id: s.id,
          name: s.name,
          maxDetectionRange_m: s.maxRange,
          transmissionLoss_dB_atMaxRange: round2(TL_dB),
          spreadingLoss_dB_atMaxRange: round2(spreadingLoss_dB),
          absorptionLoss_dB_atMaxRange: round2(absorptionLoss_dB),
          totalNoiseLevel_dB: round2(totalNoiseLevel_dB),
        };
      }),
      detections: dets.map((d) => {
        const sensor = sensorById.get(d.sensorId);
        const range = d.range;
        const freq = sensor?.frequency ?? 10000;

        const TL_dB = transmissionLoss(range, freq, wp, 'spherical');
        const spreadingLoss_dB = geometricSpreadingLoss(range, 'spherical');
        const absorptionLoss_dB = TL_dB - spreadingLoss_dB;

        const NL_dB = ambientNoiseLevel(freq, seaState, shippingLevel);
        const bandwidth = sensor?.bandwidth ?? 100;
        const totalNoiseLevel_dB = NL_dB + 10 * Math.log10(bandwidth);

        const detectionThreshold = sensor?.detectionThreshold ?? 0;
        const snr_dB = d.signalExcess + detectionThreshold;

        return {
          id: d.id,
          sensorId: d.sensorId,
          targetId: d.targetId,
          timestamp: d.timestamp,
          range_m: d.range,
          bearing_deg: d.bearing,
          transmissionLoss_dB: round2(TL_dB),
          spreadingLoss_dB: round2(spreadingLoss_dB),
          absorptionLoss_dB: round2(absorptionLoss_dB),
          totalNoiseLevel_dB: round2(totalNoiseLevel_dB),
          snr_dB: round2(snr_dB),
          signalExcess_dB: d.signalExcess,
          detectionResult: d.signalExcess > 0 ? 'detected' : 'not_detected',
          detectionLevel_dB: d.detectionLevel,
        };
      }),
    };
  }, []);

  const exportToJSON = useCallback((config?: Partial<ExportConfig>) => {
    const snapshot = createSnapshot();
    const reads = config?.includeSensorReadings ? getReadings() : undefined;
    const acousticExport = buildAcousticExport();

    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      simulation: snapshot,
      readings: reads,
      config: {
        format: 'json',
        ...config,
      },
      acousticExport: {
        sensors: acousticExport.sensors,
        detections: acousticExport.detections,
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
  }, [createSnapshot, buildAcousticExport]);

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

