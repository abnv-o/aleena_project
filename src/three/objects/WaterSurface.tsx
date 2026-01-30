import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface WaterSurfaceProps {
  width: number;
  height: number;
}

const waterVertexShader = `
  uniform float time;
  uniform float waveHeight;
  uniform float waveFrequency;
  
  varying vec2 vUv;
  varying float vWaveHeight;
  varying vec3 vNormal;

  void main() {
    vUv = uv;
    
    // Simple wave animation
    float wave1 = sin(position.x * waveFrequency + time) * waveHeight;
    float wave2 = sin(position.y * waveFrequency * 0.7 + time * 1.3) * waveHeight * 0.5;
    float wave3 = sin((position.x + position.y) * waveFrequency * 0.5 + time * 0.8) * waveHeight * 0.3;
    
    vWaveHeight = wave1 + wave2 + wave3;
    
    vec3 newPosition = position;
    newPosition.z += vWaveHeight;
    
    // Approximate normal calculation
    float dx = cos(position.x * waveFrequency + time) * waveHeight * waveFrequency;
    float dy = cos(position.y * waveFrequency * 0.7 + time * 1.3) * waveHeight * 0.5 * waveFrequency * 0.7;
    vNormal = normalize(vec3(-dx, -dy, 1.0));
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const waterFragmentShader = `
  uniform vec3 waterColor;
  uniform vec3 deepColor;
  uniform float opacity;
  uniform float time;
  
  varying vec2 vUv;
  varying float vWaveHeight;
  varying vec3 vNormal;

  void main() {
    // Base color with slight variation
    vec3 baseColor = mix(deepColor, waterColor, 0.5 + vWaveHeight * 0.5);
    
    // Fresnel-like effect for surface
    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
    vec3 surfaceColor = mix(baseColor, vec3(0.4, 0.6, 0.8), fresnel * 0.3);
    
    // Add some caustic-like patterns
    float caustic = sin(vUv.x * 40.0 + time) * sin(vUv.y * 40.0 + time * 0.7) * 0.1 + 0.1;
    surfaceColor += vec3(caustic * 0.1, caustic * 0.15, caustic * 0.2);
    
    gl_FragColor = vec4(surfaceColor, opacity);
  }
`;

export function WaterSurface({ width, height }: WaterSurfaceProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      waveHeight: { value: 0.5 },
      waveFrequency: { value: 0.02 },
      waterColor: { value: new THREE.Color(0x1a5f7a) },
      deepColor: { value: new THREE.Color(0x0a2a4a) },
      opacity: { value: 0.6 },
    }),
    []
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[width / 2, height / 2, 0]}
      rotation={[0, 0, 0]}
    >
      <planeGeometry args={[width, height, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={waterVertexShader}
        fragmentShader={waterFragmentShader}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}



