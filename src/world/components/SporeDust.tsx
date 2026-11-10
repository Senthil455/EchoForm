import { useEffect, useMemo, useRef } from 'react';
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
  const count = quality === 'high' ? 220 : quality === 'medium' ? 150 : 80;
  const material = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const rand = mulberry32(seed ^ 0xcc9e2d51);
    const positions = new Float32Array(count * 3);
    const aSeed = new Float32Array(count);
    const aSize = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const radius = 2.0 + Math.pow(rand(), 0.55) * 4.8;
      const angle = rand() * Math.PI * 2;
      positions[i * 3 + 0] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = -2.2 + rand() * 5.8;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      aSeed[i] = rand();
      aSize[i] = 0.9 + rand() * 2.4;
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
      uPointScale: { value: quality === 'high' ? 26 : quality === 'medium' ? 23 : 20 },
      uColorA: { value: new THREE.Color(palette.field) },
      uColorB: { value: new THREE.Color(palette.core) },
    }),
    [palette, quality],
  );

  useFrame(() => {
    const s = worldSignals;
    const u = material.current?.uniforms;
    if (!u) return;
    u.uTime.value = s.t;
    u.uPresence.value = s.presence;
    u.uReduced.value = s.reduced;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
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
