import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { BathymetryData } from '../../types';

interface BathymetryMeshProps {
  bathymetry: BathymetryData;
}

// Custom shader for bathymetry coloring with non-homogeneous sediment
const bathymetryVertexShader = `
  varying float vDepth;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPos;

  void main() {
    vDepth = -position.z;
    vNormal = normalMatrix * normal;
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Simple hash for position-based variation (noise-like)
const bathymetryFragmentShader = `
  uniform float minDepth;
  uniform float maxDepth;
  uniform vec3 shallowColor;
  uniform vec3 deepColor;
  uniform vec3 lightDirection;

  varying float vDepth;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPos;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
  }
  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    v += 0.5 * noise2(p);
    v += 0.25 * noise2(p * 2.0);
    v += 0.125 * noise2(p * 4.0);
    return v;
  }

  void main() {
    // Depth-based base coloring
    float t = clamp((vDepth - minDepth) / (maxDepth - minDepth), 0.0, 1.0);
    vec3 baseColor = mix(shallowColor, deepColor, t);

    // Non-homogeneous sediment: patches of sand, mud, rock by world position
    vec2 worldXY = vWorldPos.xy * 0.02;
    float n = fbm(worldXY);
    float n2 = hash(vWorldPos.xy * 0.01 + vDepth * 0.1);
    vec3 sand = vec3(0.55, 0.48, 0.35);
    vec3 mud = vec3(0.25, 0.22, 0.18);
    vec3 rock = vec3(0.35, 0.38, 0.4);
    vec3 patchColor = mix(sand, mud, n);
    patchColor = mix(patchColor, rock, smoothstep(0.5, 0.7, n2));
    baseColor = mix(baseColor, patchColor, 0.5 + 0.3 * (n - 0.5));
    baseColor = mix(baseColor, baseColor * (0.85 + 0.15 * n), 0.6);

    // Simple lighting
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(lightDirection);
    float diffuse = max(dot(normal, lightDir), 0.0);
    float ambient = 0.35;

    // Depth-based darkening (deeper = darker)
    float depthFactor = 1.0 - t * 0.5;

    vec3 finalColor = baseColor * (ambient + diffuse * 0.65) * depthFactor;

    // Slight blue tint for underwater
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



