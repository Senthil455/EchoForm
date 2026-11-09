import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mulberry32 } from '../../lib/math';
import type { Palette } from '../palettes';
import { dustFragment, dustVertex } from '../shaders';
import { worldSignals, type WorldQuality } from '../types';

interface Props {
  palette: Palette;
  seed: number;
  quality: WorldQuality;
}

export function SporeDust({ palette, seed, quality }: Props) {
  const count = quality === 'high' ? 780 : quality === 'medium' ? 520 : 320;

  const geometry = useMemo(() => {
    const rand = mulberry32(seed ^ 0xcc9e2d51);
    const positions = new Float32Array(count * 3);
    const aSeed = new Float32Array(count);
    const aSize = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const radius = 1.2 + Math.pow(rand(), 0.55) * 7.4;
      const angle = rand() * Math.PI * 2;
      positions[i * 3 + 0] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = -2.4 + rand() * 7.2;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      aSeed[i] = rand();
      aSize[i] = 1.2 + rand() * 3.4;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.5, 0), 16);
    return geo;
  }, [count, seed]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPresence: { value: 0 },
      uReduced: { value: 0 },
      uPointScale: { value: quality === 'high' ? 72 : quality === 'medium' ? 64 : 56 },
      uColorA: { value: new THREE.Color(palette.field) },
      uColorB: { value: new THREE.Color(palette.core) },
    }),
    [palette, quality],
  );

  useFrame(() => {
    const s = worldSignals;
    uniforms.uTime.value = s.t;
    uniforms.uPresence.value = s.presence;
    uniforms.uReduced.value = s.reduced;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={dustVertex}
        fragmentShader={dustFragment}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
