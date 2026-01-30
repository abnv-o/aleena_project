/**
 * Sonar Signal Processing Module
 * 
 * Implements the sonar equation and detection processing for both
 * active and passive sonar systems.
 */

import type { Sensor, Vector3, Target, Detection, SensorReading } from '../../types';
import { vec3, calculateBearing, calculateSlantRange, calculateDopplerShift, dbToLinear, linearToDb } from '../../utils/math';
import { transmissionLoss, ambientNoiseLevel, arrayGain } from '../physics/acoustics';
import { getSoundSpeedAtDepth } from '../../utils/soundSpeed';

interface SonarEquationParams {
  sourceLevel: number;          // SL (dB re 1μPa @ 1m)
  transmissionLoss: number;     // TL (dB)
  targetStrength: number;       // TS (dB)
  noiseLevel: number;           // NL (dB re 1μPa²/Hz)
  directivityIndex: number;     // DI (dB)
  detectionThreshold: number;   // DT (dB)
  bandwidth: number;            // Receiver bandwidth (Hz)
}

/**
 * Active sonar equation
 * SE = SL - 2*TL + TS - (NL - DI) - DT
 * 
 * @returns Signal Excess in dB (positive = detected)
 */
export function activeSonarEquation(params: SonarEquationParams): number {
  const {
    sourceLevel,
    transmissionLoss,
    targetStrength,
    noiseLevel,
    directivityIndex,
    detectionThreshold,
    bandwidth,
  } = params;

  // Noise level adjusted for bandwidth (10 * log10(BW) for wideband)
  const NL_bw = noiseLevel + 10 * Math.log10(bandwidth);

  // Signal Excess
  const SE =
    sourceLevel -
    2 * transmissionLoss +
    targetStrength -
    (NL_bw - directivityIndex) -
    detectionThreshold;

  return SE;
}

/**
 * Passive sonar equation
 * SE = SL - TL - (NL - AG) - DT
 * 
 * @returns Signal Excess in dB (positive = detected)
 */
export function passiveSonarEquation(
  sourceLevel: number,      // Target radiated noise level
  transmissionLoss: number,
  noiseLevel: number,
  arrayGain: number,
  detectionThreshold: number,
  bandwidth: number
): number {
  const NL_bw = noiseLevel + 10 * Math.log10(bandwidth);
  const SE = sourceLevel - transmissionLoss - (NL_bw - arrayGain) - detectionThreshold;
  return SE;
}

/**
 * Calculate beam pattern response
 * Using sinc function approximation for a linear array
 * 
 * @param angle Off-axis angle in radians
 * @param beamWidth 3dB beam width in radians
 * @returns Beam pattern response in dB (0 at boresight, negative off-axis)
 */
export function beamPatternResponse(angle: number, beamWidth: number): number {
  if (Math.abs(angle) < 1e-6) return 0;

  // Sinc function approximation
  // -3dB at beamWidth/2
  const k = 1.39 / (beamWidth / 2); // Factor for -3dB at half beamwidth
  const x = k * angle;
  const sinc = Math.sin(x) / x;
  const response = 20 * Math.log10(Math.abs(sinc));

  // Limit sidelobe level
  return Math.max(response, -40);
}

/**
 * Calculate 2D beam pattern for visualization
 */
export function calculate2DBeamPattern(
  horizontalWidth: number, // degrees
  verticalWidth: number,   // degrees
  resolution: number = 360
): { bearing: number; elevation: number; intensity: number }[] {
  const pattern: { bearing: number; elevation: number; intensity: number }[] = [];
  const hWidthRad = (horizontalWidth * Math.PI) / 180;
  const vWidthRad = (verticalWidth * Math.PI) / 180;

  for (let i = 0; i < resolution; i++) {
    const bearing = (i / resolution) * 360;
    const bearingRad = (bearing * Math.PI) / 180;

    // Calculate off-axis angle (simplified for horizontal plane)
    const offAxis = Math.abs(bearingRad > Math.PI ? bearingRad - 2 * Math.PI : bearingRad);
    const response = beamPatternResponse(offAxis, hWidthRad);
    const intensity = Math.pow(10, response / 20);

    pattern.push({ bearing, elevation: 0, intensity });
  }

  return pattern;
}

/**
 * Process a sonar ping and generate detections
 */
