import { useMemo } from 'react';
import * as THREE from 'three';
import type { Target } from '../../types';

interface TargetVisualizationProps {
  targets: Target[];
}

const getTargetColor = (type: Target['type']): number => {
  switch (type) {
    case 'submarine':
      return 0xff4444; // Red
    case 'surface_vessel':
      return 0x4444ff; // Blue
    case 'biological':
      return 0x44ff44; // Green
    case 'mine':
      return 0xffff44; // Yellow
    case 'debris':
      return 0xff8844; // Orange
    default:
      return 0xffffff; // White
  }
};

export function TargetVisualization({ targets }: TargetVisualizationProps) {
  return (
    <>
      {targets.map((target) => {
        const color = getTargetColor(target.type);
        const position: [number, number, number] = [
          target.position.x,
          target.position.y,
          target.position.z,
        ];

        return (
          <group key={target.id} position={position}>
            {/* Main target marker */}
            <mesh>
              <sphereGeometry args={[target.size.x / 10, 16, 16]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.3}
                transparent
                opacity={0.8}
              />
            </mesh>
            
            {/* Target label indicator */}
            <mesh position={[0, 0, target.size.z / 2 + 5]}>
              <coneGeometry args={[3, 10, 8]} />
              <meshStandardMaterial color={color} />
            </mesh>
            
            {/* Velocity vector visualization */}
            {(() => {
              const vel = new THREE.Vector3(
                target.velocity.x,
                target.velocity.y,
                target.velocity.z
              );
              const speed = vel.length();
              if (speed > 0.1) {
                const arrowLength = Math.min(50, speed * 10);
                vel.normalize();
                return (
                  <mesh rotation={[
                    Math.atan2(vel.y, Math.sqrt(vel.x * vel.x + vel.z * vel.z)),
                    Math.atan2(vel.x, vel.z),
                    0
                  ]}>
                    <coneGeometry args={[2, arrowLength, 8]} />
                    <meshStandardMaterial color={color} />
                  </mesh>
                );
              }
              return null;
            })()}
          </group>
        );
      })}
    </>
  );
}

