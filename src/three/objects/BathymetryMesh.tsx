import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { BathymetryData } from '../../types';

interface BathymetryMeshProps {
  bathymetry: BathymetryData;
}

// Custom shader for bathymetry coloring
const bathymetryVertexShader = `
  varying float vDepth;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vDepth = -position.z;
    vNormal = normalMatrix * normal;
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const bathymetryFragmentShader = `
  uniform float minDepth;
  uniform float maxDepth;
  uniform vec3 shallowColor;
  uniform vec3 deepColor;
  uniform vec3 lightDirection;

  varying float vDepth;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    // Depth-based coloring
    float t = clamp((vDepth - minDepth) / (maxDepth - minDepth), 0.0, 1.0);
    vec3 baseColor = mix(shallowColor, deepColor, t);

    // Simple lighting
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(lightDirection);
    float diffuse = max(dot(normal, lightDir), 0.0);
    float ambient = 0.3;

    // Depth-based darkening (deeper = darker due to light absorption)
    float depthFactor = 1.0 - t * 0.5;

    vec3 finalColor = baseColor * (ambient + diffuse * 0.7) * depthFactor;

    // Add slight blue tint for underwater effect
    finalColor = mix(finalColor, vec3(0.0, 0.2, 0.4), t * 0.2);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export function BathymetryMesh({ bathymetry }: BathymetryMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const gridWidth = Math.floor(bathymetry.width / bathymetry.resolution);
    const gridHeight = Math.floor(bathymetry.height / bathymetry.resolution);

    const geo = new THREE.PlaneGeometry(
      bathymetry.width,
      bathymetry.height,
      gridWidth - 1,
      gridHeight - 1
    );

    // Modify vertices to match depth data
    const positions = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length / 3; i++) {
      const gridX = i % gridWidth;
      const gridY = Math.floor(i / gridWidth);
      const idx = gridY * gridWidth + gridX;

      if (idx < bathymetry.depths.length) {
        // Set Z (depth) - negative because depth is below surface
        positions[i * 3 + 2] = -bathymetry.depths[idx];
      }
    }

    geo.computeVertexNormals();
    geo.attributes.position.needsUpdate = true;

    return geo;
  }, [bathymetry]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        minDepth: { value: bathymetry.minDepth },
        maxDepth: { value: bathymetry.maxDepth },
        shallowColor: { value: new THREE.Color(0x4a8f6e) }, // Sandy/green shallow
        deepColor: { value: new THREE.Color(0x0a2a4a) }, // Deep blue
        lightDirection: { value: new THREE.Vector3(0.5, 0.5, 1).normalize() },
      },
      vertexShader: bathymetryVertexShader,
      fragmentShader: bathymetryFragmentShader,
      side: THREE.DoubleSide,
    });
  }, [bathymetry.minDepth, bathymetry.maxDepth]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={[bathymetry.width / 2, bathymetry.height / 2, 0]}
      rotation={[0, 0, 0]}
    />
  );
}



