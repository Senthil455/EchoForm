import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Palette } from '../palettes';
import { organismFragment, organismVertex } from '../shaders';
import { worldSignals } from '../types';
import { generateOrganism } from '../organism';

interface Props {
  palette: Palette;
  seed: number;
}

export function PresenceOrganism({ palette, seed }: Props) {
  const geometry = useMemo(() => {
    const data = generateOrganism(seed);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    geo.setAttribute('aProgress', new THREE.BufferAttribute(data.progress, 1));
    geo.setAttribute('aTip', new THREE.BufferAttribute(data.tips, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.6, 0), 8);
    return geo;
  }, [seed]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBreath: { value: 0 },
      uPresence: { value: 0 },
      uGrowth: { value: 0.05 },
      uReduced: { value: 0 },
      uColorA: { value: new THREE.Color(palette.field) },
      uColorB: { value: new THREE.Color(palette.accent) },
      uCore: { value: new THREE.Color(palette.coreHot) },
    }),
    [palette],
  );

  useFrame(() => {
    const s = worldSignals;
    uniforms.uTime.value = s.t;
    uniforms.uBreath.value = s.breath;
    uniforms.uPresence.value = s.presence;
    uniforms.uGrowth.value = s.growth;
    uniforms.uReduced.value = s.reduced;
  });

  return (
    <lineSegments geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={organismVertex}
        fragmentShader={organismFragment}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </lineSegments>
  );
}
