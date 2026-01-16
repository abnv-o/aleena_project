import type { SoundSpeedProfile, SoundSpeedLayer, WaterProperties } from '../types';

/**
 * Calculate sound speed using the Mackenzie equation (1981)
 * Valid for: T: 2-30°C, S: 25-40 PSU, D: 0-8000m
 * 
 * @param temperature Temperature in Celsius
 * @param salinity Salinity in PSU
 * @param depth Depth in meters
 * @returns Sound speed in m/s
 */
export function mackenzieEquation(
  temperature: number,
  salinity: number,
  depth: number
): number {
  const T = temperature;
  const S = salinity;
  const D = depth;

  const c =
    1448.96 +
    4.591 * T -
    0.05304 * T * T +
    0.0002374 * T * T * T +
    1.34 * (S - 35) +
    0.0163 * D +
    1.675e-7 * D * D -
    0.01025 * T * (S - 35) -
    7.139e-13 * T * D * D * D;

  return c;
}

/**
 * Calculate sound speed using UNESCO algorithm (Chen & Millero, 1977)
 * More accurate but more complex
 */
export function unescoSoundSpeed(
  temperature: number,
  salinity: number,
  pressure: number // pressure in dbar (approximately = depth in m)
): number {
  const T = temperature;
  const S = salinity;
  const P = pressure / 10; // Convert to bars

  // Coefficients for pure water
  const C00 = 1402.388;
  const C01 = 5.03830;
  const C02 = -0.0580852;
  const C03 = 3.342e-4;
  const C04 = -1.478e-6;
  const C05 = 3.146e-9;
  
  const C10 = 0.153563;
  const C11 = 6.8999e-4;
  const C12 = -8.1829e-6;
  const C13 = 1.3632e-7;
  const C14 = -6.1260e-10;
  
  const C20 = 3.1260e-5;
  const C21 = -1.7111e-6;
  const C22 = 2.5986e-8;
  const C23 = -2.5353e-10;
  const C24 = 1.0415e-12;
  
  const C30 = -9.7729e-9;
  const C31 = 3.8513e-10;
  const C32 = -2.3654e-12;

  // Pure water sound speed
  const CW =
    C00 + C01 * T + C02 * T * T + C03 * T ** 3 + C04 * T ** 4 + C05 * T ** 5 +
    (C10 + C11 * T + C12 * T * T + C13 * T ** 3 + C14 * T ** 4) * P +
    (C20 + C21 * T + C22 * T * T + C23 * T ** 3 + C24 * T ** 4) * P * P +
    (C30 + C31 * T + C32 * T * T) * P ** 3;

  // Salinity correction coefficients
  const A00 = 1.389;
  const A01 = -1.262e-2;
  const A02 = 7.166e-5;
  const A03 = 2.008e-6;
  const A04 = -3.21e-8;
  
  const A10 = 9.4742e-5;
  const A11 = -1.2583e-5;
  const A12 = -6.4928e-8;
  const A13 = 1.0515e-8;
  const A14 = -2.0142e-10;
  
  const A20 = -3.9064e-7;
  const A21 = 9.1061e-9;
  const A22 = -1.6009e-10;
  const A23 = 7.994e-12;
  
  const A30 = 1.100e-10;
  const A31 = 6.651e-12;
  const A32 = -3.391e-13;

  const A =
    A00 + A01 * T + A02 * T * T + A03 * T ** 3 + A04 * T ** 4 +
    (A10 + A11 * T + A12 * T * T + A13 * T ** 3 + A14 * T ** 4) * P +
    (A20 + A21 * T + A22 * T * T + A23 * T ** 3) * P * P +
    (A30 + A31 * T + A32 * T * T) * P ** 3;

  const B00 = -1.922e-2;
  const B01 = -4.42e-5;
  const B10 = 7.3637e-5;
  const B11 = 1.7950e-7;

  const B = B00 + B01 * T + (B10 + B11 * T) * P;

  const D00 = 1.727e-3;
  const D10 = -7.9836e-6;

  const D = D00 + D10 * P;

  // Final sound speed
  return CW + A * S + B * S ** 1.5 + D * S * S;
}

/**
 * Create a default sound speed profile with typical ocean conditions
 */
