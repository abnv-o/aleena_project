import { useMemo } from 'react';
import * as THREE from 'three';
import { useSensorStore, usePlatformStore } from '../../store';
import { degToRad } from '../../utils/math';

/** Scale factor so beam fits in view (maxRange can be 10000+ m) */
const RANGE_SCALE = 1 / 15;

/**
 * Build beam geometry from sensor config:
 * - horizontalWidth: bearing spread (deg)
 * - verticalWidth: elevation spread (deg)
 * - verticalBeamAngle: depression of beam center from horizontal (deg)
 * - maxRange: range in m (scaled for viz)
 * Local frame: X = forward, Y = starboard, Z = up. Beam center depressed by verticalBeamAngle.
 */
function buildBeamGeometry(sensor: {
  beamPattern: { horizontalWidth: number; verticalWidth: number; verticalBeamAngle?: number };
  maxRange: number;
}): THREE.BufferGeometry {
  const hHalf = degToRad(sensor.beamPattern.horizontalWidth / 2);
  const vHalf = degToRad(sensor.beamPattern.verticalWidth / 2);
  const vCenter = degToRad(sensor.beamPattern.verticalBeamAngle ?? 45);
  const range = sensor.maxRange * RANGE_SCALE;

  const nBearing = 12;
  const nElevation = 8;
  const positions: number[] = [0, 0, 0]; // apex

  for (let j = 0; j <= nElevation; j++) {
    const e = vCenter - vHalf + (j / nElevation) * 2 * vHalf;
    for (let i = 0; i <= nBearing; i++) {
      const b = -hHalf + (i / nBearing) * 2 * hHalf;
      const x = range * Math.cos(e) * Math.cos(b);
      const y = range * Math.cos(e) * Math.sin(b);
      const z = -range * Math.sin(e);
      positions.push(x, y, z);
    }
  }

  const indices: number[] = [];
  const apex = 0;
  for (let j = 0; j < nElevation; j++) {
    for (let i = 0; i < nBearing; i++) {
      const i1 = 1 + i + j * (nBearing + 1);
      const i2 = 1 + (i + 1) + j * (nBearing + 1);
      const i3 = 1 + (i + 1) + (j + 1) * (nBearing + 1);
      const i4 = 1 + i + (j + 1) * (nBearing + 1);
      indices.push(apex, i1, i2, apex, i2, i3, apex, i3, i4, apex, i4, i1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Stable config key so we only rebuild geometry when sensor config actually changes (avoids per-frame new refs → update loop) */
function getSensorConfigKey(sensors: Map<string, { id: string; isActive: boolean; beamPattern: { horizontalWidth: number; verticalWidth: number; verticalBeamAngle?: number }; maxRange: number }>): string {
  return Array.from(sensors.values())
    .filter((s) => s.isActive)
    .map(
      (s) =>
        `${s.id}-${s.beamPattern.horizontalWidth}-${s.beamPattern.verticalWidth}-${s.beamPattern.verticalBeamAngle ?? 45}-${s.maxRange}`
    )
    .join('|');
}

export function SensorCoverage() {
  const configKey = useSensorStore((state) => getSensorConfigKey(state.sensors));
  const platform = usePlatformStore((state) => state.platform);

  const coverageGeometries = useMemo(() => {
    const store = useSensorStore.getState();
    return Array.from(store.sensors.values())
      .filter((sensor) => sensor.isActive)
      .map((sensor) => {
        const geometry = buildBeamGeometry(sensor);
        const color =
          sensor.type === 'active'
            ? new THREE.Color(0x00ff88)
            : new THREE.Color(0x8888ff);
        return { geometry, sensor, color };
      });
  }, [configKey]);

  return (
    <group
      position={[platform.position.x, platform.position.y, platform.position.z]}
      rotation={[0, 0, -degToRad(platform.heading)]}
    >
      {coverageGeometries.map(({ geometry, sensor, color }) => (
        <mesh key={sensor.id} geometry={geometry}>
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.15}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}



