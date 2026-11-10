import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mulberry32 } from '../../lib/math';
import type { Palette } from '../palettes';
import { ribbonFragment, ribbonVertex } from '../shaders';
import { worldSignals } from '../types';

interface Props {
  palette: Palette;
  seed: number;
}

const RIBBON_COUNT = 8;
const SEGMENTS = 80;

export function Ribbons({ palette, seed }: Props) {
  const material = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const rand = mulberry32(seed ^ 0x1b873593);
    const vertexCount = RIBBON_COUNT * (SEGMENTS + 1) * 2;
    const positions = new Float32Array(vertexCount * 3);
    const aProgress = new Float32Array(vertexCount);
    const aSide = new Float32Array(vertexCount);
    const aAngle = new Float32Array(vertexCount);
    const aRadius = new Float32Array(vertexCount);
    const aSeed = new Float32Array(vertexCount);
    const indices: number[] = [];

    let v = 0;
    for (let ribbon = 0; ribbon < RIBBON_COUNT; ribbon++) {
      const baseAngle = (ribbon / RIBBON_COUNT) * Math.PI * 2 + (rand() - 0.5) * 0.34;
      const radius = 2.25 + rand() * 2.45;
      const ribbonSeed = rand();
      const start = v;

      for (let row = 0; row <= SEGMENTS; row++) {
        const p = row / SEGMENTS;
        for (let col = 0; col < 2; col++) {
          aProgress[v] = p;
          aSide[v] = col === 0 ? -1 : 1;
          aAngle[v] = baseAngle;
          aRadius[v] = radius;
          aSeed[v] = ribbonSeed;
          v++;
        }
        if (row < SEGMENTS) {
          const a = start + row * 2;
          indices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aProgress', new THREE.BufferAttribute(aProgress, 1));
    geo.setAttribute('aSide', new THREE.BufferAttribute(aSide, 1));
    geo.setAttribute('aAngle', new THREE.BufferAttribute(aAngle, 1));
    geo.setAttribute('aRadius', new THREE.BufferAttribute(aRadius, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
    geo.setIndex(indices);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 14);
    return geo;
  }, [seed]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBreath: { value: 0 },
      uBreathAmp: { value: 0.5 },
      uPulse: { value: 0 },
      uPresence: { value: 0 },
      uReduced: { value: 0 },
      uColorA: { value: new THREE.Color(palette.field) },
      uColorB: { value: new THREE.Color(palette.core) },
    }),
    [palette],
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
    <mesh geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={ribbonVertex}
        fragmentShader={ribbonFragment}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}
