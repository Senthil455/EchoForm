import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Palette } from '../palettes';
import { skyFragment, skyVertex } from '../shaders';
import { worldSignals } from '../types';

interface Props {
  palette: Palette;
}

export function Sky({ palette }: Props) {
  const material = useRef<THREE.ShaderMaterial>(null);

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
    const u = material.current?.uniforms;
    if (!u) return;
    u.uTime.value = s.t;
    u.uPresence.value = s.presence;
  });

  return (
    <mesh frustumCulled={false}>
      <sphereGeometry args={[64, 48, 32]} />
      <shaderMaterial
        ref={material}
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
