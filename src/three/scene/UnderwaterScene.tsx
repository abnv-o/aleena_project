import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { BathymetryMesh } from '../objects/BathymetryMesh';
import { WaterSurface } from '../objects/WaterSurface';
import { RayPathVisualization } from '../objects/RayPathVisualization';
import { TargetVisualization } from '../objects/TargetVisualization';
import type { BathymetryData, Target } from '../../types';

interface SceneContentProps {
  bathymetry: BathymetryData;
  platformPosition: { x: number; y: number; z: number };
  showRayPaths: boolean;
  showTargets?: boolean;
  targets?: Target[];
  rayTracingResult?: {
    rays: Array<{
      points: Array<{ position: { x: number; y: number; z: number }; intensity: number }>;
    }>;
  } | null;
}

function SceneContent({ 
  bathymetry, 
  platformPosition, 
  showRayPaths,
  showTargets = true,
  targets = [],
  rayTracingResult 
}: SceneContentProps) {
  const targetPosition = useMemo(() => 
    [platformPosition.x, platformPosition.y, platformPosition.z] as [number, number, number],
    [platformPosition.x, platformPosition.y, platformPosition.z]
  );

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} color={0x4488aa} />
      <directionalLight
        position={[100, 100, 200]}
        intensity={0.6}
        color={0x88ccff}
      />

      {/* Environment */}
      <WaterSurface
        width={bathymetry.width}
        height={bathymetry.height}
      />
      <BathymetryMesh bathymetry={bathymetry} />

      {/* Grid */}
      <Grid
        args={[bathymetry.width, bathymetry.height]}
        position={[bathymetry.width / 2, bathymetry.height / 2, -10]}
        cellSize={50}
        cellThickness={0.5}
        cellColor={0x224466}
        sectionSize={200}
        sectionThickness={1}
        sectionColor={0x446688}
        fadeDistance={2000}
        fadeStrength={1}
      />

      {/* Platform marker */}
      <mesh position={targetPosition}>
        <sphereGeometry args={[5, 16, 16]} />
        <meshStandardMaterial color={0x00ff00} />
      </mesh>

      {/* Ray paths */}
      {showRayPaths && rayTracingResult && (
        <RayPathVisualization rays={rayTracingResult.rays} />
      )}

      {/* Targets */}
      {showTargets && targets.length > 0 && (
        <TargetVisualization targets={targets} />
      )}

      {/* Camera controls */}
      <OrbitControls
        makeDefault
        target={targetPosition}
        minDistance={10}
        maxDistance={2000}
      />
    </>
  );
}

interface UnderwaterSceneProps {
  bathymetry: BathymetryData;
  platformPosition: { x: number; y: number; z: number };
  showRayPaths?: boolean;
  showTargets?: boolean;
  targets?: Target[];
  rayTracingResult?: {
    rays: Array<{
      points: Array<{ position: { x: number; y: number; z: number }; intensity: number }>;
    }>;
  } | null;
}

export function UnderwaterScene({ 
  bathymetry, 
  platformPosition,
  showRayPaths = true,
  showTargets = true,
  targets = [],
  rayTracingResult 
}: UnderwaterSceneProps) {
  const cameraPosition = useMemo(() => [
    bathymetry.width / 2 + 300,
    bathymetry.height / 2 - 300,
    100,
  ] as [number, number, number], [bathymetry.width, bathymetry.height]);

  return (
    <Canvas
      camera={{
        position: cameraPosition,
        fov: 60,
        near: 1,
        far: 10000,
      }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.8,
      }}
      style={{ background: 'linear-gradient(180deg, #001428 0%, #000a14 100%)' }}
    >
      <color attach="background" args={[0x001020]} />
      <fog attach="fog" args={[0x001428, 100, 2000]} />
      <SceneContent 
        bathymetry={bathymetry}
        platformPosition={platformPosition}
        showRayPaths={showRayPaths}
        showTargets={showTargets}
        targets={targets}
        rayTracingResult={rayTracingResult}
      />
    </Canvas>
  );
}
