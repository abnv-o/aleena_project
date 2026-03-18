import { transmissionLoss, geometricSpreadingLoss, ambientNoiseLevel } from './src/core/physics/acoustics';

const maxRange = 10000;
const frequency = 8000;
// water properties default
const wp = { temperature: 15, salinity: 35, depth: 1000, seaState: 2 };

const TL_dB = transmissionLoss(maxRange, frequency, wp, 'spherical');
const spreadingLoss_dB = geometricSpreadingLoss(maxRange, 'spherical');
const absorptionLoss_dB = TL_dB - spreadingLoss_dB;

const NL_dB = ambientNoiseLevel(frequency, 2, 4);
const bandwidth = 500;
const totalNoiseLevel_dB = NL_dB + 10 * Math.log10(bandwidth);

const refTargetStrength = 15;
const sourceLevel = 220;
const directivityIndex = 20; // default in store

const referenceSnr_dB = sourceLevel - 2 * TL_dB + refTargetStrength - (totalNoiseLevel_dB - directivityIndex);

console.log({
  TL_dB,
  spreadingLoss_dB,
  absorptionLoss_dB,
  NL_dB,
  totalNoiseLevel_dB,
  referenceSnr_dB
});
