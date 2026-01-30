import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Platform } from '../../types';

interface PlatformModelProps {
  platform: Platform;
}

export function PlatformModel({ platform }: PlatformModelProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Create submarine geometry
  const submarineGeometry = useMemo(() => {
    const group = new THREE.Group();

    // Main hull (elongated ellipsoid)
    const hullLength = platform.config.length / 10; // Scale down for visualization
    const hullRadius = platform.config.beam / 10;

    // Hull body
    const hullGeometry = new THREE.CapsuleGeometry(
      hullRadius,
      hullLength - hullRadius * 2,
      16,
      32
    );
    hullGeometry.rotateX(Math.PI / 2);

    // Conning tower (sail)
    const sailGeometry = new THREE.BoxGeometry(
      hullRadius * 0.8,
      hullRadius * 1.5,
      hullRadius * 1.2
    );

    // Propeller area
    const propGeometry = new THREE.ConeGeometry(
      hullRadius * 0.6,
      hullRadius * 1.5,
      8
    );
    propGeometry.rotateX(-Math.PI / 2);

    return {
      hull: hullGeometry,
      sail: sailGeometry,
      propeller: propGeometry,
    };
  }, [platform.config]);

  // Update position and rotation
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(
        platform.position.x,
        platform.position.y,
        platform.position.z
      );

      // Apply rotation: heading (yaw), pitch, roll
      groupRef.current.rotation.set(
        (platform.pitch * Math.PI) / 180,
        0,
        (-platform.heading * Math.PI) / 180
      );
    }
  });

  const hullMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x2a2a3a,
        metalness: 0.7,
        roughness: 0.3,
      }),
    []
  );

  const sailMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x1a1a2a,
        metalness: 0.6,
        roughness: 0.4,
      }),
    []
  );

  const accentMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x886644,
        metalness: 0.8,
        roughness: 0.2,
      }),
    []
  );

  const hullLength = platform.config.length / 10;
  const hullRadius = platform.config.beam / 10;

  return (
    <group ref={groupRef}>
      {/* Main hull */}
      <mesh geometry={submarineGeometry.hull} material={hullMaterial} />

      {/* Conning tower / Sail */}
      <mesh
        geometry={submarineGeometry.sail}
        material={sailMaterial}
        position={[0, hullLength * 0.15, hullRadius * 0.8]}
      />

      {/* Propeller cone */}
      <mesh
        geometry={submarineGeometry.propeller}
        material={accentMaterial}
        position={[0, -hullLength / 2 - hullRadius * 0.5, 0]}
      />

      {/* Bow light */}
      <pointLight
        position={[0, hullLength / 2, 0]}
        color={0xffffaa}
        intensity={0.5}
        distance={100}
      />

      {/* Direction indicator (forward arrow) */}
      <mesh position={[0, hullLength / 2 + 2, 0]}>
        <coneGeometry args={[1, 3, 4]} />
        <meshBasicMaterial color={0x00ff00} transparent opacity={0.7} />
      </mesh>

      {/* Depth indicator ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[hullRadius * 1.5, 0.2, 8, 32]} />
        <meshBasicMaterial
          color={platform.depth > 100 ? 0xff4444 : 0x44ff44}
          transparent
          opacity={0.5}
        />
      </mesh>

      {/* Coordinate axes for reference */}
      <axesHelper args={[10]} />
    </group>
  );
}



