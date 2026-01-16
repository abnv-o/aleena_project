import { useMemo } from 'react';
import * as THREE from 'three';
import { useSensorStore, usePlatformStore } from '../../store';
import { degToRad } from '../../utils/math';

export function SensorCoverage() {
  const sensors = useSensorStore((state) => Array.from(state.sensors.values()));
  const platform = usePlatformStore((state) => state.platform);

  const coverageGeometries = useMemo(() => {
    return sensors
      .filter((sensor) => sensor.isActive)
      .map((sensor) => {
        const horizontalAngle = degToRad(sensor.beamPattern.horizontalWidth);
        const verticalAngle = degToRad(sensor.beamPattern.verticalWidth);
        const range = sensor.maxRange / 10; // Scale down for visualization

        // Create a cone representing the sensor coverage
        // Using custom geometry for more accurate beam shape
        const segments = 32;
        const positions: number[] = [];
        const indices: number[] = [];

        // Apex of the cone (sensor position)
        positions.push(0, 0, 0);

        // Generate cone base vertices
        for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          const azimuth = -horizontalAngle / 2 + t * horizontalAngle;
          
          // Calculate position on cone surface
          const x = range * Math.sin(azimuth);
          const y = range * Math.cos(azimuth);
          const z = 0; // Horizontal beam for now
          
          positions.push(x, y, z);
        }

        // Create triangles from apex to base
        for (let i = 1; i <= segments; i++) {
          indices.push(0, i, i + 1);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(positions, 3)
        );
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        return {
          geometry,
          sensor,
          color:
            sensor.type === 'active'
              ? new THREE.Color(0x00ff88)
              : new THREE.Color(0x8888ff),
        };
      });
  }, [sensors]);

  return (
    <group
      position={[platform.position.x, platform.position.y, platform.position.z]}
      rotation={[0, 0, -degToRad(platform.heading)]}
    >
      {coverageGeometries.map(({ geometry, sensor, color }, index) => (
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

      {/* Sensor coverage edge lines */}
      {coverageGeometries.map(({ sensor, color }) => {
        const range = sensor.maxRange / 10;
        const halfAngle = degToRad(sensor.beamPattern.horizontalWidth / 2);

        const leftEdge = new THREE.Vector3(
          -range * Math.sin(halfAngle),
          range * Math.cos(halfAngle),
          0
        );
        const rightEdge = new THREE.Vector3(
          range * Math.sin(halfAngle),
          range * Math.cos(halfAngle),
          0
        );

        const points = [
          new THREE.Vector3(0, 0, 0),
          leftEdge,
          new THREE.Vector3(0, 0, 0),
          rightEdge,
        ];

        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);

        return (
          <lineSegments key={`edge-${sensor.id}`} geometry={lineGeometry}>
            <lineBasicMaterial color={color} transparent opacity={0.5} />
          </lineSegments>
        );
      })}
    </group>
  );
}


