/**
 * Ghost outline of the search/coverage area in the 3D scene.
 * Renders a semi-transparent wireframe rectangle at the survey depth.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import type { SearchArea } from '../../utils/coveragePath';

interface CoverageAreaGhostProps {
  area: SearchArea;
  depthM: number;
}

export function CoverageAreaGhost({ area, depthM }: CoverageAreaGhostProps) {
  const { minX, maxX, minY, maxY } = area;
  const z = -Math.max(0, depthM);

  const points = useMemo(() => {
    return [
      new THREE.Vector3(minX, minY, z),
      new THREE.Vector3(maxX, minY, z),
      new THREE.Vector3(maxX, maxY, z),
      new THREE.Vector3(minX, maxY, z),
      new THREE.Vector3(minX, minY, z),
    ];
  }, [minX, maxX, minY, maxY, z]);

  const geometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [points]);

  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: 0x4fc3f7,
        transparent: true,
        opacity: 0.5,
      }),
    []
  );

  return <line geometry={geometry} material={material} />;
}
