import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mulberry32 } from '../../lib/math';
import type { Palette } from '../palettes';
import { breathFieldFragment, breathFieldVertex } from '../shaders';
import { particleCount, worldSignals, type WorldQuality } from '../types';

interface Props {
  palette: Palette;
  quality: WorldQuality;
  seed: number;
}

export function BreathField({ palette, quality, seed }: Props) {
  const count = particleCount(quality);
  const material = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const rand = mulberry32(seed ^ 0x9e3779b9);
    const positions = new Float32Array(count * 3);
    const aSeed = new Float32Array(count);
    const aRadius = new Float32Array(count);
    const aAngle = new Float32Array(count);
    const aHeight = new Float32Array(count);
    const aSize = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const radius = 1.9 + Math.pow(rand(), 0.7) * 4.2;
      const angle = rand() * Math.PI * 2;
      const height = (rand() - 0.5) * 5.2 + Math.sin(angle * 2) * 0.25;
      aSeed[i] = rand();
      aRadius[i] = radius;
      aAngle[i] = angle;
      aHeight[i] = height;
      aSize[i] = 0.4 + rand() * 1.35;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
    geo.setAttribute('aRadius', new THREE.BufferAttribute(aRadius, 1));
    geo.setAttribute('aAngle', new THREE.BufferAttribute(aAngle, 1));
    geo.setAttribute('aHeight', new THREE.BufferAttribute(aHeight, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 14);
    return geo;
  }, [count, seed]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBreath: { value: 0 },
      uBreathAmp: { value: 0.5 },
      uPulse: { value: 0 },
      uPresence: { value: 0 },
      uReduced: { value: 0 },
      uPointScale: { value: quality === 'high' ? 20 : quality === 'medium' ? 17 : 14 },
      uColorA: { value: new THREE.Color(palette.field) },
      uColorB: { value: new THREE.Color(palette.accent) },
      uColorC: { value: new THREE.Color(palette.core) },
    }),
    [palette, quality],
  );

  useFrame(() => {
    const s = worldSignals;
    const u = material.current?.uniforms;
    if (!u) return;
    u.uTime.value = s.t;
    u.uBreath.value = s.breath;
    u.uBreathAmp.value = s.breathAmp;
    u.uPulse.value = s.pulse;
    u.uPresence.value = s.presence;
    u.uReduced.value = s.reduced;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={breathFieldVertex}
        fragmentShader={breathFieldFragment}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
