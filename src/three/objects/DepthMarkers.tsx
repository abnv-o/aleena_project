import { useMemo } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

interface DepthMarkersProps {
  maxDepth: number;
  interval?: number;
}

export function DepthMarkers({ maxDepth, interval = 100 }: DepthMarkersProps) {
  const markers = useMemo(() => {
    const result: { depth: number; position: [number, number, number] }[] = [];
    
    for (let depth = 0; depth <= maxDepth; depth += interval) {
      result.push({
        depth,
        position: [0, 0, -depth],
      });
    }
    
    return result;
  }, [maxDepth, interval]);

  return (
    <group>
      {markers.map(({ depth, position }) => (
        <group key={depth} position={position}>
          {/* Horizontal line at depth */}
          <mesh>
            <planeGeometry args={[50, 0.5]} />
            <meshBasicMaterial
              color={depth === 0 ? 0x4488ff : 0x446688}
              transparent
              opacity={0.5}
            />
          </mesh>

          {/* Depth label */}
          <Text
            position={[-30, 0, 0]}
            fontSize={8}
            color={0x88aacc}
            anchorX="right"
            anchorY="middle"
          >
            {depth}m
          </Text>
        </group>
      ))}

      {/* Vertical depth scale line */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={new Float32Array([
              -25, 0, 0,
              -25, 0, -maxDepth,
            ])}
            count={2}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={0x446688} />
      </line>
    </group>
  );
}