export function createDefaultSoundSpeedProfile(): SoundSpeedProfile {
  // Typical deep ocean sound speed profile
  // Shows thermocline, SOFAR channel, and deep isothermal layer
  const layers: SoundSpeedLayer[] = [
    { depth: 0, speed: 1520, temperature: 20, salinity: 35 },
    { depth: 25, speed: 1518, temperature: 19, salinity: 35 },
    { depth: 50, speed: 1515, temperature: 17, salinity: 35 },
    { depth: 100, speed: 1500, temperature: 12, salinity: 35 },
    { depth: 200, speed: 1485, temperature: 8, salinity: 35 },
    { depth: 400, speed: 1475, temperature: 6, salinity: 35 },
    { depth: 600, speed: 1480, temperature: 5, salinity: 35 },
    { depth: 800, speed: 1485, temperature: 4.5, salinity: 35 },
    { depth: 1000, speed: 1490, temperature: 4, salinity: 35 },
    { depth: 1500, speed: 1500, temperature: 3.5, salinity: 35 },
    { depth: 2000, speed: 1510, temperature: 3, salinity: 35 },
    { depth: 3000, speed: 1525, temperature: 2.5, salinity: 35 },
    { depth: 4000, speed: 1540, temperature: 2, salinity: 35 },
    { depth: 5000, speed: 1555, temperature: 1.8, salinity: 35 },
  ];

  return { layers };
}

/**
 * Create a sound speed profile from water properties
 */
export function createProfileFromProperties(
  waterProperties: WaterProperties,
  maxDepth: number,
  numLayers: number = 20
): SoundSpeedProfile {
  const layers: SoundSpeedLayer[] = [];
  
  // Simple thermocline model
  const surfaceTemp = waterProperties.temperature;
  const deepTemp = Math.max(2, surfaceTemp - 18);
  const thermoclineDepth = 100;
  const thermoclineThickness = 200;

  for (let i = 0; i < numLayers; i++) {
    const depth = (i / (numLayers - 1)) * maxDepth;
    
    // Temperature profile with thermocline
    let temperature: number;
    if (depth <= thermoclineDepth) {
      // Mixed layer (constant temperature)
      temperature = surfaceTemp;
    } else if (depth <= thermoclineDepth + thermoclineThickness) {
      // Thermocline (rapid decrease)
      const t = (depth - thermoclineDepth) / thermoclineThickness;
      temperature = surfaceTemp - (surfaceTemp - deepTemp) * t;
    } else {
      // Deep layer (slow decrease)
      const t = (depth - thermoclineDepth - thermoclineThickness) / 
                (maxDepth - thermoclineDepth - thermoclineThickness);
      temperature = deepTemp - t * 1.5;
    }

    temperature = Math.max(1.5, temperature);
    
    const speed = mackenzieEquation(temperature, waterProperties.salinity, depth);
    
    layers.push({
      depth,
      speed,
      temperature,
      salinity: waterProperties.salinity,
    });
  }

  return { layers };
}

/**
 * Get sound speed at a specific depth by interpolating the profile
 */
export function getSoundSpeedAtDepth(
  profile: SoundSpeedProfile,
  depth: number
): number {
  const { layers } = profile;

  if (layers.length === 0) return 1500; // Default ocean sound speed

  // Handle out-of-range depths
  if (depth <= layers[0].depth) return layers[0].speed;
  if (depth >= layers[layers.length - 1].depth) {
    return layers[layers.length - 1].speed;
  }

  // Find surrounding layers and interpolate
  for (let i = 0; i < layers.length - 1; i++) {
    if (depth >= layers[i].depth && depth < layers[i + 1].depth) {
      const t = (depth - layers[i].depth) / (layers[i + 1].depth - layers[i].depth);
      return layers[i].speed + t * (layers[i + 1].speed - layers[i].speed);
    }
  }

  return layers[layers.length - 1].speed;
}

/**
 * Get temperature at a specific depth by interpolating the profile
 */
export function getTemperatureAtDepth(
  profile: SoundSpeedProfile,
  depth: number
): number {
  const { layers } = profile;

  if (layers.length === 0) return 15;

  if (depth <= layers[0].depth) return layers[0].temperature;
  if (depth >= layers[layers.length - 1].depth) {
    return layers[layers.length - 1].temperature;
  }

  for (let i = 0; i < layers.length - 1; i++) {
    if (depth >= layers[i].depth && depth < layers[i + 1].depth) {
      const t = (depth - layers[i].depth) / (layers[i + 1].depth - layers[i].depth);
      return layers[i].temperature + t * (layers[i + 1].temperature - layers[i].temperature);
    }
  }

  return layers[layers.length - 1].temperature;
}

/**
 * Calculate the sound speed gradient at a depth
 */
export function getSoundSpeedGradient(
  profile: SoundSpeedProfile,
  depth: number,
  epsilon: number = 1
): number {
  const c1 = getSoundSpeedAtDepth(profile, depth - epsilon);
  const c2 = getSoundSpeedAtDepth(profile, depth + epsilon);
  return (c2 - c1) / (2 * epsilon);
}

/**
 * Find the SOFAR channel depth (minimum sound speed depth)
 */
export function findSOFARChannelDepth(profile: SoundSpeedProfile): number {
  let minSpeed = Infinity;
  let sofarDepth = 0;

  for (const layer of profile.layers) {
    if (layer.speed < minSpeed) {
      minSpeed = layer.speed;
      sofarDepth = layer.depth;
    }
  }

  return sofarDepth;
}