export function processSonarPing(
  sensor: Sensor,
  sensorWorldPosition: Vector3,
  sensorVelocity: Vector3,
  sensorHeading: number,
  targets: Target[],
  waterProperties: { temperature: number; salinity: number; pH: number; seaState: number },
  soundSpeedProfile: { layers: Array<{ depth: number; speed: number }> },
  simulationTime: number
): { readings: SensorReading[]; detections: Detection[] } {
  const readings: SensorReading[] = [];
  const detections: Detection[] = [];

  // Get ambient noise
  const NL = ambientNoiseLevel(
    sensor.frequency,
    waterProperties.seaState,
    4 // Medium shipping
  );

  // Get sound speed at sensor depth
  const sensorDepth = -sensorWorldPosition.z;
  const soundSpeed = getSoundSpeedAtDepth(soundSpeedProfile, sensorDepth);

  for (const target of targets) {
    // Calculate geometry
    const bearing = calculateBearing(sensorWorldPosition, target.position);
    const relativeBearing = bearing - sensorHeading;
    const range = calculateSlantRange(sensorWorldPosition, target.position);

    // Skip if out of range
    if (range > sensor.maxRange) continue;

    // Horizontal range and elevation (depression from horizontal) for vertical beam
    const horizontalRange = Math.sqrt(
      (target.position.x - sensorWorldPosition.x) ** 2 +
      (target.position.y - sensorWorldPosition.y) ** 2
    );
    const deltaZ = sensorWorldPosition.z - target.position.z; // positive = target below sensor
    const elevationDeg = (180 / Math.PI) * Math.atan2(deltaZ, horizontalRange); // depression angle in degrees
    const verticalBeamAngle = sensor.beamPattern.verticalBeamAngle ?? 45;
    const halfVerticalWidth = (sensor.beamPattern.verticalWidth ?? 20) / 2;
    const inVerticalBeam =
      elevationDeg >= verticalBeamAngle - halfVerticalWidth &&
      elevationDeg <= verticalBeamAngle + halfVerticalWidth;
    if (!inVerticalBeam) continue;

    // Check if target is within horizontal beam
    const bearingRad = (relativeBearing * Math.PI) / 180;
    const beamWidthRad = (sensor.beamPattern.horizontalWidth * Math.PI) / 180;

    // Beam pattern attenuation (uses sensor config)
    const beamLoss = -beamPatternResponse(bearingRad, beamWidthRad);

    // Calculate transmission loss
    const TL = transmissionLoss(range, sensor.frequency, waterProperties);

    // Calculate Doppler shift
    const dopplerShift = calculateDopplerShift(
      sensor.frequency,
      sensor.type === 'active' ? sensorWorldPosition : target.position,
      sensor.type === 'active' ? sensorVelocity : target.velocity,
      sensor.type === 'active' ? target.position : sensorWorldPosition,
      sensor.type === 'active' ? target.velocity : sensorVelocity,
      soundSpeed
    );

    // Signal excess calculation
    let SE: number;
    
    if (sensor.type === 'active') {
      SE = activeSonarEquation({
        sourceLevel: sensor.sourceLevel - beamLoss,
        transmissionLoss: TL,
        targetStrength: target.targetStrength,
        noiseLevel: NL,
        directivityIndex: sensor.directivityIndex,
        detectionThreshold: sensor.detectionThreshold,
        bandwidth: sensor.bandwidth,
      });
    } else {
      // Passive - detect target's radiated noise
      SE = passiveSonarEquation(
        target.noiseLevel,
        TL,
        NL,
        sensor.directivityIndex,
        sensor.detectionThreshold,
        sensor.bandwidth
      );
    }

    // Calculate received signal level for display
    const signalLevel = sensor.type === 'active'
      ? sensor.sourceLevel - 2 * TL + target.targetStrength - beamLoss
      : target.noiseLevel - TL;

    // Add reading
    readings.push({
      sensorId: sensor.id,
      timestamp: simulationTime,
      bearing: bearing,
      range: range,
      intensity: signalLevel,
      doppler: dopplerShift,
    });

    // Check for detection
    if (SE > 0) {
      detections.push({
        id: `det-${sensor.id}-${target.id}-${simulationTime}`,
        sensorId: sensor.id,
        timestamp: simulationTime,
        position: { ...target.position },
        bearing: bearing,
        range: range,
        signalExcess: SE,
        classification: target.type,
        confidence: Math.min(1, SE / 20), // Confidence based on SE
      });
    }
  }

  return { readings, detections };
}

/**
 * Generate synthetic sonar returns for display
 * Creates realistic-looking sonar imagery with noise
 */
export function generateSonarReturns(
  sensor: Sensor,
  sensorPosition: Vector3,
  sensorHeading: number,
  targets: Target[],
  numBearingBins: number = 360,
  numRangeBins: number = 100
): Float32Array {
  const data = new Float32Array(numBearingBins * numRangeBins);
  const rangeResolution = sensor.maxRange / numRangeBins;

  // Add background noise
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 0.1;
  }

  // Add target returns
  for (const target of targets) {
    const bearing = calculateBearing(sensorPosition, target.position);
    const relativeBearing = ((bearing - sensorHeading) % 360 + 360) % 360;
    const range = calculateSlantRange(sensorPosition, target.position);

    if (range > sensor.maxRange) continue;

    const bearingBin = Math.floor((relativeBearing / 360) * numBearingBins);
    const rangeBin = Math.floor(range / rangeResolution);

    // Target return with beam pattern
    for (let db = -5; db <= 5; db++) {
      for (let dr = -2; dr <= 2; dr++) {
        const b = (bearingBin + db + numBearingBins) % numBearingBins;
        const r = rangeBin + dr;
        
        if (r >= 0 && r < numRangeBins) {
          const distance = Math.sqrt(db * db + dr * dr);
          const intensity = Math.exp(-distance * 0.5) * 0.8;
          data[r * numBearingBins + b] = Math.max(
            data[r * numBearingBins + b],
            intensity + Math.random() * 0.1
          );
        }
      }
    }
  }

  // Add some random clutter
  for (let i = 0; i < 50; i++) {
    const b = Math.floor(Math.random() * numBearingBins);
    const r = Math.floor(Math.random() * numRangeBins);
    data[r * numBearingBins + b] = Math.max(
      data[r * numBearingBins + b],
      Math.random() * 0.3
    );
  }

  return data;
}

/**
 * Calculate detection probability based on signal excess
 */
export function detectionProbability(signalExcess: number): number {
  // Using complementary error function approximation
  // Pd = 0.5 * erfc(-SE / sqrt(2))
  
  const x = signalExcess / Math.sqrt(2);
  
  // Approximation of erfc(-x) = 1 + erf(x)
  // Using Horner form approximation of erf
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const erf =
    1 -
    (((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t *
      0.254829592 *
      Math.exp(-x * x);

  const erfValue = x >= 0 ? erf : -erf;
  return 0.5 * (1 + erfValue);
}

