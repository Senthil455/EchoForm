import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Palette } from '../palettes';
import { skyFragment, skyVertex } from '../shaders';
import { worldSignals } from '../types';

interface Props {
  palette: Palette;
}

export function Sky({ palette }: Props) {
  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color(palette.skyTop) },
      uBottom: { value: new THREE.Color(palette.skyBottom) },
      uAccent: { value: new THREE.Color(palette.accent) },
      uTime: { value: 0 },
      uPresence: { value: 0 },
    }),
    [palette],
  );

  useFrame(() => {
    const s = worldSignals;
    uniforms.uTime.value = s.t;
    uniforms.uPresence.value = s.presence;
  });

  return (
    <mesh frustumCulled={false}>
      <sphereGeometry args={[64, 48, 32]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={skyVertex}
        fragmentShader={skyFragment}
        side={THREE.BackSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
