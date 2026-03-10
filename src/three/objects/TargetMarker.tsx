import * as THREE from 'three';
import type { Target } from '../../types';
import type { TargetTypeKey } from '../../utils/targetFactory';

interface TargetMarkerProps {
  target: Target;
  detected?: boolean;
}

/** Scale for target markers - larger so they're visible in the world (meters → scene units) */
const SCALE = 1.2;

function SubmarineShape() {
  return (
    <mesh>
      <cylinderGeometry args={[4 * SCALE, 4 * SCALE, 25 * SCALE, 8]} />
      <meshStandardMaterial color={0x4a5568} metalness={0.6} roughness={0.4} />
    </mesh>
  );
}

function VesselShape() {
  return (
    <group>
      <mesh position={[0, 0, 2 * SCALE]}>
        <boxGeometry args={[20 * SCALE, 8 * SCALE, 6 * SCALE]} />
        <meshStandardMaterial color={0x2d3748} metalness={0.5} roughness={0.5} />
      </mesh>
    </group>
  );
}

function WhaleShape() {
  return (
    <mesh>
      <sphereGeometry args={[6 * SCALE, 16, 12]} />
      <meshStandardMaterial color={0x718096} roughness={0.8} />
    </mesh>
  );
}

function MineShape() {
  return (
    <mesh>
      <cylinderGeometry args={[2 * SCALE, 2.5 * SCALE, 3 * SCALE, 12]} />
      <meshStandardMaterial color={0x4a5568} metalness={0.7} roughness={0.3} />
    </mesh>
  );
}

export function TargetMarker({ target, detected = false }: TargetMarkerProps) {
  const pos: [number, number, number] = [target.position.x, target.position.y, target.position.z];
  const typeKey = target.type as TargetTypeKey;

  return (
    <group position={pos}>
      {/* Always show a bright orange sphere so the target is easy to find */}
      <mesh>
        <sphereGeometry args={[12, 16, 16]} />
        <meshStandardMaterial
          color={0xff9800}
          emissive={0xff9800}
          emissiveIntensity={0.6}
        />
      </mesh>
      {typeKey === 'submarine' && <SubmarineShape />}
      {typeKey === 'surface_vessel' && <VesselShape />}
      {typeKey === 'biological' && <WhaleShape />}
      {typeKey === 'mine' && <MineShape />}
      {!['submarine', 'surface_vessel', 'biological', 'mine'].includes(typeKey) && (
        <mesh>
          <sphereGeometry args={[6 * SCALE, 12, 12]} />
          <meshStandardMaterial color={0xff9800} emissive={0xff9800} emissiveIntensity={0.4} />
        </mesh>
      )}
      {detected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[18, 22, 32]} />
          <meshBasicMaterial color={0xffeb3b} transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
