import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Palette } from '../palettes';
import { organismFragment, organismTipFragment, organismTipVertex, organismVertex } from '../shaders';
import { worldSignals } from '../types';
import { generateOrganism } from '../organism';

interface Props {
  palette: Palette;
  seed: number;
}

export function PresenceOrganism({ palette, seed }: Props) {
  const lines = useRef<THREE.LineSegments>(null);
  const lineMaterial = useRef<THREE.ShaderMaterial>(null);
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
      uAccent: { value: new THREE.Color(palette.field) },
    }),
    [palette],
  );

  useFrame(() => {
    const s = worldSignals;
    const u = lineMaterial.current?.uniforms;
    if (!u) return;
    u.uTime.value = s.t;
    u.uBreath.value = s.breath;
    u.uPresence.value = s.presence;
    u.uGrowth.value = s.growth;
    u.uReduced.value = s.reduced;
  });

  return (
    <group>
      <lineSegments ref={lines} geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          ref={lineMaterial}
          uniforms={uniforms}
          vertexShader={organismVertex}
          fragmentShader={organismFragment}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </lineSegments>
    </group>
  );
}
