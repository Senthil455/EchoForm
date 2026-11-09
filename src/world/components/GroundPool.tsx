import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Palette } from '../palettes';
import { groundFragment, groundVertex } from '../shaders';
import { worldSignals } from '../types';

interface Props {
  palette: Palette;
}

export function GroundPool({ palette }: Props) {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(palette.ground) },
      uAccent: { value: new THREE.Color(palette.field) },
      uTime: { value: 0 },
      uPulse: { value: 0 },
      uPresence: { value: 0 },
    }),
    [palette],
  );

  useFrame(() => {
    const s = worldSignals;
    uniforms.uTime.value = s.t;
    uniforms.uPulse.value = s.pulse;
    uniforms.uPresence.value = s.presence;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.42, 0]}>
      <planeGeometry args={[48, 48, 1, 1]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={groundVertex}
        fragmentShader={groundFragment}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}
