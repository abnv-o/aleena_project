import { useMemo } from 'react';
import * as THREE from 'three';
import type { Ray } from '../../types';

interface RayPathVisualizationProps {
  rays: Array<{
    points: Array<{
      position: { x: number; y: number; z: number };
      intensity: number;
    }>;
  }>;
}

// Color gradient for ray intensity
function getIntensityColor(intensity: number): THREE.Color {
  // Hot colormap: black -> red -> yellow -> white
  if (intensity < 0.25) {
    return new THREE.Color(intensity * 4, 0, 0);
  } else if (intensity < 0.5) {
    return new THREE.Color(1, (intensity - 0.25) * 4, 0);
  } else if (intensity < 0.75) {
    return new THREE.Color(1, 1, (intensity - 0.5) * 4);
  } else {
    const t = (intensity - 0.75) * 4;
    return new THREE.Color(1, 1, 0.5 + t * 0.5);
  }
}

export function RayPathVisualization({ rays }: RayPathVisualizationProps) {
  const lineGeometries = useMemo(() => {
    return rays.map((ray, rayIndex) => {
      if (ray.points.length < 2) return null;

      const points: THREE.Vector3[] = [];
      const colors: number[] = [];

      for (const point of ray.points) {
        points.push(
          new THREE.Vector3(point.position.x, point.position.y, point.position.z)
        );
        const color = getIntensityColor(point.intensity);
        colors.push(color.r, color.g, color.b);
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      geometry.setAttribute(
        'color',
        new THREE.Float32BufferAttribute(colors, 3)
      );

      return geometry;
    });
  }, [rays]);

  const lineMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        linewidth: 1,
      }),
    []
  );

  return (
    <group>
      {lineGeometries.map(
        (geometry, index) =>
          geometry && (
            <line key={index} geometry={geometry} material={lineMaterial} />
          )
      )}
    </group>
  );
}

// Simplified 2D ray path visualization for side panel
interface RayPath2DProps {
  rays: Array<{
    points: Array<{
      position: { x: number; y: number; z: number };
      intensity: number;
    }>;
  }>;
  maxRange: number;
  maxDepth: number;
}

export function RayPath2DVisualization({
  rays,
  maxRange,
  maxDepth,
}: RayPath2DProps) {
  const lineGeometries = useMemo(() => {
    return rays.map((ray) => {
      if (ray.points.length < 2) return null;

      // Project to 2D: use horizontal range vs depth
      const points: THREE.Vector3[] = [];

      const firstPoint = ray.points[0];
      for (const point of ray.points) {
        const dx = point.position.x - firstPoint.position.x;
        const dy = point.position.y - firstPoint.position.y;
        const range = Math.sqrt(dx * dx + dy * dy);
        const depth = -point.position.z;

        // Normalize to view coordinates
        const x = (range / maxRange) * 2 - 1;
        const y = 1 - (depth / maxDepth) * 2;

        points.push(new THREE.Vector3(x, y, 0));
      }

      return new THREE.BufferGeometry().setFromPoints(points);
    });
  }, [rays, maxRange, maxDepth]);

  return (
    <group>
      {lineGeometries.map(
        (geometry, index) =>
          geometry && (
            <line key={index} geometry={geometry}>
              <lineBasicMaterial
                color={new THREE.Color().setHSL(index / rays.length, 0.8, 0.5)}
                transparent
                opacity={0.6}
              />
            </line>
          )
      )}
    </group>
  );
}



