import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { BathymetryMesh } from '../objects/BathymetryMesh';
import { WaterSurface } from '../objects/WaterSurface';
import { SensorCoverage } from '../objects/SensorCoverage';
import type { BathymetryData } from '../../types';

interface SceneContentProps {
  bathymetry: BathymetryData;
  platformPosition: { x: number; y: number; z: number };
  showGrid: boolean;
  showSensorCoverage: boolean;
  underwaterFog: boolean;
  cameraTarget: [number, number, number];
}

function SceneContent({ 
  bathymetry, 
  platformPosition, 
  showGrid,
  showSensorCoverage,
  underwaterFog,
  cameraTarget,
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

      {/* Grid — only when View panel "Show Grid" is on */}
      {showGrid && (
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
      )}

      {/* Platform marker */}
      <mesh position={targetPosition}>
        <sphereGeometry args={[5, 16, 16]} />
        <meshStandardMaterial color={0x00ff00} />
      </mesh>

      {/* Sensor coverage (beam from sensor config) */}
      {showSensorCoverage && <SensorCoverage />}

      {/* Camera controls — target scene center so view stays XZ (depth = Z, horizontal = X) */}
      <OrbitControls
        makeDefault
        target={cameraTarget}
        minDistance={10}
        maxDistance={2000}
      />
    </>
  );
}

interface UnderwaterSceneProps {
  bathymetry: BathymetryData;
  platformPosition: { x: number; y: number; z: number };
  showGrid?: boolean;
  showSensorCoverage?: boolean;
  underwaterFog?: boolean;
}

export function UnderwaterScene({ 
  bathymetry, 
  platformPosition,
  showGrid = true,
  showSensorCoverage = true,
  underwaterFog = true,
}: UnderwaterSceneProps) {
  // Camera looks along +Y so we see XZ plane: X horizontal, Z vertical (depth)
  const cameraPosition = useMemo(() => [
    bathymetry.width / 2,
    bathymetry.height / 2 - 600,
    100,
  ] as [number, number, number], [bathymetry.width, bathymetry.height]);

  const cameraTarget = useMemo(() => [
    bathymetry.width / 2,
    bathymetry.height / 2,
    0,
  ] as [number, number, number], [bathymetry.width, bathymetry.height]);

  return (
    <Canvas
      camera={{
        position: cameraPosition,
        up: [0, 0, 1],
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
      {underwaterFog && <fog attach="fog" args={[0x001428, 100, 2000]} />}
      <SceneContent 
        bathymetry={bathymetry}
        platformPosition={platformPosition}
        showGrid={showGrid}
        showSensorCoverage={showSensorCoverage}
        underwaterFog={underwaterFog}
        cameraTarget={cameraTarget}
      />
    </Canvas>
  );
}
